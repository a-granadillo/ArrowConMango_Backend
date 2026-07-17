import { ILevelRepository } from '../../domain/ports/level.repository';
import { toLevelOutput } from '../shared/level-presenter';
import { LevelOutput } from '../dtos/level.dto';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» GetLevelsUseCase
 *
 * Returns the campaign catalogue (authorId === null) so the Flutter client
 * can download levels without requiring an app update (RF-B-04). Community
 * levels are served separately by GetCommunityLevelsUseCase /
 * GetMyLevelsUseCase — this endpoint would otherwise grow unbounded as
 * players publish levels.
 */
export class GetLevelsUseCase implements UseCase<void, LevelOutput[]> {
  constructor(private readonly levelRepo: ILevelRepository) {}

  async execute(): Promise<LevelOutput[]> {
    const levels = await this.levelRepo.getAll();
    return levels.filter((l) => l.authorId === null).map(toLevelOutput);
  }
}
