import { IPasswordHasher } from '../ports/password-hasher';
import { Email } from '../value-objects/email.vo';
import { PasswordHash } from '../value-objects/password-hash.vo';
import { UserId } from '../value-objects/user-id.vo';

/**
 * «Aggregate Root» User — represents a registered player identity.
 *
 * Design note: verify() receives IPasswordHasher as a parameter instead of
 * importing bcrypt directly. This preserves the dependency rule: the domain
 * entity stays pure TypeScript; the hashing library lives in infrastructure.
 * The application layer passes the hasher when calling verify() (DIP).
 */
export class User {
  private constructor(
    private readonly _id: UserId,
    private _email: Email,
    private _pass: PasswordHash,
    private _username: string,
  ) {}

  static create(
    email: Email,
    pass: PasswordHash,
    username: string,
    id?: UserId,
  ): User {
    return new User(id ?? UserId.create(), email, pass, username);
  }

  static reconstitute(
    id: UserId,
    email: Email,
    pass: PasswordHash,
    username: string,
  ): User {
    return new User(id, email, pass, username);
  }

  async verify(
    plainPassword: string,
    hasher: IPasswordHasher,
  ): Promise<boolean> {
    return hasher.compare(plainPassword, this._pass);
  }

  get id(): UserId {
    return this._id;
  }

  get email(): Email {
    return this._email;
  }

  get pass(): PasswordHash {
    return this._pass;
  }

  get username(): string {
    return this._username;
  }
}
