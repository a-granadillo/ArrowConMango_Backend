import { LevelDefinition } from '../../domain/entities/level-definition.entity';
import { ILevelRepository } from '../../domain/ports/level.repository';
import { LevelId } from '../../domain/value-objects/level-id.vo';
import { LevelOutput, UpsertLevelInput } from '../dtos/level.dto';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» UpsertLevelUseCase
 *
 * Creates or replaces a level definition. Calls LevelDefinition.validate()
 * before persisting to ensure graph integrity (no broken edges, has exit + arrows).
 * This allows administrators to publish new levels without recompiling the app.
 */
export class UpsertLevelUseCase implements UseCase<UpsertLevelInput, LevelOutput> {
  constructor(private readonly levelRepo: ILevelRepository) {}

  async execute(input: UpsertLevelInput): Promise<LevelOutput> {
    const levelId = input.id ? LevelId.create(input.id) : LevelId.create();

    const level = LevelDefinition.create(
      input.nodes,
      input.edges,
      input.rules,
      levelId,
      input.version ?? 1,
    );

    level.validate();

    await this.levelRepo.upsert(level);

    return {
      id: level.id.value,
      nodes: level.nodes,
      edges: level.edges,
      rules: level.rules,
      version: level.version,
    };
  }
}
