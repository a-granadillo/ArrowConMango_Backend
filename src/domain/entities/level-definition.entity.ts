import { LevelValidationError } from '../errors/domain-error';
import { LevelId } from '../value-objects/level-id.vo';
import { UserId } from '../value-objects/user-id.vo';
import {
  AnyBoardNode,
  AnyBoardSize,
  AnyDirection,
  BoardShape,
  createBoardGeometry,
} from './board-geometry.strategy';

export type {
  AnyBoardNode,
  AnyBoardSize,
  AnyDirection,
  BoardShape,
  BoardNode,
  BoardSize,
  CardinalDirection,
  HexBoardNode,
  HexBoardSize,
  HexDirection,
} from './board-geometry.strategy';

export interface TrajectorySegment {
  direction: AnyDirection;
  length: number;
}

export interface ArrowDefinition {
  id: string;
  startNode: AnyBoardNode;
  trajectory: { segments: TrajectorySegment[] };
  isSwitchable: boolean;
}

export interface LevelRules {
  timeLimitSeconds?: number | null;
  maxMistakes?: number | null;
  allowRotation?: boolean | null;
}

/**
 * «Aggregate Root» LevelDefinition — immutable blueprint of a puzzle level.
 *
 * Models the real board domain: arrows placed as polylines
 * ([ArrowDefinition.trajectory]) rather than an abstract node/edge graph.
 * Arrows exit through the board's edge — there is no "exit node" concept,
 * matching how the game actually plays.
 *
 * The board's coordinate system (rectangular grid or hexagon) is a
 * «Strategy» ([IBoardGeometry], see board-geometry.strategy.ts) selected by
 * [shape]. Adding a new board shape means adding a new strategy, not
 * modifying this aggregate (OCP) — validate() always delegates bounds/step
 * math to the strategy instead of hard-coding grid arithmetic.
 *
 * validate() checks:
 *  - Every arrow's startNode and every in-board trajectory cell lies within
 *    the board (per its geometry strategy).
 *  - There is at least one arrow.
 *  - Arrow ids are unique.
 *  - Every trajectory segment has length >= 1.
 */
export class LevelDefinition {
  private constructor(
    private readonly _id: LevelId,
    private readonly _name: string,
    private readonly _difficulty: string,
    private readonly _boardSize: AnyBoardSize,
    private readonly _arrows: ArrowDefinition[],
    private readonly _rules: LevelRules,
    private readonly _version: number,
    private readonly _authorId: UserId | null,
    private readonly _isPublished: boolean,
    private readonly _publishedAt: Date | null,
    private readonly _shape: BoardShape,
  ) {}

  static create(
    name: string,
    difficulty: string,
    boardSize: AnyBoardSize,
    arrows: ArrowDefinition[],
    rules: LevelRules,
    id?: LevelId,
    version = 1,
    authorId: UserId | null = null,
    isPublished = false,
    publishedAt: Date | null = null,
    shape: BoardShape = 'grid2d',
  ): LevelDefinition {
    return new LevelDefinition(
      id ?? LevelId.create(),
      name,
      difficulty,
      boardSize,
      arrows,
      rules,
      version,
      authorId,
      isPublished,
      publishedAt,
      shape,
    );
  }

  static reconstitute(
    id: LevelId,
    name: string,
    difficulty: string,
    boardSize: AnyBoardSize,
    arrows: ArrowDefinition[],
    rules: LevelRules,
    version: number,
    authorId: UserId | null,
    isPublished: boolean,
    publishedAt: Date | null,
    shape: BoardShape = 'grid2d',
  ): LevelDefinition {
    return new LevelDefinition(
      id,
      name,
      difficulty,
      boardSize,
      arrows,
      rules,
      version,
      authorId,
      isPublished,
      publishedAt,
      shape,
    );
  }

  /** Returns a published copy of this level, stamped with the current time. */
  publish(): LevelDefinition {
    return new LevelDefinition(
      this._id,
      this._name,
      this._difficulty,
      this._boardSize,
      this._arrows,
      this._rules,
      this._version,
      this._authorId,
      true,
      new Date(),
      this._shape,
    );
  }

  validate(): boolean {
    if (this._arrows.length === 0) {
      throw new LevelValidationError('Level must have at least one arrow');
    }

    const geometry = createBoardGeometry(this._shape, this._boardSize);

    const seenIds = new Set<string>();
    for (const arrow of this._arrows) {
      if (seenIds.has(arrow.id)) {
        throw new LevelValidationError(`Duplicate arrow id "${arrow.id}"`);
      }
      seenIds.add(arrow.id);

      if (!geometry.isInBounds(arrow.startNode)) {
        throw new LevelValidationError(
          `Arrow "${arrow.id}" starts outside the board`,
        );
      }

      for (const segment of arrow.trajectory.segments) {
        if (segment.length < 1) {
          throw new LevelValidationError(
            `Arrow "${arrow.id}" has a segment with length < 1`,
          );
        }
      }

      for (const node of this._trajectoryInBoardNodes(arrow, geometry)) {
        if (!geometry.isInBounds(node)) {
          throw new LevelValidationError(
            `Arrow "${arrow.id}" body leaves the board`,
          );
        }
      }
    }

    return true;
  }

  /**
   * Nodes the arrow's body occupies while still inside the board (its exit
   * trajectory is allowed to cross the boundary — that's how it exits).
   */
  private _trajectoryInBoardNodes(
    arrow: ArrowDefinition,
    geometry: ReturnType<typeof createBoardGeometry>,
  ): AnyBoardNode[] {
    const nodes: AnyBoardNode[] = [];
    let node = arrow.startNode;
    for (const segment of arrow.trajectory.segments) {
      for (let step = 0; step < segment.length; step++) {
        if (geometry.isInBounds(node)) {
          nodes.push(node);
        }
        node = geometry.advance(node, segment.direction);
      }
    }
    return nodes;
  }

  get id(): LevelId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get difficulty(): string {
    return this._difficulty;
  }

  get shape(): BoardShape {
    return this._shape;
  }

  get boardSize(): AnyBoardSize {
    return { ...this._boardSize };
  }

  get arrows(): ArrowDefinition[] {
    return [...this._arrows];
  }

  get rules(): LevelRules {
    return { ...this._rules };
  }

  get version(): number {
    return this._version;
  }

  get authorId(): UserId | null {
    return this._authorId;
  }

  get isPublished(): boolean {
    return this._isPublished;
  }

  get publishedAt(): Date | null {
    return this._publishedAt;
  }
}
