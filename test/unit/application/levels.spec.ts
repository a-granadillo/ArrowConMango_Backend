import { CreateLevelUseCase } from '../../../src/application/use-cases/create-level.use-case';
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
  LevelAlreadyPublishedError,
  LevelNotFoundError,
  LevelValidationError,
  NotLevelAuthorError,
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

const makeLevelRepo = (levels: LevelDefinition[]): ILevelRepository => {
  const store = new Map(levels.map((l) => [l.id.value, l]));
  return {
    getAll: jest.fn().mockResolvedValue([...store.values()]),
    getById: jest
      .fn()
      .mockImplementation(async (id: LevelId) => store.get(id.value) ?? null),
    upsert: jest.fn().mockImplementation(async (level: LevelDefinition) => {
      store.set(level.id.value, level);
    }),
    byAuthor: jest
      .fn()
      .mockImplementation(async (userId: UserId) =>
        [...store.values()].filter((l) => l.authorId?.equals(userId)),
      ),
    published: jest.fn().mockImplementation(async (top?: number) => {
      const pub = [...store.values()].filter((l) => l.isPublished);
      return top ? pub.slice(0, top) : pub;
    }),
  };
};

describe('GetLevelsUseCase', () => {
  it('should_return_only_campaign_levels_not_community_ones', async () => {
    // Arrange
    const campaign = LevelDefinition.create(
      'Level 1',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('l1'),
    );
    const community = LevelDefinition.create(
      'Community Level',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('c1'),
      1,
      UserId.create('author-1'),
    );
    const repo = makeLevelRepo([campaign, community]);
    const useCase = new GetLevelsUseCase(repo);
    // Act
    const result = await useCase.execute();
    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('l1');
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

  it('should_let_the_author_edit_their_own_unpublished_draft', async () => {
    const draft = LevelDefinition.create(
      'Draft',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('d1'),
      1,
      UserId.create('author-1'),
    );
    const repo = makeLevelRepo([draft]);
    const useCase = new UpsertLevelUseCase(repo);
    const result = await useCase.execute({
      id: 'd1',
      name: 'Draft (edited)',
      difficulty: 'Easy',
      boardSize,
      arrows: validArrows,
      rules: {},
      authorId: 'author-1',
    });
    expect(result.name).toBe('Draft (edited)');
    expect(result.authorId).toBe('author-1');
  });

  it('should_reject_editing_someone_elses_level', async () => {
    const draft = LevelDefinition.create(
      'Draft',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('d1'),
      1,
      UserId.create('author-1'),
    );
    const repo = makeLevelRepo([draft]);
    const useCase = new UpsertLevelUseCase(repo);
    await expect(
      useCase.execute({
        id: 'd1',
        name: 'Hijacked',
        difficulty: 'Easy',
        boardSize,
        arrows: validArrows,
        rules: {},
        authorId: 'attacker',
      }),
    ).rejects.toThrow(NotLevelAuthorError);
  });

  it('should_reject_editing_a_campaign_level_even_when_authenticated', async () => {
    const campaign = LevelDefinition.create(
      'Level 1',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('1'),
    );
    const repo = makeLevelRepo([campaign]);
    const useCase = new UpsertLevelUseCase(repo);
    await expect(
      useCase.execute({
        id: '1',
        name: 'Tampered',
        difficulty: 'Easy',
        boardSize,
        arrows: validArrows,
        rules: {},
        authorId: 'any-guest',
      }),
    ).rejects.toThrow(NotLevelAuthorError);
  });

  it('should_reject_editing_an_already_published_level', async () => {
    const draft = LevelDefinition.create(
      'Draft',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('d1'),
      1,
      UserId.create('author-1'),
    ).publish();
    const repo = makeLevelRepo([draft]);
    const useCase = new UpsertLevelUseCase(repo);
    await expect(
      useCase.execute({
        id: 'd1',
        name: 'Tampered',
        difficulty: 'Easy',
        boardSize,
        arrows: validArrows,
        rules: {},
        authorId: 'author-1',
      }),
    ).rejects.toThrow(LevelAlreadyPublishedError);
  });
});

describe('CreateLevelUseCase', () => {
  it('should_create_an_unpublished_draft_authored_by_the_caller', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new CreateLevelUseCase(repo);
    const result = await useCase.execute({
      name: 'My Level',
      difficulty: 'Easy',
      boardSize,
      arrows: validArrows,
      rules: {},
      authorId: 'author-1',
    });
    expect(result.authorId).toBe('author-1');
    expect(result.isPublished).toBe(false);
    expect(repo.upsert).toHaveBeenCalledTimes(1);
  });

  it('should_reject_an_invalid_board', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new CreateLevelUseCase(repo);
    await expect(
      useCase.execute({
        name: 'Empty',
        difficulty: 'Easy',
        boardSize,
        arrows: [],
        rules: {},
        authorId: 'author-1',
      }),
    ).rejects.toThrow(LevelValidationError);
  });
});

