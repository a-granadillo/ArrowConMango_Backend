import { GetLevelsUseCase } from '../../../src/application/use-cases/get-levels.use-case';
import { UpsertLevelUseCase } from '../../../src/application/use-cases/upsert-level.use-case';
import {
  ArrowDefinition,
  LevelDefinition,
} from '../../../src/domain/entities/level-definition.entity';
import { LevelValidationError } from '../../../src/domain/errors/domain-error';
import { ILevelRepository } from '../../../src/domain/ports/level.repository';
import { LevelId } from '../../../src/domain/value-objects/level-id.vo';

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
