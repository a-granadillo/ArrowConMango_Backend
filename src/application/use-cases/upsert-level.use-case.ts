import { LevelDefinition } from '../../domain/entities/level-definition.entity';
import { ILevelRepository } from '../../domain/ports/level.repository';
import { LevelId } from '../../domain/value-objects/level-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { LevelOutput, UpsertLevelInput } from '../dtos/level.dto';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» UpsertLevelUseCase
 *
 * Creates or replaces a level definition. Calls LevelDefinition.validate()
 * before persisting to ensure the board is well-formed (arrows in bounds,
 * unique ids, no zero-length segments). This allows administrators — and,
 * eventually, level authors — to publish levels without recompiling the app.
 */
export class UpsertLevelUseCase implements UseCase<
  UpsertLevelInput,
  LevelOutput
> {
  constructor(private readonly levelRepo: ILevelRepository) {}

  async execute(input: UpsertLevelInput): Promise<LevelOutput> {
    const levelId = input.id ? LevelId.create(input.id) : LevelId.create();

    const level = LevelDefinition.create(
      input.name,
      input.difficulty,
      input.boardSize,
      input.arrows,
      input.rules,
      levelId,
      input.version ?? 1,
      input.authorId ? UserId.create(input.authorId) : null,
    );

    level.validate();

    await this.levelRepo.upsert(level);

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
      publishedAt: level.publishedAt,
    };
  }
}
