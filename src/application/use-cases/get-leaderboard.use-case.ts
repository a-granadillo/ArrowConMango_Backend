import { Leaderboard } from '../../domain/entities/leaderboard.entity';
import { ILeaderboardRepository } from '../../domain/ports/leaderboard.repository';
import { IScoreCalculationStrategy } from '../../domain/services/score-calculation.strategy';
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
 * Returns the top N scores for a given level (default 10), ranked by the
 * injected scoring strategy via the Leaderboard aggregate — ranking is a
 * domain decision, not a database query concern.
 * In the NestJS layer this use-case will be wrapped by CacheInterceptor
 * (AOP pattern) to avoid hitting the database on every request.
 */
export class GetLeaderboardUseCase implements UseCase<
  GetLeaderboardInput,
  ScoreEntryOutput[]
> {
  constructor(
    private readonly leaderboardRepo: ILeaderboardRepository,
    private readonly scoring: IScoreCalculationStrategy,
  ) {}

  async execute(input: GetLeaderboardInput): Promise<ScoreEntryOutput[]> {
    const levelId = LevelId.create(input.levelId);
    const entries = await this.leaderboardRepo.byLevel(levelId);
    const top = Leaderboard.reconstitute(levelId, entries).top(
      this.scoring,
      input.top ?? 10,
    );

    return top.map((e) => ({
      userId: e.userId.value,
      levelId: e.levelId.value,
      moves: e.score.moves,
      timeMs: e.score.timeMs,
      value: this.scoring.compute(e.score),
      at: e.at.toISOString(),
    }));
  }
}
