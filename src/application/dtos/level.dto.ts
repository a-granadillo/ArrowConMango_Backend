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

export interface CreateLevelInput {
  name: string;
  difficulty: string;
  boardSize: BoardSize;
  arrows: ArrowDefinition[];
  rules: LevelRules;
  authorId: string;
}

export interface PublishLevelInput {
  levelId: string;
  authorId: string;
}

export interface GetMyLevelsInput {
  authorId: string;
}

export interface GetCommunityLevelsInput {
  top?: number;
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
  publishedAt: string | null;
}
