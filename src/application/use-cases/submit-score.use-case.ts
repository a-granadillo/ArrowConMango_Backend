import { PlayerProgress } from '../../domain/entities/player-progress.entity';
import { ScoreEntry } from '../../domain/entities/score-entry.entity';
import { ILeaderboardRepository } from '../../domain/ports/leaderboard.repository';
import { IProgressRepository } from '../../domain/ports/progress.repository';
import { IScoreCalculationStrategy } from '../../domain/services/score-calculation.strategy';
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
 * Records a completed-level score to the leaderboard, and marks the level
 * completed on the player's progress record (keeping the better of the old
 * and new score — PlayerProgress.markCompleted is merge-safe). This is what
 * lets a global leaderboard be computed later from PlayerProgress.best
 * without the client ever having to send `best` itself.
 * The AuthGuard (AOP, NestJS layer) ensures only authenticated users reach this.
 */
export class SubmitScoreUseCase implements UseCase<
  SubmitInput,
  ScoreEntryOutput
> {
  constructor(
    private readonly leaderboardRepo: ILeaderboardRepository,
    private readonly progressRepo: IProgressRepository,
    private readonly scoring: IScoreCalculationStrategy,
  ) {}

  async execute(input: SubmitInput): Promise<ScoreEntryOutput> {
    const userId = UserId.create(input.userId);
    const levelId = LevelId.create(input.data.levelId);
    const score = Score.create(input.data.moves, input.data.timeMs);

    const entry = ScoreEntry.create(userId, levelId, score);
    await this.leaderboardRepo.add(entry);

    const progress =
      (await this.progressRepo.byUser(userId)) ?? PlayerProgress.create(userId);
    progress.markCompleted(levelId, score, this.scoring);
    await this.progressRepo.save(progress);

    return {
      userId: entry.userId.value,
      levelId: entry.levelId.value,
      moves: entry.score.moves,
      timeMs: entry.score.timeMs,
      value: this.scoring.compute(entry.score),
      at: entry.at.toISOString(),
    };
  }
}
