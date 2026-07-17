/**
 * «Value Object» MangoRating — maps a MangoScore point total to the game's
 * 1–3 mango star rating.
 *
 * Mirrors the frontend's MangoRating.fromScore (mango_rating.dart) exactly:
 * thresholds are tuned against MangoScore's 100–1000 scale. This is the
 * normalization that lets stars be summed across levels in the global
 * leaderboard even if a per-level scoring strategy is introduced later —
 * two different point scales are never comparable, but 1–3 stars always
 * mean the same thing.
 */
export class MangoRating {
  private constructor(private readonly _stars: 1 | 2 | 3) {}

  static fromPoints(points: number): MangoRating {
    if (points >= 900) return new MangoRating(3);
    if (points >= 600) return new MangoRating(2);
    return new MangoRating(1);
  }

  get stars(): 1 | 2 | 3 {
    return this._stars;
  }
}
