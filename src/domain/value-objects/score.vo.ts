/**
 * «Value Object» Score — derived from moves count and elapsed time.
 *
 * value() computes a numeric score: fewer moves and less time yields a higher
 * score. The formula is intentionally simple and can be swapped via
 * IScoreCalculationStrategy in the domain service layer (OCP + Strategy).
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

  /**
   * Default scoring: penalise moves (×10) and time (×0.1 ms).
   * A perfect play with 0 moves/time gives MAX_SAFE_INTEGER-ish value.
   * The Strategy pattern (IScoreCalculationStrategy) can override this.
   */
  value(): number {
    const BASE = 10_000;
    const movePenalty = this._moves * 10;
    const timePenalty = Math.floor(this._timeMs * 0.1);
    return Math.max(0, BASE - movePenalty - timePenalty);
  }

  isBetterThan(other: Score): boolean {
    return this.value() > other.value();
  }

  equals(other: Score): boolean {
    return this._moves === other._moves && this._timeMs === other._timeMs;
  }
}
