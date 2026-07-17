import { IScoreCalculationStrategy } from '../services/score-calculation.strategy';
import { LevelId } from '../value-objects/level-id.vo';
import { ScoreEntry } from './score-entry.entity';

/**
 * «Aggregate Root» Leaderboard — ranked list of score entries for a level.
 *
 * submit(entry) appends a new entry (duplicates allowed — one player may submit
 * multiple runs; the client picks the top score via top(n)).
 * top(strategy, n) returns the n best entries sorted by strategy.compute()
 * descending, deduplicated to one (best) entry per user — otherwise repeated
 * submissions from the same player could fill the whole top N.
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

  top(strategy: IScoreCalculationStrategy, n = 10): ScoreEntry[] {
    const bestPerUser = new Map<string, ScoreEntry>();
    for (const entry of this._entries) {
      const existing = bestPerUser.get(entry.userId.value);
      if (!existing || entry.score.isBetterThan(existing.score, strategy)) {
        bestPerUser.set(entry.userId.value, entry);
      }
    }

    return [...bestPerUser.values()]
      .sort((a, b) => strategy.compute(b.score) - strategy.compute(a.score))
      .slice(0, n);
  }

  get levelId(): LevelId {
    return this._levelId;
  }

  get entries(): ScoreEntry[] {
    return [...this._entries];
  }
}
