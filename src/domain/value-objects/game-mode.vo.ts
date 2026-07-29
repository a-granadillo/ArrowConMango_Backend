import { InvalidGameModeError } from '../errors/domain-error';

const VALUES = ['campaign', 'survival', 'hexagonal', 'cube3d'] as const;
type GameModeValue = (typeof VALUES)[number];

/**
 * «Value Object» GameMode — distinguishes a campaign run from a survival
 * run, a hexagonal-board run, or a cube3d run.
 */
export class GameMode {
  private constructor(private readonly _value: GameModeValue) {}

  static create(raw: string): GameMode {
    if (!VALUES.includes(raw as GameModeValue)) {
      throw new InvalidGameModeError(raw);
    }
    return new GameMode(raw as GameModeValue);
  }

  static campaign(): GameMode {
    return new GameMode('campaign');
  }

  static survival(): GameMode {
    return new GameMode('survival');
  }

  static hexagonal(): GameMode {
    return new GameMode('hexagonal');
  }

  static cube3d(): GameMode {
    return new GameMode('cube3d');
  }

  get value(): GameModeValue {
    return this._value;
  }

  isSurvival(): boolean {
    return this._value === 'survival';
  }

  isHexagonal(): boolean {
    return this._value === 'hexagonal';
  }

  isCube3d(): boolean {
    return this._value === 'cube3d';
  }

  /**
   * Campaign and hexagonal levels have stable, server-catalogued ids, so a
   * run there can safely update `PlayerProgress.best[levelId]`. Survival and
   * cube3d levels are procedurally generated per-run and share no stable id
   * across players/sessions — folding them into progress would either be
   * meaningless (survival has no "level") or silently corrupt an unrelated
   * level's best score if the generated id ever collided with a real one.
   */
  affectsCampaignProgress(): boolean {
    return this._value === 'campaign' || this._value === 'hexagonal';
  }

  equals(other: GameMode): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
