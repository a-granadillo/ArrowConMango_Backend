import { ScoreEntry } from '../entities/score-entry.entity';
import { LevelId } from '../value-objects/level-id.vo';

/**
 * «Port (interface)» ILeaderboardRepository
 */
export interface ILeaderboardRepository {
  top(levelId: LevelId, n?: number): Promise<ScoreEntry[]>;
  add(entry: ScoreEntry): Promise<void>;
}
