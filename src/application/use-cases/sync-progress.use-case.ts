import { PlayerProgress } from '../../domain/entities/player-progress.entity';
import { IProgressRepository } from '../../domain/ports/progress.repository';
import { IScoreCalculationStrategy } from '../../domain/services/score-calculation.strategy';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { ProgressOutput, SyncProgressInput } from '../dtos/progress.dto';
import { ProgressPresenter } from '../shared/progress-presenter';
import { UseCase } from '../shared/use-case';

interface SyncInput {
  userId: string;
  data: SyncProgressInput;
}

/**
 * «Use Case» SyncProgressUseCase
 *
 * Merges client-side progress with the server record using
 * PlayerProgress.merge(), which is idempotent: sending the same data
 * twice produces the same result (RF-B-02, GUIA_IA §9).
 */
export class SyncProgressUseCase implements UseCase<SyncInput, ProgressOutput> {
  constructor(
    private readonly progressRepo: IProgressRepository,
    private readonly scoring: IScoreCalculationStrategy,
  ) {}

  async execute(input: SyncInput): Promise<ProgressOutput> {
    const uid = UserId.create(input.userId);

    const serverProgress =
      (await this.progressRepo.byUser(uid)) ?? PlayerProgress.create(uid);

    const incoming = PlayerProgress.reconstitute(
      uid,
      input.data.completed,
      input.data.best,
      input.data.currentLevel ?? 0,
    );
    serverProgress.merge(incoming, this.scoring);

    await this.progressRepo.save(serverProgress);

    return ProgressPresenter.toOutput(serverProgress, this.scoring);
  }
}
