export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidEmailError extends DomainError {
  constructor(raw: string) {
    super(`"${raw}" is not a valid email address`);
  }
}

export class EmailAlreadyInUseError extends DomainError {
  constructor(email: string) {
    super(`Email "${email}" is already registered`);
  }
}

export class UserNotFoundError extends DomainError {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Invalid email or password');
  }
}

export class LevelValidationError extends DomainError {
  constructor(reason: string) {
    super(`Level definition is invalid: ${reason}`);
  }
}

export class LevelNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Level not found: ${id}`);
  }
}

export class UnauthorizedError extends DomainError {
  constructor() {
    super('Authentication required');
  }
}
