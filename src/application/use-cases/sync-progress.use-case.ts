import { PlayerProgress } from '../../domain/entities/player-progress.entity';
import { IProgressRepository } from '../../domain/ports/progress.repository';
import { Score } from '../../domain/value-objects/score.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { ProgressOutput, SyncProgressInput } from '../dtos/progress.dto';
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
  constructor(private readonly progressRepo: IProgressRepository) {}

  async execute(input: SyncInput): Promise<ProgressOutput> {
    const uid = UserId.create(input.userId);

    const serverProgress =
      (await this.progressRepo.byUser(uid)) ?? PlayerProgress.create(uid);

    const incoming = PlayerProgress.reconstitute(uid, input.data.completed, input.data.best);
    serverProgress.merge(incoming);

    await this.progressRepo.save(serverProgress);

    const best: Record<string, { moves: number; timeMs: number; value: number }> = {};
    for (const [levelId, score] of serverProgress.best) {
      best[levelId] = { moves: score.moves, timeMs: score.timeMs, value: score.value() };
    }

    return {
      userId: input.userId,
      completed: Array.from(serverProgress.completed),
      best,
    };
  }
}
