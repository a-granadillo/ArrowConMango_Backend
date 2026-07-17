import { GetCommunityLevelsUseCase } from '../../../src/application/use-cases/get-community-levels.use-case';
import { GetLevelsUseCase } from '../../../src/application/use-cases/get-levels.use-case';
import { GetMyLevelsUseCase } from '../../../src/application/use-cases/get-my-levels.use-case';
import { PublishLevelUseCase } from '../../../src/application/use-cases/publish-level.use-case';
import { UpsertLevelUseCase } from '../../../src/application/use-cases/upsert-level.use-case';
import {
  ArrowDefinition,
  LevelDefinition,
} from '../../../src/domain/entities/level-definition.entity';
import {
  LevelForbiddenError,
  LevelNotFoundError,
  LevelValidationError,
} from '../../../src/domain/errors/domain-error';
import { ILevelRepository } from '../../../src/domain/ports/level.repository';
import { LevelId } from '../../../src/domain/value-objects/level-id.vo';
import { UserId } from '../../../src/domain/value-objects/user-id.vo';

const boardSize = { rows: 4, cols: 4 };
const validArrows: ArrowDefinition[] = [
  {
    id: 'a1',
    startNode: { row: 0, col: 0 },
    trajectory: { segments: [{ direction: 'right', length: 2 }] },
    isSwitchable: false,
  },
];

const makeLevelRepo = (levels: LevelDefinition[]): ILevelRepository => ({
  getAll: jest.fn().mockResolvedValue(levels),
  getById: jest.fn().mockResolvedValue(levels[0] ?? null),
  upsert: jest.fn().mockResolvedValue(undefined),
  findByAuthor: jest
    .fn()
    .mockImplementation((authorId: UserId) =>
      Promise.resolve(
        levels.filter((l) => l.authorId?.value === authorId.value),
      ),
    ),
  findPublished: jest
    .fn()
    .mockImplementation((top?: number) =>
      Promise.resolve(levels.filter((l) => l.isPublished).slice(0, top)),
    ),
});

describe('GetLevelsUseCase', () => {
  it('should_return_all_levels', async () => {
    // Arrange
    const level = LevelDefinition.create(
      'Level 1',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('l1'),
    );
    const repo = makeLevelRepo([level]);
    const useCase = new GetLevelsUseCase(repo);
    // Act
    const result = await useCase.execute();
    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('l1');
    expect(result[0].arrows).toHaveLength(1);
    expect(result[0].authorId).toBeNull();
  });

  it('should_return_empty_array_when_no_levels', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new GetLevelsUseCase(repo);
    const result = await useCase.execute();
    expect(result).toEqual([]);
  });
});

describe('UpsertLevelUseCase', () => {
  it('should_persist_level_when_board_is_valid', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new UpsertLevelUseCase(repo);
    const result = await useCase.execute({
      name: 'Level 1',
      difficulty: 'Easy',
      boardSize,
      arrows: validArrows,
      rules: {},
    });
    expect(repo.upsert).toHaveBeenCalledTimes(1);
    expect(result.arrows).toHaveLength(1);
  });

  it('should_reject_level_when_it_has_no_arrows', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new UpsertLevelUseCase(repo);
    await expect(
      useCase.execute({
        name: 'Empty',
        difficulty: 'Easy',
        boardSize,
        arrows: [],
        rules: {},
      }),
    ).rejects.toThrow(LevelValidationError);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('should_reject_level_when_an_arrow_starts_outside_the_board', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new UpsertLevelUseCase(repo);
    await expect(
      useCase.execute({
        name: 'Out of bounds',
        difficulty: 'Easy',
        boardSize,
        arrows: [
          {
            id: 'a1',
            startNode: { row: 99, col: 0 },
            trajectory: { segments: [{ direction: 'right', length: 1 }] },
            isSwitchable: false,
          },
        ],
        rules: {},
      }),
    ).rejects.toThrow(LevelValidationError);
  });

  it('should_use_provided_id_when_given', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new UpsertLevelUseCase(repo);
    const result = await useCase.execute({
      id: 'custom-id',
      name: 'Level 1',
      difficulty: 'Easy',
      boardSize,
      arrows: validArrows,
      rules: {},
    });
    expect(result.id).toBe('custom-id');
  });

  it('should_set_authorId_when_provided', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new UpsertLevelUseCase(repo);
    const result = await useCase.execute({
      name: 'Level 1',
      difficulty: 'Easy',
      boardSize,
      arrows: validArrows,
      rules: {},
      authorId: 'author-1',
    });
    expect(result.authorId).toBe('author-1');
  });
});

describe('GetMyLevelsUseCase', () => {
  it('should_return_only_levels_authored_by_the_given_user', async () => {
    const mine = LevelDefinition.create(
      'Mine',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('l1'),
      1,
      UserId.create('author-1'),
    );
    const someoneElses = LevelDefinition.create(
      'Not mine',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('l2'),
      1,
      UserId.create('author-2'),
    );
    const repo = makeLevelRepo([mine, someoneElses]);
    const useCase = new GetMyLevelsUseCase(repo);

    const result = await useCase.execute('author-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('l1');
  });
});

describe('GetCommunityLevelsUseCase', () => {
  it('should_return_only_published_levels', async () => {
    const draft = LevelDefinition.create(
      'Draft',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('l1'),
    );
    const published = LevelDefinition.create(
      'Published',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('l2'),
      1,
      UserId.create('author-1'),
      true,
      new Date(),
    );
    const repo = makeLevelRepo([draft, published]);
    const useCase = new GetCommunityLevelsUseCase(repo);

    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('l2');
    expect(result[0].isPublished).toBe(true);
  });
});

describe('PublishLevelUseCase', () => {
  it('should_publish_a_draft_owned_by_the_requesting_user', async () => {
    const draft = LevelDefinition.create(
      'Draft',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('l1'),
      1,
      UserId.create('author-1'),
    );
    const repo = makeLevelRepo([draft]);
    const useCase = new PublishLevelUseCase(repo);

    const result = await useCase.execute({ id: 'l1', userId: 'author-1' });

    expect(result.isPublished).toBe(true);
    expect(result.publishedAt).not.toBeNull();
    expect(repo.upsert).toHaveBeenCalledTimes(1);
  });

  it('should_reject_publishing_when_the_requester_is_not_the_author', async () => {
    const draft = LevelDefinition.create(
      'Draft',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('l1'),
      1,
      UserId.create('author-1'),
    );
    const repo = makeLevelRepo([draft]);
    const useCase = new PublishLevelUseCase(repo);

    await expect(
      useCase.execute({ id: 'l1', userId: 'someone-else' }),
    ).rejects.toThrow(LevelForbiddenError);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('should_reject_publishing_a_level_that_does_not_exist', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new PublishLevelUseCase(repo);

    await expect(
      useCase.execute({ id: 'missing', userId: 'author-1' }),
    ).rejects.toThrow(LevelNotFoundError);
  });
});
