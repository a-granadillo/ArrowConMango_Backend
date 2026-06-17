import { ScoreEntry } from '../../domain/entities/score-entry.entity';
import { ILeaderboardRepository } from '../../domain/ports/leaderboard.repository';
import { LevelId } from '../../domain/value-objects/level-id.vo';
import { Score } from '../../domain/value-objects/score.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { ScoreEntryOutput, SubmitScoreInput } from '../dtos/leaderboard.dto';
import { UseCase } from '../shared/use-case';

interface SubmitInput {
  userId: string;
  data: SubmitScoreInput;
}

/**
 * «Use Case» SubmitScoreUseCase
 *
 * Records a completed-level score to the leaderboard.
 * The AuthGuard (AOP, NestJS layer) ensures only authenticated users reach this.
 */
export class SubmitScoreUseCase implements UseCase<SubmitInput, ScoreEntryOutput> {
  constructor(private readonly leaderboardRepo: ILeaderboardRepository) {}

  async execute(input: SubmitInput): Promise<ScoreEntryOutput> {
    const userId = UserId.create(input.userId);
    const levelId = LevelId.create(input.data.levelId);
    const score = Score.create(input.data.moves, input.data.timeMs);

    const entry = ScoreEntry.create(userId, levelId, score);
    await this.leaderboardRepo.add(entry);

    return {
      userId: entry.userId.value,
      levelId: entry.levelId.value,
      moves: entry.score.moves,
      timeMs: entry.score.timeMs,
      value: entry.score.value(),
      at: entry.at.toISOString(),
    };
  }
}
