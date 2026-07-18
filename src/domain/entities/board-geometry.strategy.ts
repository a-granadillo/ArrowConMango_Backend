import { LevelValidationError } from '../errors/domain-error';

export type BoardShape = 'grid2d' | 'hex';

export type CardinalDirection = 'up' | 'down' | 'left' | 'right';
export type HexDirection = 'n' | 'ne' | 'se' | 's' | 'sw' | 'nw';
export type AnyDirection = CardinalDirection | HexDirection;

export interface BoardSize {
  rows: number;
  cols: number;
}

export interface HexBoardSize {
  radius: number;
}

export type AnyBoardSize = BoardSize | HexBoardSize;

export interface BoardNode {
  row: number;
  col: number;
}

export interface HexBoardNode {
  q: number;
  r: number;
}

export type AnyBoardNode = BoardNode | HexBoardNode;

/**
 * «Strategy» IBoardGeometry — how a board's coordinate system advances a
 * position along a direction and decides whether a node lies within bounds.
 *
 * `LevelDefinition` delegates to a concrete implementation instead of
 * hard-coding rectangular math, so a new board shape (this interface's
 * `HexBoardGeometry`) is added without modifying the aggregate itself (OCP).
 */
export interface IBoardGeometry {
  advance(node: AnyBoardNode, direction: AnyDirection): AnyBoardNode;
  isInBounds(node: AnyBoardNode): boolean;
}

/** «ConcreteStrategy» — the original rectangular-grid board math. */
export class RectangularBoardGeometry implements IBoardGeometry {
  constructor(private readonly size: BoardSize) {}

  advance(node: AnyBoardNode, direction: AnyDirection): AnyBoardNode {
    const { row, col } = node as BoardNode;
    switch (direction as CardinalDirection) {
      case 'up':
        return { row: row - 1, col };
      case 'down':
        return { row: row + 1, col };
      case 'left':
        return { row, col: col - 1 };
      case 'right':
        return { row, col: col + 1 };
      default:
        throw new LevelValidationError(
          `Direction "${direction}" is not valid on a rectangular board`,
        );
    }
  }

  isInBounds(node: AnyBoardNode): boolean {
    const { row, col } = node as BoardNode;
    return row >= 0 && row < this.size.rows && col >= 0 && col < this.size.cols;
  }
}

/**
 * «ConcreteStrategy» — a hexagonal board of pointy-top cells, addressed with
 * axial coordinates (q, r) and shaped as a hexagon of the given radius
 * (a cell is in bounds when max(|q|, |r|, |q+r|) <= radius).
 *
 * Direction vectors follow the standard pointy-top axial layout
 * (see redblobgames.com/grids/hexagons):
 *   N=(0,-1) NE=(+1,-1) SE=(+1,0) S=(0,+1) SW=(-1,+1) NW=(-1,0)
 */
export class HexBoardGeometry implements IBoardGeometry {
  private static readonly VECTORS: Record<HexDirection, [number, number]> = {
    n: [0, -1],
    ne: [1, -1],
    se: [1, 0],
    s: [0, 1],
    sw: [-1, 1],
    nw: [-1, 0],
  };

  constructor(private readonly radius: number) {}

  advance(node: AnyBoardNode, direction: AnyDirection): AnyBoardNode {
    const { q, r } = node as HexBoardNode;
    const vector = HexBoardGeometry.VECTORS[direction as HexDirection];
    if (!vector) {
      throw new LevelValidationError(
        `Direction "${direction}" is not valid on a hexagonal board`,
      );
    }
    const [dq, dr] = vector;
    return { q: q + dq, r: r + dr };
  }

  isInBounds(node: AnyBoardNode): boolean {
    const { q, r } = node as HexBoardNode;
    const s = -q - r;
    return Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= this.radius;
  }
}

/** Factory: picks the geometry strategy for a given board shape. */
export function createBoardGeometry(
  shape: BoardShape,
  boardSize: AnyBoardSize,
): IBoardGeometry {
  if (shape === 'hex') {
    return new HexBoardGeometry((boardSize as HexBoardSize).radius);
  }
  return new RectangularBoardGeometry(boardSize as BoardSize);
}
