import { PasswordHash } from '../value-objects/password-hash.vo';

/**
 * «Port (interface)» IPasswordHasher
 *
 * Abstracts bcrypt/argon2 so the domain never imports a hashing library (DIP).
 * BcryptHasher (infrastructure layer) implements this interface.
 */
export interface IPasswordHasher {
  hash(plainText: string): Promise<PasswordHash>;
  compare(plainText: string, hash: PasswordHash): Promise<boolean>;
}
