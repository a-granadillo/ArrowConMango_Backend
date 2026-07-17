import { GlobalLeaderboard } from '../../domain/entities/global-leaderboard.entity';
import { IProgressRepository } from '../../domain/ports/progress.repository';
import { IUserRepository } from '../../domain/ports/user.repository';
import { IScoreCalculationStrategy } from '../../domain/services/score-calculation.strategy';
import { PlayerStanding } from '../../domain/value-objects/player-standing.vo';
import {
  GetGlobalLeaderboardInput,
  PlayerStandingOutput,
} from '../dtos/leaderboard.dto';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» GetGlobalLeaderboardUseCase
 *
 * Ranks every player by total mangos (Σ stars across their best runs).
 * Reads player_progress — one row per user, already carrying `best` and
 * `completed` — rather than score_entries (which grows per run). SQLite
 * can't aggregate `best` (a `simple-json` blob) without re-encoding the
 * ranking rule in SQL, so aggregation happens here, in the domain.
 */
export class GetGlobalLeaderboardUseCase implements UseCase<
  GetGlobalLeaderboardInput,
  PlayerStandingOutput[]
> {
  constructor(
    private readonly progressRepo: IProgressRepository,
    private readonly userRepo: IUserRepository,
    private readonly scoring: IScoreCalculationStrategy,
  ) {}

  async execute(
    input: GetGlobalLeaderboardInput,
  ): Promise<PlayerStandingOutput[]> {
    const allProgress = await this.progressRepo.all();
    const userIds = allProgress.map((p) => p.userId);
    const users = await this.userRepo.byIds(userIds);
    const usersById = new Map(users.map((u) => [u.id.value, u]));

    const standings = allProgress
      .filter((progress) => usersById.has(progress.userId.value))
      .map((progress) =>
        PlayerStanding.create(
          progress.userId.value,
          usersById.get(progress.userId.value)!.username,
          progress.mangos(this.scoring),
          progress.completedCount(),
        ),
      );

    const top = GlobalLeaderboard.from(standings).top(input.top ?? 20);

    return top.map((standing, index) => ({
      rank: index + 1,
      userId: standing.userId,
      displayName: standing.displayName,
      mangos: standing.mangos,
      levelsCompleted: standing.levelsCompleted,
      isMe: standing.userId === input.currentUserId,
    }));
  }
}
