import { SyncProgressUseCase } from '../../../src/application/use-cases/sync-progress.use-case';
import { PlayerProgress } from '../../../src/domain/entities/player-progress.entity';
import { IProgressRepository } from '../../../src/domain/ports/progress.repository';
import { UserId } from '../../../src/domain/value-objects/user-id.vo';

const makeRepo = (progress: PlayerProgress | null): IProgressRepository => ({
  byUser: jest.fn().mockResolvedValue(progress),
  save: jest.fn().mockResolvedValue(undefined),
});

describe('SyncProgressUseCase', () => {
  const userId = 'user-42';

  it('should_merge_and_save_progress_when_server_record_exists', async () => {
    // Arrange — server has level-1 already
    const uid = UserId.create(userId);
    const serverProgress = PlayerProgress.create(uid);
    const repo = makeRepo(serverProgress);
    const useCase = new SyncProgressUseCase(repo);
    // Act
    const result = await useCase.execute({
      userId,
      data: {
        completed: ['level-2'],
        best: { 'level-2': { moves: 5, timeMs: 20_000 } },
      },
    });
    // Assert
    expect(result.completed).toContain('level-2');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('should_create_new_progress_when_no_server_record', async () => {
    const repo = makeRepo(null);
    const useCase = new SyncProgressUseCase(repo);
    const result = await useCase.execute({
      userId,
      data: {
        completed: ['level-1'],
        best: { 'level-1': { moves: 3, timeMs: 10_000 } },
      },
    });
    expect(result.completed).toContain('level-1');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('should_return_current_level_when_syncing', async () => {
    const repo = makeRepo(null);
    const useCase = new SyncProgressUseCase(repo);
    const result = await useCase.execute({
      userId,
      data: { completed: [], best: {}, currentLevel: 3 },
    });
    expect(result.currentLevel).toBe(3);
  });

  it('should_keep_higher_current_level_when_syncing_a_lower_one', async () => {
    let savedProgress: PlayerProgress | null = null;
    const repo: IProgressRepository = {
      byUser: jest
        .fn()
        .mockImplementation(() => Promise.resolve(savedProgress)),
      save: jest.fn().mockImplementation((p: PlayerProgress) => {
        savedProgress = p;
        return Promise.resolve();
      }),
    };
    const useCase = new SyncProgressUseCase(repo);

    await useCase.execute({
      userId,
      data: { completed: [], best: {}, currentLevel: 5 },
    });
    const result = await useCase.execute({
      userId,
      data: { completed: [], best: {}, currentLevel: 2 },
    });

    expect(result.currentLevel).toBe(5);
  });

  it('should_merge_progress_idempotently_when_same_data_sent_twice', async () => {
    // Arrange — start empty
    let savedProgress: PlayerProgress | null = null;
    const repo: IProgressRepository = {
      byUser: jest
        .fn()
        .mockImplementation(() => Promise.resolve(savedProgress)),
      save: jest.fn().mockImplementation((p: PlayerProgress) => {
        savedProgress = p;
        return Promise.resolve();
      }),
    };
    const useCase = new SyncProgressUseCase(repo);

    const input = {
      userId,
      data: {
        completed: ['level-1'],
        best: { 'level-1': { moves: 5, timeMs: 20_000 } },
      },
    };

    // Act — send same data twice
    const r1 = await useCase.execute(input);
    const r2 = await useCase.execute(input);

    // Assert — results are identical, no duplication
    expect(r1.completed).toEqual(r2.completed);
    expect(r2.completed).toHaveLength(1);
  });
});
