import { ILevelRepository } from '../../domain/ports/level.repository';
import { LevelOutput } from '../dtos/level.dto';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» GetLevelsUseCase
 *
 * Returns all available level definitions so the Flutter client can download
 * levels without requiring an app update (RF-B-04).
 */
export class GetLevelsUseCase implements UseCase<void, LevelOutput[]> {
  constructor(private readonly levelRepo: ILevelRepository) {}

  async execute(): Promise<LevelOutput[]> {
    const levels = await this.levelRepo.getAll();
    return levels.map((l) => ({
      id: l.id.value,
      name: l.name,
      difficulty: l.difficulty,
      boardSize: l.boardSize,
      arrows: l.arrows,
      rules: l.rules,
      version: l.version,
      authorId: l.authorId?.value ?? null,
    }));
  }
}
