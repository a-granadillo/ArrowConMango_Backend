import { UserId } from '../../domain/value-objects/user-id.vo';
import { ILevelRepository } from '../../domain/ports/level.repository';
import { LevelOutput } from '../dtos/level.dto';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» GetMyLevelsUseCase
 *
 * Returns every level (draft or published) authored by the current user, for
 * the "Mis niveles" screen in Modo Creativo.
 */
export class GetMyLevelsUseCase implements UseCase<string, LevelOutput[]> {
  constructor(private readonly levelRepo: ILevelRepository) {}

  async execute(authorId: string): Promise<LevelOutput[]> {
    const levels = await this.levelRepo.findByAuthor(UserId.create(authorId));
    return levels.map((l) => ({
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
