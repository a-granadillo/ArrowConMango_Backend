import { Score } from '../value-objects/score.vo';

/**
 * «Strategy» IScoreCalculationStrategy
 *
 * Defines the algorithm interface for computing a numeric score from a Score VO.
 * Concrete strategies are swappable at runtime without modifying consumers (OCP).
 * Clients (use-cases) depend on this abstraction, never on a concrete formula (DIP).
 */
export interface IScoreCalculationStrategy {
  compute(score: Score): number;
}

/**
 * MovesBasedScore — penalises the number of moves made.
 * Fewer moves → higher score.
 */
export class MovesBasedScore implements IScoreCalculationStrategy {
  private static readonly BASE = 10_000;
  private static readonly MOVE_PENALTY = 50;

  compute(score: Score): number {
    const result =
      MovesBasedScore.BASE - score.moves * MovesBasedScore.MOVE_PENALTY;
    return Math.max(0, result);
  }
}

/**
 * TimeBasedScore — penalises elapsed time.
 * Faster completion → higher score.
 */
export class TimeBasedScore implements IScoreCalculationStrategy {
  private static readonly BASE = 10_000;
  private static readonly MS_PENALTY = 0.5;

  compute(score: Score): number {
    const result =
      TimeBasedScore.BASE - score.timeMs * TimeBasedScore.MS_PENALTY;
    return Math.max(0, result);
  }
}

/**
 * MixedScore — balances moves and time (default strategy).
 */
export class MixedScore implements IScoreCalculationStrategy {
  private static readonly BASE = 10_000;
  private static readonly MOVE_PENALTY = 25;
  private static readonly MS_PENALTY = 0.1;

  compute(score: Score): number {
    const result =
      MixedScore.BASE -
      score.moves * MixedScore.MOVE_PENALTY -
      score.timeMs * MixedScore.MS_PENALTY;
    return Math.max(0, result);
  }
}
