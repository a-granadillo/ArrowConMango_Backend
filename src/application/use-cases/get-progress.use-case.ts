import { IProgressRepository } from '../../domain/ports/progress.repository';
import { IScoreCalculationStrategy } from '../../domain/services/score-calculation.strategy';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { ProgressOutput } from '../dtos/progress.dto';
import { ProgressPresenter } from '../shared/progress-presenter';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» GetProgressUseCase
 *
 * Returns the current server-side progress for an authenticated player.
 * If no progress record exists yet, returns an empty progress object.
 */
export class GetProgressUseCase implements UseCase<string, ProgressOutput> {
  constructor(
    private readonly progressRepo: IProgressRepository,
    private readonly scoring: IScoreCalculationStrategy,
  ) {}

  async execute(userId: string): Promise<ProgressOutput> {
    const uid = UserId.create(userId);
    const progress = await this.progressRepo.byUser(uid);

    if (!progress) {
      return {
        userId,
        completed: [],
        best: {},
        currentLevel: 0,
      };
    }

    return ProgressPresenter.toOutput(progress, this.scoring);
  }
}
