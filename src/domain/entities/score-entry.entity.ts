import { GameMode } from '../value-objects/game-mode.vo';
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
    private readonly _mode: GameMode,
  ) {}

  static create(
    userId: UserId,
    levelId: LevelId,
    score: Score,
    mode: GameMode,
  ): ScoreEntry {
    return new ScoreEntry(userId, levelId, score, new Date(), mode);
  }

  /** Rehidrata desde persistencia preservando el timestamp original. */
  static reconstitute(
    userId: UserId,
    levelId: LevelId,
    score: Score,
    at: Date,
    mode: GameMode,
  ): ScoreEntry {
    return new ScoreEntry(userId, levelId, score, at, mode);
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

  get mode(): GameMode {
    return this._mode;
  }
}
