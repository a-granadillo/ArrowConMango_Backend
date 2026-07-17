import type { IScoreCalculationStrategy } from '../services/score-calculation.strategy';

/**
 * «Value Object» Score — raw moves count and elapsed time for one run.
 *
 * Score itself has no notion of "how good" a run is — that's a policy
 * decision, and policies are swappable (Strategy pattern). See
 * IScoreCalculationStrategy: any comparison or scalar value must go through
 * a strategy the caller supplies, so two different strategies never
 * disagree silently by both being baked into this VO at once.
 *
 * Immutable: once created, a Score never changes.
 */
export class Score {
  private constructor(
    private readonly _moves: number,
    private readonly _timeMs: number,
  ) {}

  static create(moves: number, timeMs: number): Score {
    if (moves < 0) throw new Error('Moves cannot be negative');
    if (timeMs < 0) throw new Error('Time cannot be negative');
    return new Score(moves, timeMs);
  }

  get moves(): number {
    return this._moves;
  }

  get timeMs(): number {
    return this._timeMs;
  }

  isBetterThan(other: Score, strategy: IScoreCalculationStrategy): boolean {
    return strategy.compute(this) > strategy.compute(other);
  }

  equals(other: Score): boolean {
    return this._moves === other._moves && this._timeMs === other._timeMs;
  }
}
