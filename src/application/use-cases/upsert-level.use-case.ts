import { LevelDefinition } from '../../domain/entities/level-definition.entity';
import { NotLevelAuthorError } from '../../domain/errors/domain-error';
import { ILevelRepository } from '../../domain/ports/level.repository';
import { LevelId } from '../../domain/value-objects/level-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { toLevelOutput } from '../shared/level-presenter';
import { LevelOutput, UpsertLevelInput } from '../dtos/level.dto';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» UpsertLevelUseCase
 *
 * Edits an existing level draft, or provisions one at a specific id if none
 * exists yet there (kept for the campaign-seeding / admin-provisioning
 * path). Calls LevelDefinition.validate() before persisting.
 *
 * Security: if a level ALREADY EXISTS at the given id, the caller must be
 * its author and it must not be published yet
 * (LevelDefinition.assertCanBeEditedBy) — this is what stops any
 * authenticated user (including a guest with a random UUID) from
 * overwriting someone else's level, which was previously unrestricted.
 */
export class UpsertLevelUseCase implements UseCase<
  UpsertLevelInput,
  LevelOutput
> {
  constructor(private readonly levelRepo: ILevelRepository) {}

  async execute(input: UpsertLevelInput): Promise<LevelOutput> {
    const levelId = input.id ? LevelId.create(input.id) : LevelId.create();
    const callerId = input.authorId ? UserId.create(input.authorId) : null;

    const existing = await this.levelRepo.getById(levelId);
    if (existing) {
      if (!callerId) {
        throw new NotLevelAuthorError(levelId.value);
      }
      existing.assertCanBeEditedBy(callerId);
    }

    const level = LevelDefinition.create(
      input.name,
      input.difficulty,
      input.boardSize,
      input.arrows,
      input.rules,
      levelId,
      input.version ?? 1,
      existing ? existing.authorId : callerId,
    );

    level.validate();

    await this.levelRepo.upsert(level);

    return toLevelOutput(level);
  }
}
