import { GetLeaderboardUseCase } from '../../../src/application/use-cases/get-leaderboard.use-case';
import { SubmitScoreUseCase } from '../../../src/application/use-cases/submit-score.use-case';
import { PlayerProgress } from '../../../src/domain/entities/player-progress.entity';
import { ScoreEntry } from '../../../src/domain/entities/score-entry.entity';
import { ILeaderboardRepository } from '../../../src/domain/ports/leaderboard.repository';
import { IProgressRepository } from '../../../src/domain/ports/progress.repository';
import { MangoScore } from '../../../src/domain/services/score-calculation.strategy';
import { GameMode } from '../../../src/domain/value-objects/game-mode.vo';
import { LevelId } from '../../../src/domain/value-objects/level-id.vo';
import { Score } from '../../../src/domain/value-objects/score.vo';
import { UserId } from '../../../src/domain/value-objects/user-id.vo';

const strategy = new MangoScore();

const makeLbRepo = (entries: ScoreEntry[]): ILeaderboardRepository => ({
  byLevel: jest.fn().mockResolvedValue(entries),
  bySurvival: jest.fn().mockResolvedValue([]),
  byHexagonal: jest.fn().mockResolvedValue([]),
  byCube3d: jest.fn().mockResolvedValue([]),
  add: jest.fn().mockResolvedValue(undefined),
});

const makeProgressRepo = (
  existing: PlayerProgress | null = null,
): IProgressRepository => ({
  byUser: jest.fn().mockResolvedValue(existing),
  save: jest.fn().mockResolvedValue(undefined),
  all: jest.fn().mockResolvedValue([]),
});

describe('GetLeaderboardUseCase', () => {
  it('should_return_top_scores_by_level', async () => {
    // Arrange
    const levelId = LevelId.create('lvl-1');
    const userId = UserId.create('u1');
    const entry = ScoreEntry.create(
      userId,
      levelId,
      Score.create(3, 10_000),
      GameMode.campaign(),
    );
    const repo = makeLbRepo([entry]);
    const useCase = new GetLeaderboardUseCase(repo, strategy);
    // Act
    const result = await useCase.execute({ levelId: 'lvl-1' });
    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('u1');
    expect(result[0].levelId).toBe('lvl-1');
    expect(result[0].value).toBeGreaterThan(0);
    expect(repo.byLevel).toHaveBeenCalledWith(expect.anything());
  });

  it('should_return_empty_array_when_no_entries', async () => {
    const repo = makeLbRepo([]);
    const useCase = new GetLeaderboardUseCase(repo, strategy);
    const result = await useCase.execute({ levelId: 'lvl-x' });
    expect(result).toEqual([]);
  });
});

describe('SubmitScoreUseCase', () => {
  it('should_persist_score_entry_when_called', async () => {
    // Arrange
    const repo = makeLbRepo([]);
    const progressRepo = makeProgressRepo();
    const useCase = new SubmitScoreUseCase(repo, progressRepo, strategy);
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

  it('should_mark_level_completed_on_progress_when_no_prior_progress_exists', async () => {
    // Arrange
    const repo = makeLbRepo([]);
    const progressRepo = makeProgressRepo(null);
    const useCase = new SubmitScoreUseCase(repo, progressRepo, strategy);
    // Act
    await useCase.execute({
      userId: 'user-1',
      data: { levelId: 'lvl-3', moves: 4, timeMs: 8_000 },
    });
    // Assert
    expect(progressRepo.save).toHaveBeenCalledTimes(1);
    const saved = (progressRepo.save as jest.Mock).mock
      .calls[0][0] as PlayerProgress;
    expect(saved.isCompleted(LevelId.create('lvl-3'))).toBe(true);
    expect(saved.bestFor(LevelId.create('lvl-3'))?.moves).toBe(4);
  });

  it('should_keep_the_better_score_when_progress_already_exists', async () => {
    // Arrange — existing progress has a worse run for the same level
    const userId = UserId.create('user-2');
    const levelId = LevelId.create('lvl-4');
    const existing = PlayerProgress.create(userId);
    existing.markCompleted(levelId, Score.create(50, 60_000), strategy);
    const repo = makeLbRepo([]);
    const progressRepo = makeProgressRepo(existing);
    const useCase = new SubmitScoreUseCase(repo, progressRepo, strategy);
    // Act — submit a much better run
    await useCase.execute({
      userId: 'user-2',
      data: { levelId: 'lvl-4', moves: 1, timeMs: 1_000 },
    });
    // Assert
    const saved = (progressRepo.save as jest.Mock).mock
      .calls[0][0] as PlayerProgress;
    expect(saved.bestFor(levelId)?.moves).toBe(1);
  });

  it('should_not_touch_player_progress_for_survival_submissions', async () => {
    // Arrange — survival runs must never leak into campaign best-scores
    const repo = makeLbRepo([]);
    const progressRepo = makeProgressRepo(null);
    const useCase = new SubmitScoreUseCase(repo, progressRepo, strategy);
    // Act
    await useCase.execute({
      userId: 'user-5',
      data: { levelId: '-1', moves: 2, timeMs: 4_000, mode: 'survival' },
    });
    // Assert
    expect(repo.add).toHaveBeenCalledTimes(1);
    expect(progressRepo.save).not.toHaveBeenCalled();
  });

  it('should_not_touch_player_progress_for_cube3d_submissions', async () => {
    // Arrange — cube3d boards are procedurally generated, same as survival
    const repo = makeLbRepo([]);
    const progressRepo = makeProgressRepo(null);
    const useCase = new SubmitScoreUseCase(repo, progressRepo, strategy);
    // Act
    await useCase.execute({
      userId: 'user-6',
      data: { levelId: 'cube-gen-1', moves: 5, timeMs: 6_000, mode: 'cube3d' },
    });
    // Assert
    expect(repo.add).toHaveBeenCalledTimes(1);
    expect(progressRepo.save).not.toHaveBeenCalled();
  });
});
