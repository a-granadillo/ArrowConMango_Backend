import { Leaderboard } from '../../domain/entities/leaderboard.entity';
import { ILeaderboardRepository } from '../../domain/ports/leaderboard.repository';
import { IUserRepository } from '../../domain/ports/user.repository';
import { rankWithSelf } from '../../domain/services/ranking.service';
import { IScoreCalculationStrategy } from '../../domain/services/score-calculation.strategy';
import { LevelId } from '../../domain/value-objects/level-id.vo';
import {
  LevelLeaderboardOutput,
  RankedScoreEntryOutput,
} from '../dtos/leaderboard.dto';
import { UseCase } from '../shared/use-case';

interface GetLeaderboardInput {
  levelId: string;
  top?: number;
  /** The requesting user's id, if authenticated — used to flag `isMe` and locate `me`. */
  currentUserId?: string;
}

/**
 * «Use Case» GetLeaderboardUseCase
 *
 * Returns the top N scores for a given level (default 10), ranked by the
 * injected scoring strategy via the Leaderboard aggregate — ranking is a
 * domain decision, not a database query concern. Also resolves the
 * requesting player's own rank even when they fall outside the top N
 * (rankWithSelf ranks the full, uncut order — see Leaderboard.ranked()).
 */
export class GetLeaderboardUseCase implements UseCase<
  GetLeaderboardInput,
  LevelLeaderboardOutput
> {
  constructor(
    private readonly leaderboardRepo: ILeaderboardRepository,
    private readonly userRepo: IUserRepository,
    private readonly scoring: IScoreCalculationStrategy,
  ) {}

  async execute(input: GetLeaderboardInput): Promise<LevelLeaderboardOutput> {
    const levelId = LevelId.create(input.levelId);
    const entries = await this.leaderboardRepo.byLevel(levelId);
    const ordered = Leaderboard.reconstitute(levelId, entries).ranked(
      this.scoring,
    );

    const users = await this.userRepo.byIds(ordered.map((e) => e.userId));
    const namesById = new Map(users.map((u) => [u.id.value, u.username]));

    const { top, me } = rankWithSelf(
      ordered,
      input.top ?? 10,
      (entry) => entry.userId.value === input.currentUserId,
    );

    const toOutput = (
      rank: number,
      entry: (typeof ordered)[number],
    ): RankedScoreEntryOutput => ({
      rank,
      userId: entry.userId.value,
      displayName: namesById.get(entry.userId.value) ?? 'Jugador',
      levelId: entry.levelId.value,
      moves: entry.score.moves,
      timeMs: entry.score.timeMs,
      value: this.scoring.compute(entry.score),
      at: entry.at.toISOString(),
      isMe: entry.userId.value === input.currentUserId,
    });

    return {
      top: top.map((r) => toOutput(r.rank, r.entry)),
      me: me ? toOutput(me.rank, me.entry) : null,
    };
  }
}
