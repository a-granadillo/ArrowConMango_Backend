import { LevelDefinition } from '../entities/level-definition.entity';
import { LevelId } from '../value-objects/level-id.vo';
import { UserId } from '../value-objects/user-id.vo';

/**
 * «Port (interface)» ILevelRepository
 */
export interface ILevelRepository {
  getAll(): Promise<LevelDefinition[]>;
  getById(id: LevelId): Promise<LevelDefinition | null>;
  upsert(level: LevelDefinition): Promise<void>;
  /** Every level (draft or published) authored by [userId]. */
  byAuthor(userId: UserId): Promise<LevelDefinition[]>;
  /** Published community levels, most recently published first. */
  published(top?: number): Promise<LevelDefinition[]>;
}
