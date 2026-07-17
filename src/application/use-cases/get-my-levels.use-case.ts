import { ILevelRepository } from '../../domain/ports/level.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { GetMyLevelsInput, LevelOutput } from '../dtos/level.dto';
import { toLevelOutput } from '../shared/level-presenter';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» GetMyLevelsUseCase
 *
 * Lists every level (draft or published) authored by the caller, so the
 * creative-mode "mine" screen can show drafts-in-progress alongside
 * already-published levels.
 */
export class GetMyLevelsUseCase implements UseCase<
  GetMyLevelsInput,
  LevelOutput[]
> {
  constructor(private readonly levelRepo: ILevelRepository) {}

  async execute(input: GetMyLevelsInput): Promise<LevelOutput[]> {
    const levels = await this.levelRepo.byAuthor(UserId.create(input.authorId));
    return levels.map(toLevelOutput);
  }
}
