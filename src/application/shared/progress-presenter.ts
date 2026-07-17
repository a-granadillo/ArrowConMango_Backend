import { PlayerProgress } from '../../domain/entities/player-progress.entity';
import { IScoreCalculationStrategy } from '../../domain/services/score-calculation.strategy';
import { ProgressOutput } from '../dtos/progress.dto';

/**
 * Shared PlayerProgress -> ProgressOutput mapping, used by both
 * GetProgressUseCase and SyncProgressUseCase so the `value` computation
 * (which needs the injected strategy) lives in exactly one place.
 */
export class ProgressPresenter {
  static toOutput(
    progress: PlayerProgress,
    strategy: IScoreCalculationStrategy,
  ): ProgressOutput {
    const best: Record<
      string,
      { moves: number; timeMs: number; value: number }
    > = {};
    for (const [levelId, score] of progress.best) {
      best[levelId] = {
        moves: score.moves,
        timeMs: score.timeMs,
        value: strategy.compute(score),
      };
    }
    return {
      userId: progress.userId.value,
      completed: Array.from(progress.completed),
      best,
      currentLevel: progress.currentLevel,
    };
  }
}
