import {
  LevelDefinition,
  NodeDefinition,
  LevelRules,
} from '../../domain/entities/level-definition.entity';
import { LevelId } from '../../domain/value-objects/level-id.vo';
import { LevelDefinitionOrmEntity } from '../../infrastructure/orm/level.orm-entity';

export class LevelMapper {
  static toDomain(orm: LevelDefinitionOrmEntity): LevelDefinition {
    return LevelDefinition.reconstitute(
      LevelId.create(orm.id),
      orm.nodes as NodeDefinition[],
      orm.edges,
      orm.rules as LevelRules,
      orm.version,
    );
  }

  static toOrm(level: LevelDefinition): LevelDefinitionOrmEntity {
    const orm = new LevelDefinitionOrmEntity();
    orm.id = level.id.value;
    orm.nodes = level.nodes;
    orm.edges = level.edges;
    orm.rules = level.rules as Record<string, unknown>;
    orm.version = level.version;
    return orm;
  }
}
