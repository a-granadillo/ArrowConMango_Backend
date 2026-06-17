import { LevelId } from '../value-objects/level-id.vo';
import { Score } from '../value-objects/score.vo';
import { UserId } from '../value-objects/user-id.vo';

/**
 * «Entity» ScoreEntry — a single leaderboard record.
 *
 * Belongs to the Leaderboard aggregate. Immutable once created.
 */
export class ScoreEntry {
  private constructor(
    private readonly _userId: UserId,
    private readonly _levelId: LevelId,
    private readonly _score: Score,
    private readonly _at: Date,
  ) {}

  static create(userId: UserId, levelId: LevelId, score: Score): ScoreEntry {
    return new ScoreEntry(userId, levelId, score, new Date());
  }

  /** Rehidrata desde persistencia preservando el timestamp original. */
  static reconstitute(userId: UserId, levelId: LevelId, score: Score, at: Date): ScoreEntry {
    return new ScoreEntry(userId, levelId, score, at);
  }

  get userId(): UserId {
    return this._userId;
  }

  get levelId(): LevelId {
    return this._levelId;
  }

  get score(): Score {
    return this._score;
  }

  get at(): Date {
    return this._at;
  }
}
