import {
  LevelRules,
  NodeDefinition,
} from '../../domain/entities/level-definition.entity';

export interface UpsertLevelInput {
  id?: string;
  nodes: NodeDefinition[];
  edges: [string, string][];
  rules: LevelRules;
  version?: number;
}

export interface LevelOutput {
  id: string;
  nodes: NodeDefinition[];
  edges: [string, string][];
  rules: LevelRules;
  version: number;
}
