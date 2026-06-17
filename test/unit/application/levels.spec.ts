import { GetLevelsUseCase } from '../../../src/application/use-cases/get-levels.use-case';
import { UpsertLevelUseCase } from '../../../src/application/use-cases/upsert-level.use-case';
import { LevelDefinition, NodeDefinition } from '../../../src/domain/entities/level-definition.entity';
import { LevelValidationError } from '../../../src/domain/errors/domain-error';
import { ILevelRepository } from '../../../src/domain/ports/level.repository';
import { LevelId } from '../../../src/domain/value-objects/level-id.vo';

const validNodes: NodeDefinition[] = [
  { id: 'n1', position: [0, 0], type: 'arrow', direction: 'UP' },
  { id: 'n2', position: [1, 0], type: 'exit' },
];
const validEdges: [string, string][] = [['n1', 'n2']];

const makeLevelRepo = (levels: LevelDefinition[]): ILevelRepository => ({
  getAll: jest.fn().mockResolvedValue(levels),
  getById: jest.fn().mockResolvedValue(levels[0] ?? null),
  upsert: jest.fn().mockResolvedValue(undefined),
});

describe('GetLevelsUseCase', () => {
  it('should_return_all_levels', async () => {
    // Arrange
    const level = LevelDefinition.create(validNodes, validEdges, {}, LevelId.create('l1'));
    const repo = makeLevelRepo([level]);
    const useCase = new GetLevelsUseCase(repo);
    // Act
    const result = await useCase.execute();
    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('l1');
    expect(result[0].nodes).toHaveLength(2);
  });

  it('should_return_empty_array_when_no_levels', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new GetLevelsUseCase(repo);
    const result = await useCase.execute();
    expect(result).toEqual([]);
  });
});

describe('UpsertLevelUseCase', () => {
  it('should_persist_level_when_graph_is_valid', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new UpsertLevelUseCase(repo);
    const result = await useCase.execute({ nodes: validNodes, edges: validEdges, rules: {} });
    expect(repo.upsert).toHaveBeenCalledTimes(1);
    expect(result.nodes).toHaveLength(2);
  });

  it('should_reject_level_when_graph_has_no_exit', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new UpsertLevelUseCase(repo);
    const noExit = validNodes.filter((n) => n.type !== 'exit');
    await expect(
      useCase.execute({ nodes: noExit, edges: [], rules: {} }),
    ).rejects.toThrow(LevelValidationError);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('should_reject_level_when_edge_references_unknown_node', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new UpsertLevelUseCase(repo);
    await expect(
      useCase.execute({ nodes: validNodes, edges: [['n1', 'GHOST']], rules: {} }),
    ).rejects.toThrow(LevelValidationError);
  });

  it('should_use_provided_id_when_given', async () => {
    const repo = makeLevelRepo([]);
    const useCase = new UpsertLevelUseCase(repo);
    const result = await useCase.execute({
      id: 'custom-id',
      nodes: validNodes,
      edges: validEdges,
      rules: {},
    });
    expect(result.id).toBe('custom-id');
  });
});
