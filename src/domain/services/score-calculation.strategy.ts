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
 * MixedScore — balances moves and time.
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

/**
 * MangoScore — the game's actual scoring formula (default strategy).
 *
 * Mirrors the frontend's MoveBasedScoring exactly (movePenalty = 0 there —
 * the game scores by elapsed time only): basePoints=1000, 10 points
 * deducted per whole second, floor at 100. Time arrives in milliseconds on
 * this side (Score.timeMs), so it's converted to whole seconds first.
 *
 * This strategy exists so the backend can compute mango star ratings
 * (see MangoRating) that agree with what the player actually sees on
 * their own device — any other strategy here would make the leaderboard
 * and the victory screen disagree about the same run.
 */
export class MangoScore implements IScoreCalculationStrategy {
  private static readonly BASE = 1_000;
  private static readonly SECOND_PENALTY = 10;
  private static readonly MIN_POINTS = 100;

  compute(score: Score): number {
    const seconds = Math.floor(score.timeMs / 1000);
    const result = MangoScore.BASE - seconds * MangoScore.SECOND_PENALTY;
    return Math.max(MangoScore.MIN_POINTS, result);
  }
}
