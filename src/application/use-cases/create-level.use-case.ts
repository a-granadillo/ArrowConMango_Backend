import { LevelDefinition } from '../../domain/entities/level-definition.entity';
import { ILevelRepository } from '../../domain/ports/level.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { CreateLevelInput, LevelOutput } from '../dtos/level.dto';
import { toLevelOutput } from '../shared/level-presenter';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» CreateLevelUseCase
 *
 * Creates a new community-level draft, always authored by the caller and
 * always unpublished. Distinct from UpsertLevelUseCase (PUT /levels/:id,
 * which edits an existing draft the caller already owns): this always
 * mints a fresh id, so there is nothing to authorize against yet.
 */
export class CreateLevelUseCase implements UseCase<
  CreateLevelInput,
  LevelOutput
> {
  constructor(private readonly levelRepo: ILevelRepository) {}

  async execute(input: CreateLevelInput): Promise<LevelOutput> {
    const level = LevelDefinition.create(
      input.name,
      input.difficulty,
      input.boardSize,
      input.arrows,
      input.rules,
      undefined,
      1,
      UserId.create(input.authorId),
    );

    level.validate();

    await this.levelRepo.upsert(level);

    return toLevelOutput(level);
  }
}
