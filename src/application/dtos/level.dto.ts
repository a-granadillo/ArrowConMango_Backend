import {
  AnyBoardSize,
  ArrowDefinition,
  BoardShape,
  LevelRules,
} from '../../domain/entities/level-definition.entity';

export interface UpsertLevelInput {
  id?: string;
  name: string;
  difficulty: string;
  boardSize: AnyBoardSize;
  arrows: ArrowDefinition[];
  rules: LevelRules;
  version?: number;
  authorId?: string | null;
  /** Defaults to 'grid2d' at the HTTP boundary when omitted. */
  shape?: BoardShape;
}

export interface LevelOutput {
  id: string;
  name: string;
  difficulty: string;
  boardSize: AnyBoardSize;
  arrows: ArrowDefinition[];
  rules: LevelRules;
  version: number;
  authorId: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
  shape: BoardShape;
}
