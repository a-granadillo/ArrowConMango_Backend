import { ILeaderboardRepository } from '../../domain/ports/leaderboard.repository';
import { IUserRepository } from '../../domain/ports/user.repository';
import { rankWithSelf } from '../../domain/services/ranking.service';
import { IScoreCalculationStrategy } from '../../domain/services/score-calculation.strategy';
import { MangoRating } from '../../domain/value-objects/mango-rating.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import {
  GetSurvivalLeaderboardInput,
  SurvivalLeaderboardOutput,
} from '../dtos/leaderboard.dto';
import { UseCase } from '../shared/use-case';

interface Aggregate {
  userId: string;
  mangos: number;
  runs: number;
}

/**
 * «Use Case» GetSurvivalLeaderboardUseCase
 *
 * Ranks players by total mango stars accumulated across every survival run
 * they've submitted (not just their best — survival rewards playing more,
 * unlike campaign's per-level best). Reads score_entries directly via
 * bySurvival() rather than PlayerProgress, since survival runs are
 * deliberately excluded from PlayerProgress.best (see SubmitScoreUseCase).
 */
export class GetSurvivalLeaderboardUseCase implements UseCase<
  GetSurvivalLeaderboardInput,
  SurvivalLeaderboardOutput
> {
  constructor(
    private readonly leaderboardRepo: ILeaderboardRepository,
    private readonly userRepo: IUserRepository,
    private readonly scoring: IScoreCalculationStrategy,
  ) {}

  async execute(
    input: GetSurvivalLeaderboardInput,
  ): Promise<SurvivalLeaderboardOutput> {
    const entries = await this.leaderboardRepo.bySurvival();

    const byUser = new Map<string, Aggregate>();
    for (const entry of entries) {
      const userId = entry.userId.value;
      const stars = MangoRating.fromPoints(
        this.scoring.compute(entry.score),
      ).stars;
      const existing = byUser.get(userId);
      if (existing) {
        existing.mangos += stars;
        existing.runs += 1;
      } else {
        byUser.set(userId, { userId, mangos: stars, runs: 1 });
      }
    }

    const ordered = [...byUser.values()].sort((a, b) => b.mangos - a.mangos);

    const users = await this.userRepo.byIds(
      ordered.map((a) => UserId.create(a.userId)),
    );
    const namesById = new Map(users.map((u) => [u.id.value, u.username]));

    const { top, me } = rankWithSelf(
      ordered,
      input.top ?? 10,
      (a) => a.userId === input.currentUserId,
    );

    const toOutput = (rank: number, a: Aggregate) => ({
      rank,
      userId: a.userId,
      displayName: namesById.get(a.userId) ?? 'Jugador',
      mangos: a.mangos,
      runs: a.runs,
      isMe: a.userId === input.currentUserId,
    });

    return {
      top: top.map((r) => toOutput(r.rank, r.entry)),
      me: me ? toOutput(me.rank, me.entry) : null,
    };
  }
}
