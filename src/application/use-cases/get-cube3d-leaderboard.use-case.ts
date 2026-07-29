import { ILeaderboardRepository } from '../../domain/ports/leaderboard.repository';
import { IScoreCalculationStrategy } from '../../domain/services/score-calculation.strategy';
import { ScoreEntryOutput } from '../dtos/leaderboard.dto';
import { UseCase } from '../shared/use-case';

interface GetCube3DLeaderboardInput {
  top?: number;
}

/**
 * «Use Case» GetCube3DLeaderboardUseCase
 *
 * Returns the top N cube3d-mode runs across every player, ranked by the
 * injected scoring strategy. Mirrors GetHexagonalLeaderboardUseCase: a
 * single global ranking, not scoped to one levelId, since cube3d boards are
 * procedurally generated per-run and share no stable levelId across players.
 */
export class GetCube3DLeaderboardUseCase implements UseCase<
  GetCube3DLeaderboardInput,
  ScoreEntryOutput[]
> {
  constructor(
    private readonly leaderboardRepo: ILeaderboardRepository,
    private readonly scoring: IScoreCalculationStrategy,
  ) {}

  async execute(input: GetCube3DLeaderboardInput): Promise<ScoreEntryOutput[]> {
    const entries = await this.leaderboardRepo.byCube3d();
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
