import { ScoreEntry } from '../entities/score-entry.entity';
import { LevelId } from '../value-objects/level-id.vo';

/**
 * «Port (interface)» ILeaderboardRepository
 */
export interface ILeaderboardRepository {
  /** All entries for a level, unordered — ranking is a domain concern (see Leaderboard.top). */
  byLevel(levelId: LevelId): Promise<ScoreEntry[]>;
  add(entry: ScoreEntry): Promise<void>;
}
