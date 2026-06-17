import { LevelId } from '../value-objects/level-id.vo';
import { ScoreEntry } from './score-entry.entity';

/**
 * «Aggregate Root» Leaderboard — ranked list of score entries for a level.
 *
 * submit(entry) appends a new entry (duplicates allowed — one player may submit
 * multiple runs; the client picks the top score via top(n)).
 * top(n) returns the n best entries sorted by Score.value() descending (LSP:
 * sorting uses the Score VO's polymorphic value() method).
 */
export class Leaderboard {
  private constructor(
    private readonly _levelId: LevelId,
    private readonly _entries: ScoreEntry[],
  ) {}

  static create(levelId: LevelId): Leaderboard {
    return new Leaderboard(levelId, []);
  }

  static reconstitute(levelId: LevelId, entries: ScoreEntry[]): Leaderboard {
    return new Leaderboard(levelId, [...entries]);
  }

  submit(entry: ScoreEntry): void {
    this._entries.push(entry);
  }

  top(n = 10): ScoreEntry[] {
    return [...this._entries]
      .sort((a, b) => b.score.value() - a.score.value())
      .slice(0, n);
  }

  get levelId(): LevelId {
    return this._levelId;
  }

  get entries(): ScoreEntry[] {
    return [...this._entries];
  }
}
