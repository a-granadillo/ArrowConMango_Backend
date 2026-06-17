import { PlayerProgress } from '../../domain/entities/player-progress.entity';
import { IProgressRepository } from '../../domain/ports/progress.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { ProgressOutput } from '../dtos/progress.dto';
import { UseCase } from '../shared/use-case';

/**
 * «Use Case» GetProgressUseCase
 *
 * Returns the current server-side progress for an authenticated player.
 * If no progress record exists yet, returns an empty progress object.
 */
export class GetProgressUseCase implements UseCase<string, ProgressOutput> {
  constructor(private readonly progressRepo: IProgressRepository) {}

  async execute(userId: string): Promise<ProgressOutput> {
    const uid = UserId.create(userId);
    const progress = await this.progressRepo.byUser(uid);

    if (!progress) {
      return {
        userId,
        completed: [],
        best: {},
      };
    }

    return this.toOutput(progress);
  }

  private toOutput(progress: PlayerProgress): ProgressOutput {
    const best: Record<string, { moves: number; timeMs: number; value: number }> = {};
    for (const [levelId, score] of progress.best) {
      best[levelId] = {
        moves: score.moves,
        timeMs: score.timeMs,
        value: score.value(),
      };
    }
    return {
      userId: progress.userId.value,
      completed: Array.from(progress.completed),
      best,
    };
  }
}
