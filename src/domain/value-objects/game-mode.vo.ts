import { InvalidGameModeError } from '../errors/domain-error';

const VALUES = ['campaign', 'survival'] as const;
type GameModeValue = (typeof VALUES)[number];

/**
 * «Value Object» GameMode — distinguishes a campaign run from a survival run.
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

  get value(): GameModeValue {
    return this._value;
  }

  isSurvival(): boolean {
    return this._value === 'survival';
  }

  equals(other: GameMode): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
