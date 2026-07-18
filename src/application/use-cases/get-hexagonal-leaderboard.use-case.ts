import { ILeaderboardRepository } from '../../domain/ports/leaderboard.repository';
import { IScoreCalculationStrategy } from '../../domain/services/score-calculation.strategy';
import { ScoreEntryOutput } from '../dtos/leaderboard.dto';
import { UseCase } from '../shared/use-case';

interface GetHexagonalLeaderboardInput {
  top?: number;
}

/**
 * «Use Case» GetHexagonalLeaderboardUseCase
 *
 * Returns the top N hexagonal-mode runs across every player, ranked by the
 * injected scoring strategy. Mirrors how a survival leaderboard would read
 * (a single global ranking, not scoped to one levelId) since hexagonal
 * levels are generated/endless like survival, not a fixed campaign catalogue.
 */
export class GetHexagonalLeaderboardUseCase implements UseCase<
  GetHexagonalLeaderboardInput,
  ScoreEntryOutput[]
> {
  constructor(
    private readonly leaderboardRepo: ILeaderboardRepository,
    private readonly scoring: IScoreCalculationStrategy,
  ) {}

  async execute(
    input: GetHexagonalLeaderboardInput,
  ): Promise<ScoreEntryOutput[]> {
    const entries = await this.leaderboardRepo.byHexagonal();
    const top = entries
      .map((e) => ({ entry: e, value: this.scoring.compute(e.score) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, input.top ?? 20);

    return top.map(({ entry: e, value }) => ({
      userId: e.userId.value,
      levelId: e.levelId.value,
      moves: e.score.moves,
      timeMs: e.score.timeMs,
      value,
      at: e.at.toISOString(),
    }));
  }
}
