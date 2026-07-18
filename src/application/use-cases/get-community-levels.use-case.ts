import { ILevelRepository } from '../../domain/ports/level.repository';
import { LevelOutput } from '../dtos/level.dto';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» GetCommunityLevelsUseCase
 *
 * Returns published, community-visible levels (most recently published
 * first), optionally capped to the top N, for the "Comunidad" screen in
 * Modo Creativo. No authentication required — these levels are public.
 */
export class GetCommunityLevelsUseCase implements UseCase<
  number | undefined,
  LevelOutput[]
> {
  constructor(private readonly levelRepo: ILevelRepository) {}

  async execute(top?: number): Promise<LevelOutput[]> {
    const levels = await this.levelRepo.findPublished(top);
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
