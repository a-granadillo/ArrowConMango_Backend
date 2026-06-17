import { ILeaderboardRepository } from '../../domain/ports/leaderboard.repository';
import { LevelId } from '../../domain/value-objects/level-id.vo';
import { ScoreEntryOutput } from '../dtos/leaderboard.dto';
import { UseCase } from '../shared/use-case';

interface GetLeaderboardInput {
  levelId: string;
  top?: number;
}

/**
 * «Use Case» GetLeaderboardUseCase
 *
 * Returns the top N scores for a given level (default 10).
 * In the NestJS layer this use-case will be wrapped by CacheInterceptor
 * (AOP pattern) to avoid hitting the database on every request.
 */
export class GetLeaderboardUseCase implements UseCase<GetLeaderboardInput, ScoreEntryOutput[]> {
  constructor(private readonly leaderboardRepo: ILeaderboardRepository) {}

  async execute(input: GetLeaderboardInput): Promise<ScoreEntryOutput[]> {
    const levelId = LevelId.create(input.levelId);
    const entries = await this.leaderboardRepo.top(levelId, input.top ?? 10);

    return entries.map((e) => ({
      userId: e.userId.value,
      levelId: e.levelId.value,
      moves: e.score.moves,
      timeMs: e.score.timeMs,
      value: e.score.value(),
      at: e.at.toISOString(),
    }));
  }
}
