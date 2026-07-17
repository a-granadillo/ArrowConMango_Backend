import { LevelValidationError } from '../errors/domain-error';
import { LevelId } from '../value-objects/level-id.vo';
import { UserId } from '../value-objects/user-id.vo';

export type CardinalDirection = 'up' | 'down' | 'left' | 'right';

export interface BoardSize {
  rows: number;
  cols: number;
}

export interface BoardNode {
  row: number;
  col: number;
}

export interface TrajectorySegment {
  direction: CardinalDirection;
  length: number;
}

export interface ArrowDefinition {
  id: string;
  startNode: BoardNode;
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
 * Models the real board domain: a rectangular grid of [boardSize], with
 * arrows placed as polylines ([ArrowDefinition.trajectory]) rather than an
 * abstract node/edge graph. Arrows exit through the board's edge — there is
 * no "exit node" concept, matching how the game actually plays.
 *
 * validate() checks:
 *  - Every arrow's startNode and every in-board trajectory cell lies within
 *    boardSize.
 *  - There is at least one arrow.
 *  - Arrow ids are unique.
 *  - Every trajectory segment has length >= 1.
 */
export class LevelDefinition {
  private constructor(
    private readonly _id: LevelId,
    private readonly _name: string,
    private readonly _difficulty: string,
    private readonly _boardSize: BoardSize,
    private readonly _arrows: ArrowDefinition[],
    private readonly _rules: LevelRules,
    private readonly _version: number,
    private readonly _authorId: UserId | null,
  ) {}

  static create(
    name: string,
    difficulty: string,
    boardSize: BoardSize,
    arrows: ArrowDefinition[],
    rules: LevelRules,
    id?: LevelId,
    version = 1,
    authorId: UserId | null = null,
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
    );
  }

  static reconstitute(
    id: LevelId,
    name: string,
    difficulty: string,
    boardSize: BoardSize,
    arrows: ArrowDefinition[],
    rules: LevelRules,
    version: number,
    authorId: UserId | null,
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
    );
  }

  validate(): boolean {
    if (this._arrows.length === 0) {
      throw new LevelValidationError('Level must have at least one arrow');
    }

    const seenIds = new Set<string>();
    for (const arrow of this._arrows) {
      if (seenIds.has(arrow.id)) {
        throw new LevelValidationError(`Duplicate arrow id "${arrow.id}"`);
      }
      seenIds.add(arrow.id);

      if (!this._isInBounds(arrow.startNode)) {
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

      for (const node of this._trajectoryInBoardNodes(arrow)) {
        if (!this._isInBounds(node)) {
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
  private _trajectoryInBoardNodes(arrow: ArrowDefinition): BoardNode[] {
    const nodes: BoardNode[] = [];
    let { row, col } = arrow.startNode;
    for (const segment of arrow.trajectory.segments) {
      for (let step = 0; step < segment.length; step++) {
        if (this._isInBounds({ row, col })) {
          nodes.push({ row, col });
        }
        [row, col] = this._advance(row, col, segment.direction);
      }
    }
    return nodes;
  }

  private _advance(
    row: number,
    col: number,
    direction: CardinalDirection,
  ): [number, number] {
    switch (direction) {
      case 'up':
        return [row - 1, col];
      case 'down':
        return [row + 1, col];
      case 'left':
        return [row, col - 1];
      case 'right':
        return [row, col + 1];
    }
  }

  private _isInBounds(node: BoardNode): boolean {
    return (
      node.row >= 0 &&
      node.row < this._boardSize.rows &&
      node.col >= 0 &&
      node.col < this._boardSize.cols
    );
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

  get boardSize(): BoardSize {
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
}
