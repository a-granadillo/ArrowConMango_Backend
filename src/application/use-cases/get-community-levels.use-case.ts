import { ILevelRepository } from '../../domain/ports/level.repository';
import { GetCommunityLevelsInput, LevelOutput } from '../dtos/level.dto';
import { toLevelOutput } from '../shared/level-presenter';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» GetCommunityLevelsUseCase
 *
 * Lists published community levels, most recently published first, so
 * players can discover and play levels other users have created.
 */
export class GetCommunityLevelsUseCase implements UseCase<
  GetCommunityLevelsInput,
  LevelOutput[]
> {
  constructor(private readonly levelRepo: ILevelRepository) {}

  async execute(input: GetCommunityLevelsInput): Promise<LevelOutput[]> {
    const levels = await this.levelRepo.published(input.top);
    return levels.map(toLevelOutput);
  }
}
