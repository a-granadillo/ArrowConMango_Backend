import {
  ArrowDefinition,
  BoardSize,
  LevelDefinition,
  LevelRules,
} from '../../domain/entities/level-definition.entity';
import { LevelId } from '../../domain/value-objects/level-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { LevelDefinitionOrmEntity } from '../../infrastructure/orm/level.orm-entity';

export class LevelMapper {
  static toDomain(orm: LevelDefinitionOrmEntity): LevelDefinition {
    return LevelDefinition.reconstitute(
      LevelId.create(orm.id),
      orm.name,
      orm.difficulty,
      orm.boardSize as BoardSize,
      orm.arrows as ArrowDefinition[],
      orm.rules as LevelRules,
      orm.version,
      orm.authorId ? UserId.create(orm.authorId) : null,
    );
  }

  static toOrm(level: LevelDefinition): LevelDefinitionOrmEntity {
    const orm = new LevelDefinitionOrmEntity();
    orm.id = level.id.value;
    orm.name = level.name;
    orm.difficulty = level.difficulty;
    orm.boardSize = level.boardSize;
    orm.arrows = level.arrows;
    orm.rules = level.rules as Record<string, unknown>;
    orm.version = level.version;
    orm.authorId = level.authorId?.value ?? null;
    return orm;
  }
}
