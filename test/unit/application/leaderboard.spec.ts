import { GetLeaderboardUseCase } from '../../../src/application/use-cases/get-leaderboard.use-case';
import { SubmitScoreUseCase } from '../../../src/application/use-cases/submit-score.use-case';
import { ScoreEntry } from '../../../src/domain/entities/score-entry.entity';
import { ILeaderboardRepository } from '../../../src/domain/ports/leaderboard.repository';
import { LevelId } from '../../../src/domain/value-objects/level-id.vo';
import { Score } from '../../../src/domain/value-objects/score.vo';
import { UserId } from '../../../src/domain/value-objects/user-id.vo';

const makeLbRepo = (entries: ScoreEntry[]): ILeaderboardRepository => ({
  top: jest.fn().mockResolvedValue(entries),
  add: jest.fn().mockResolvedValue(undefined),
});

describe('GetLeaderboardUseCase', () => {
  it('should_return_top_scores_by_level', async () => {
    // Arrange
    const levelId = LevelId.create('lvl-1');
    const userId = UserId.create('u1');
    const entry = ScoreEntry.create(userId, levelId, Score.create(3, 10_000));
    const repo = makeLbRepo([entry]);
    const useCase = new GetLeaderboardUseCase(repo);
    // Act
    const result = await useCase.execute({ levelId: 'lvl-1' });
    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('u1');
    expect(result[0].levelId).toBe('lvl-1');
    expect(result[0].value).toBeGreaterThan(0);
    expect(repo.top).toHaveBeenCalledWith(expect.anything(), 10);
  });

  it('should_return_empty_array_when_no_entries', async () => {
    const repo = makeLbRepo([]);
    const useCase = new GetLeaderboardUseCase(repo);
    const result = await useCase.execute({ levelId: 'lvl-x' });
    expect(result).toEqual([]);
  });
});

describe('SubmitScoreUseCase', () => {
  it('should_persist_score_entry_when_called', async () => {
    // Arrange
    const repo = makeLbRepo([]);
    const useCase = new SubmitScoreUseCase(repo);
    // Act
    const result = await useCase.execute({
      userId: 'user-99',
      data: { levelId: 'lvl-2', moves: 7, timeMs: 25_000 },
    });
    // Assert
    expect(repo.add).toHaveBeenCalledTimes(1);
    expect(result.userId).toBe('user-99');
    expect(result.levelId).toBe('lvl-2');
    expect(result.value).toBeGreaterThanOrEqual(0);
    expect(result.at).toBeDefined();
  });
});
