import { PlayerStanding } from '../value-objects/player-standing.vo';

/**
 * «Read-model aggregate» GlobalLeaderboard — the overall player ranking by
 * total mangos, across all levels.
 *
 * Unlike Leaderboard (a real persisted aggregate for a single level's score
 * entries), this is built fresh in memory from PlayerStanding snapshots on
 * every request — there is no "global_leaderboard" table. It exists as its
 * own type (rather than a bare array + sort in the use-case) so the ranking
 * rule has exactly one home, mirroring how Leaderboard.top() owns per-level
 * ranking.
 */
export class GlobalLeaderboard {
  private constructor(private readonly _standings: PlayerStanding[]) {}

  static from(standings: PlayerStanding[]): GlobalLeaderboard {
    return new GlobalLeaderboard([...standings]);
  }

  top(n = 20): PlayerStanding[] {
    return [...this._standings].sort((a, b) => b.mangos - a.mangos).slice(0, n);
  }
}