describe('PublishLevelUseCase', () => {
  it('should_publish_the_authors_own_draft', async () => {
    const draft = LevelDefinition.create(
      'Draft',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('d1'),
      1,
      UserId.create('author-1'),
    );
    const repo = makeLevelRepo([draft]);
    const useCase = new PublishLevelUseCase(repo);
    const result = await useCase.execute({
      levelId: 'd1',
      authorId: 'author-1',
    });
    expect(result.isPublished).toBe(true);
    expect(result.publishedAt).not.toBeNull();
  });

  it('should_reject_publishing_someone_elses_draft', async () => {
    const draft = LevelDefinition.create(
      'Draft',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('d1'),
      1,
      UserId.create('author-1'),
    );
    const repo = makeLevelRepo([draft]);
    const useCase = new PublishLevelUseCase(repo);
    await expect(
      useCase.execute({ levelId: 'd1', authorId: 'attacker' }),
    ).rejects.toThrow(NotLevelAuthorError);
  });

  it('should_reject_publishing_an_already_published_level', async () => {
    const published = LevelDefinition.create(
      'Draft',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('d1'),
      1,
      UserId.create('author-1'),
    ).publish();
    const repo = makeLevelRepo([published]);
    const useCase = new PublishLevelUseCase(repo);
    await expect(
      useCase.execute({ levelId: 'd1', authorId: 'author-1' }),
    ).rejects.toThrow(LevelAlreadyPublishedError);
  });

  it('should_reject_publishing_a_level_that_does_not_exist', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new PublishLevelUseCase(repo);
    await expect(
      useCase.execute({ levelId: 'ghost', authorId: 'author-1' }),
    ).rejects.toThrow(LevelNotFoundError);
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
      LevelId.create('d1'),
      1,
      UserId.create('author-1'),
    );
    const published = LevelDefinition.create(
      'Published',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('p1'),
      1,
      UserId.create('author-2'),
    ).publish();
    const repo = makeLevelRepo([draft, published]);
    const useCase = new GetCommunityLevelsUseCase(repo);
    const result = await useCase.execute({});
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });
});

describe('GetMyLevelsUseCase', () => {
  it('should_return_every_level_authored_by_the_caller_draft_or_published', async () => {
    const draft = LevelDefinition.create(
      'Draft',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('d1'),
      1,
      UserId.create('author-1'),
    );
    const published = LevelDefinition.create(
      'Published',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('p1'),
      1,
      UserId.create('author-1'),
    ).publish();
    const someoneElses = LevelDefinition.create(
      'Not mine',
      'Easy',
      boardSize,
      validArrows,
      {},
      LevelId.create('x1'),
      1,
      UserId.create('author-2'),
    );
    const repo = makeLevelRepo([draft, published, someoneElses]);
    const useCase = new GetMyLevelsUseCase(repo);
    const result = await useCase.execute({ authorId: 'author-1' });
    expect(result.map((l) => l.id).sort()).toEqual(['d1', 'p1']);
  });
});
