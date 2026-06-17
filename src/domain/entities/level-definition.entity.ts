import { LevelValidationError } from '../errors/domain-error';
import { LevelId } from '../value-objects/level-id.vo';

export interface NodeDefinition {
  id: string;
  position: [number, number];
  type: 'arrow' | 'wall' | 'empty' | 'exit';
  direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  shape?: string;
}

export interface LevelRules {
  timeLimitSeconds?: number;
  allowRotation?: boolean;
  hasCollectables?: boolean;
}

/**
 * «Aggregate Root» LevelDefinition — immutable blueprint of a puzzle level.
 *
 * Stores the graph representation (nodes + edges) so levels can have
 * arbitrary shapes (RF-B-04). validate() ensures graph integrity before
 * persistence, allowing the admin to add levels without updating the app.
 *
 * validate() checks:
 *  - All edge endpoints reference existing node ids.
 *  - There is at least one exit node (otherwise the puzzle is unsolvable).
 *  - There is at least one arrow node (otherwise the puzzle has no content).
 */
export class LevelDefinition {
  private constructor(
    private readonly _id: LevelId,
    private readonly _nodes: NodeDefinition[],
    private readonly _edges: [string, string][],
    private readonly _rules: LevelRules,
    private readonly _version: number,
  ) {}

  static create(
    nodes: NodeDefinition[],
    edges: [string, string][],
    rules: LevelRules,
    id?: LevelId,
    version = 1,
  ): LevelDefinition {
    return new LevelDefinition(id ?? LevelId.create(), nodes, edges, rules, version);
  }

  static reconstitute(
    id: LevelId,
    nodes: NodeDefinition[],
    edges: [string, string][],
    rules: LevelRules,
    version: number,
  ): LevelDefinition {
    return new LevelDefinition(id, nodes, edges, rules, version);
  }

  validate(): boolean {
    const nodeIds = new Set(this._nodes.map((n) => n.id));

    for (const [a, b] of this._edges) {
      if (!nodeIds.has(a)) {
        throw new LevelValidationError(`Edge references unknown node "${a}"`);
      }
      if (!nodeIds.has(b)) {
        throw new LevelValidationError(`Edge references unknown node "${b}"`);
      }
    }

    const hasExit = this._nodes.some((n) => n.type === 'exit');
    if (!hasExit) {
      throw new LevelValidationError('Level must have at least one exit node');
    }

    const hasArrow = this._nodes.some((n) => n.type === 'arrow');
    if (!hasArrow) {
      throw new LevelValidationError('Level must have at least one arrow node');
    }

    return true;
  }

  get id(): LevelId {
    return this._id;
  }

  get nodes(): NodeDefinition[] {
    return [...this._nodes];
  }

  get edges(): [string, string][] {
    return [...this._edges];
  }

  get rules(): LevelRules {
    return { ...this._rules };
  }

  get version(): number {
    return this._version;
  }
}
