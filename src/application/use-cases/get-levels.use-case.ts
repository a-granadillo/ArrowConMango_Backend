import { BoardShape } from '../../domain/entities/level-definition.entity';
import { ILevelRepository } from '../../domain/ports/level.repository';
import { LevelOutput } from '../dtos/level.dto';
import { UseCase } from '../shared/use-case';

interface GetLevelsInput {
  /** Filters the catalogue to a single board shape (e.g. "hex"). */
  shape?: BoardShape;
}

/**
 * «Use Case» GetLevelsUseCase
 *
 * Returns all available level definitions so the Flutter client can download
 * levels without requiring an app update (RF-B-04). Optionally filtered by
 * board shape so a client can request just the hexagonal catalogue.
 */
export class GetLevelsUseCase implements UseCase<
  GetLevelsInput | void,
  LevelOutput[]
> {
  constructor(private readonly levelRepo: ILevelRepository) {}

  async execute(input?: GetLevelsInput): Promise<LevelOutput[]> {
    const levels = await this.levelRepo.getAll();
    return levels
      .filter((l) => !input?.shape || l.shape === input.shape)
      .map((l) => ({
        id: l.id.value,
        name: l.name,
        difficulty: l.difficulty,
        boardSize: l.boardSize,
        arrows: l.arrows,
        rules: l.rules,
        version: l.version,
        authorId: l.authorId?.value ?? null,
        isPublished: l.isPublished,
        publishedAt: l.publishedAt,
        shape: l.shape,
      }));
  }
}
