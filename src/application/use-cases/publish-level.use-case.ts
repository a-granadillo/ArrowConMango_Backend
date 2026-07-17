import {
  LevelForbiddenError,
  LevelNotFoundError,
} from '../../domain/errors/domain-error';
import { ILevelRepository } from '../../domain/ports/level.repository';
import { LevelId } from '../../domain/value-objects/level-id.vo';
import { LevelOutput } from '../dtos/level.dto';
import { UseCase } from '../shared/use-case';

export interface PublishLevelInput {
  id: string;
  userId: string;
}

/**
 * «Use Case» PublishLevelUseCase
 *
 * Marks a draft level as published (publish-by-demonstration: the client
 * only calls this after the author has beaten their own draft in a
 * test-play session — enforced client-side, not re-checked here). Only the
 * level's author may publish it.
 */
export class PublishLevelUseCase implements UseCase<
  PublishLevelInput,
  LevelOutput
> {
  constructor(private readonly levelRepo: ILevelRepository) {}

  async execute(input: PublishLevelInput): Promise<LevelOutput> {
    const levelId = LevelId.create(input.id);
    const level = await this.levelRepo.getById(levelId);
    if (!level) {
      throw new LevelNotFoundError(input.id);
    }
    if (level.authorId?.value !== input.userId) {
      throw new LevelForbiddenError(input.id);
    }

    const published = level.publish();
    await this.levelRepo.upsert(published);

    return {
      id: published.id.value,
      name: published.name,
      difficulty: published.difficulty,
      boardSize: published.boardSize,
      arrows: published.arrows,
      rules: published.rules,
      version: published.version,
      authorId: published.authorId?.value ?? null,
      isPublished: published.isPublished,
      publishedAt: published.publishedAt,
    };
  }
}
