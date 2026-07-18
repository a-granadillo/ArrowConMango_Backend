import { GetHexagonalLeaderboardUseCase } from '../../../src/application/use-cases/get-hexagonal-leaderboard.use-case';
import { ScoreEntry } from '../../../src/domain/entities/score-entry.entity';
import { ILeaderboardRepository } from '../../../src/domain/ports/leaderboard.repository';
import { MangoScore } from '../../../src/domain/services/score-calculation.strategy';
import { GameMode } from '../../../src/domain/value-objects/game-mode.vo';
import { LevelId } from '../../../src/domain/value-objects/level-id.vo';
import { Score } from '../../../src/domain/value-objects/score.vo';
import { UserId } from '../../../src/domain/value-objects/user-id.vo';

const strategy = new MangoScore();

const makeLbRepo = (entries: ScoreEntry[]): ILeaderboardRepository => ({
  byLevel: jest.fn().mockResolvedValue([]),
  bySurvival: jest.fn().mockResolvedValue([]),
  byHexagonal: jest.fn().mockResolvedValue(entries),
  add: jest.fn().mockResolvedValue(undefined),
});

describe('GetHexagonalLeaderboardUseCase', () => {
  it('should_return_hexagonal_entries_ranked_by_score_descending', async () => {
    // Arrange
    const slow = ScoreEntry.create(
      UserId.create('slow'),
      LevelId.create('hex-001'),
      Score.create(3, 60_000),
      GameMode.hexagonal(),
    );
    const fast = ScoreEntry.create(
      UserId.create('fast'),
      LevelId.create('hex-002'),
      Score.create(1, 2_000),
      GameMode.hexagonal(),
    );
    const repo = makeLbRepo([slow, fast]);
    const useCase = new GetHexagonalLeaderboardUseCase(repo, strategy);
    // Act
    const result = await useCase.execute({});
    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe('fast');
    expect(result[1].userId).toBe('slow');
    expect(repo.byHexagonal).toHaveBeenCalledTimes(1);
  });

  it('should_return_empty_array_when_no_entries', async () => {
    const repo = makeLbRepo([]);
    const useCase = new GetHexagonalLeaderboardUseCase(repo, strategy);
    const result = await useCase.execute({});
    expect(result).toEqual([]);
  });

  it('should_respect_the_top_limit', async () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      ScoreEntry.create(
        UserId.create(`u${i}`),
        LevelId.create('hex-001'),
        Score.create(i, i * 1_000),
        GameMode.hexagonal(),
      ),
    );
    const repo = makeLbRepo(entries);
    const useCase = new GetHexagonalLeaderboardUseCase(repo, strategy);
    const result = await useCase.execute({ top: 2 });
    expect(result).toHaveLength(2);
  });
});
