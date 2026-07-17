import {
  ArrowDefinition,
  BoardSize,
  LevelRules,
} from '../../domain/entities/level-definition.entity';

export interface UpsertLevelInput {
  id?: string;
  name: string;
  difficulty: string;
  boardSize: BoardSize;
  arrows: ArrowDefinition[];
  rules: LevelRules;
  version?: number;
  authorId?: string | null;
}

export interface LevelOutput {
  id: string;
  name: string;
  difficulty: string;
  boardSize: BoardSize;
  arrows: ArrowDefinition[];
  rules: LevelRules;
  version: number;
  authorId: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
}
