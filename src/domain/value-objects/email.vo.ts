import { InvalidEmailError } from '../errors/domain-error';

/**
 * «Value Object» Email — immutable, self-validating email address.
 *
 * Validation happens at construction time via the static factory (fail-fast).
 * The domain never holds an invalid Email instance.
 */
export class Email {
  private static readonly PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(private readonly _value: string) {}

  static create(raw: string): Email {
    const normalised = raw.trim().toLowerCase();
    if (!Email.PATTERN.test(normalised)) {
      throw new InvalidEmailError(raw);
    }
    return new Email(normalised);
  }

  isValid(): boolean {
    return Email.PATTERN.test(this._value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
