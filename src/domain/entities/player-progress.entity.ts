import { LevelId } from '../value-objects/level-id.vo';
import { Score } from '../value-objects/score.vo';
import { UserId } from '../value-objects/user-id.vo';

/**
 * «Aggregate Root» PlayerProgress — tracks which levels a player has cleared
 * and the best score achieved per level.
 *
 * merge(other) is idempotent: re-syncing the same data from the client never
 * duplicates records. This satisfies RF-B-02 (sync progress) and the Guía §9
 * requirement for an idempotent merge strategy.
 */
export class PlayerProgress {
  private constructor(
    private readonly _userId: UserId,
    private _completed: Set<string>,
    private _best: Map<string, Score>,
    private _currentLevel: number,
  ) {}

  static create(userId: UserId): PlayerProgress {
    return new PlayerProgress(userId, new Set(), new Map(), 0);
  }

  static reconstitute(
    userId: UserId,
    completed: string[],
    best: Record<string, { moves: number; timeMs: number }>,
    currentLevel = 0,
  ): PlayerProgress {
    const bestMap = new Map<string, Score>(
      Object.entries(best).map(([k, v]) => [
        k,
        Score.create(v.moves, v.timeMs),
      ]),
    );
    return new PlayerProgress(
      userId,
      new Set(completed),
      bestMap,
      currentLevel,
    );
  }

  /**
   * Merges another progress snapshot into this one (client → server sync).
   * Rules:
   *  - completed is a union (a level once cleared stays cleared).
   *  - best keeps the higher Score per level.
   *  - currentLevel keeps the higher value (never regresses).
   */
  merge(other: PlayerProgress): void {
    for (const levelId of other._completed) {
      this._completed.add(levelId);
    }
    for (const [levelId, score] of other._best) {
      const existing = this._best.get(levelId);
      if (!existing || score.isBetterThan(existing)) {
        this._best.set(levelId, score);
      }
    }
    this._currentLevel = Math.max(this._currentLevel, other._currentLevel);
  }

  markCompleted(levelId: LevelId, score: Score): void {
    this._completed.add(levelId.value);
    const existing = this._best.get(levelId.value);
    if (!existing || score.isBetterThan(existing)) {
      this._best.set(levelId.value, score);
    }
  }

  isCompleted(levelId: LevelId): boolean {
    return this._completed.has(levelId.value);
  }

  bestFor(levelId: LevelId): Score | undefined {
    return this._best.get(levelId.value);
  }

  get userId(): UserId {
    return this._userId;
  }

  get completed(): Set<string> {
    return new Set(this._completed);
  }

  get best(): Map<string, Score> {
    return new Map(this._best);
  }

  get currentLevel(): number {
    return this._currentLevel;
  }
}
