import { ScoreEntry } from '../entities/score-entry.entity';
import { LevelId } from '../value-objects/level-id.vo';

/**
 * «Port (interface)» ILeaderboardRepository
 */
export interface ILeaderboardRepository {
  /**
   * Campaign entries for a level, unordered — ranking is a domain concern
   * (see Leaderboard.top). Survival runs are excluded even if they share a
   * levelId, so they never leak into a campaign level's leaderboard.
   */
  byLevel(levelId: LevelId): Promise<ScoreEntry[]>;
  /** All survival entries across every player, unordered. */
  bySurvival(): Promise<ScoreEntry[]>;
  add(entry: ScoreEntry): Promise<void>;
}
