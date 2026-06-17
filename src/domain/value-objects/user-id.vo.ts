import { v4 as uuidv4 } from 'uuid';

/**
 * «Value Object» UserId — typed identifier that avoids primitive obsession.
 * Immutable; equality by value (ISP: exposes only what is needed).
 */
export class UserId {
  private constructor(private readonly _value: string) {}

  static create(value?: string): UserId {
    return new UserId(value ?? uuidv4());
  }

  get value(): string {
    return this._value;
  }

  equals(other: UserId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
