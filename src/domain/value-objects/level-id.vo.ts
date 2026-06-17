import { v4 as uuidv4 } from 'uuid';

/**
 * «Value Object» LevelId — typed, immutable level identifier.
 */
export class LevelId {
  private constructor(private readonly _value: string) {}

  static create(value?: string): LevelId {
    return new LevelId(value ?? uuidv4());
  }

  get value(): string {
    return this._value;
  }

  equals(other: LevelId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
