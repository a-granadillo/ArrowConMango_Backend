import { LevelNotFoundError } from '../../domain/errors/domain-error';
import { ILevelRepository } from '../../domain/ports/level.repository';
import { LevelId } from '../../domain/value-objects/level-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { PublishLevelInput, LevelOutput } from '../dtos/level.dto';
import { toLevelOutput } from '../shared/level-presenter';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» PublishLevelUseCase
 *
 * Publishes a draft the caller authored. Once published, a level is
 * immutable (LevelDefinition.publish() enforces this) — editing it after
 * publication would silently invalidate every score already recorded on
 * its leaderboard.
 */
export class PublishLevelUseCase implements UseCase<
  PublishLevelInput,
  LevelOutput
> {
  constructor(private readonly levelRepo: ILevelRepository) {}

  async execute(input: PublishLevelInput): Promise<LevelOutput> {
    const levelId = LevelId.create(input.levelId);
    const level = await this.levelRepo.getById(levelId);
    if (!level) {
      throw new LevelNotFoundError(input.levelId);
    }

    level.assertCanBeEditedBy(UserId.create(input.authorId));

    const published = level.publish();
    await this.levelRepo.upsert(published);

    return toLevelOutput(published);
  }
}
