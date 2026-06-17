import { LevelDefinition } from '../entities/level-definition.entity';
import { LevelId } from '../value-objects/level-id.vo';

/**
 * «Port (interface)» ILevelRepository
 */
export interface ILevelRepository {
  getAll(): Promise<LevelDefinition[]>;
  getById(id: LevelId): Promise<LevelDefinition | null>;
  upsert(level: LevelDefinition): Promise<void>;
}
