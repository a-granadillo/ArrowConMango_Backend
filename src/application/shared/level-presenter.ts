import { LevelDefinition } from '../../domain/entities/level-definition.entity';
import { LevelOutput } from '../dtos/level.dto';

/** Shared LevelDefinition → LevelOutput mapping, used by every level use-case. */
export function toLevelOutput(level: LevelDefinition): LevelOutput {
  return {
    id: level.id.value,
    name: level.name,
    difficulty: level.difficulty,
    boardSize: level.boardSize,
    arrows: level.arrows,
    rules: level.rules,
    version: level.version,
    authorId: level.authorId?.value ?? null,
    isPublished: level.isPublished,
    publishedAt: level.publishedAt?.toISOString() ?? null,
  };
}
