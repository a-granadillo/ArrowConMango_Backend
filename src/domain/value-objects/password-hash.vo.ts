/**
 * «Value Object» PasswordHash — wraps an already-hashed password string.
 *
 * This VO never receives a plain-text password: hashing is delegated to
 * IPasswordHasher (infrastructure). The domain only stores and exposes the
 * opaque hash, keeping bcrypt/argon2 out of the domain layer (DIP).
 */
export class PasswordHash {
  private constructor(private readonly _hash: string) {}

  static fromHash(hash: string): PasswordHash {
    if (!hash || hash.trim() === '') {
      throw new Error('Password hash cannot be empty');
    }
    return new PasswordHash(hash);
  }

  get hash(): string {
    return this._hash;
  }

  equals(other: PasswordHash): boolean {
    return this._hash === other._hash;
  }

  toString(): string {
    return '[PasswordHash]';
  }
}
