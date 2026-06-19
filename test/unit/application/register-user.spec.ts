import { RegisterUserUseCase } from '../../../src/application/use-cases/register-user.use-case';
import {
  EmailAlreadyInUseError,
  InvalidEmailError,
} from '../../../src/domain/errors/domain-error';
import { IPasswordHasher } from '../../../src/domain/ports/password-hasher';
import { IUserRepository } from '../../../src/domain/ports/user.repository';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { PasswordHash } from '../../../src/domain/value-objects/password-hash.vo';
import { User } from '../../../src/domain/entities/user.entity';

// ─── Mocks (stubs de puertos — DIP en las pruebas) ───────────────────────────
const makeUserRepo = (existingUser: User | null = null): IUserRepository => ({
  byEmail: jest.fn().mockResolvedValue(existingUser),
  byId: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
});

const makeHasher = (): IPasswordHasher => ({
  hash: jest.fn().mockResolvedValue(PasswordHash.fromHash('$2b$12$hashed')),
  compare: jest.fn().mockResolvedValue(true),
});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('RegisterUserUseCase', () => {
  it('should_register_user_when_email_is_not_taken', async () => {
    // Arrange
    const repo = makeUserRepo(null);
    const hasher = makeHasher();
    const useCase = new RegisterUserUseCase(repo, hasher);
    // Act
    const result = await useCase.execute({
      email: 'new@user.com',
      password: 'secret123',
      username: 'newuser',
    });
    // Assert
    expect(result.email).toBe('new@user.com');
    expect(result.username).toBe('newuser');
    expect(result.id).toBeDefined();
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(hasher.hash).toHaveBeenCalledWith('secret123');
  });

  it('should_throw_EmailAlreadyInUseError_when_email_exists', async () => {
    // Arrange — user already exists
    const existingUser = User.create(
      Email.create('taken@test.com'),
      PasswordHash.fromHash('$hash'),
      'existing',
    );
    const repo = makeUserRepo(existingUser);
    const hasher = makeHasher();
    const useCase = new RegisterUserUseCase(repo, hasher);
    // Act & Assert
    await expect(
      useCase.execute({
        email: 'taken@test.com',
        password: 'pw',
        username: 'dup',
      }),
    ).rejects.toThrow(EmailAlreadyInUseError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('should_throw_InvalidEmailError_when_email_format_is_wrong', async () => {
    const repo = makeUserRepo(null);
    const hasher = makeHasher();
    const useCase = new RegisterUserUseCase(repo, hasher);
    await expect(
      useCase.execute({ email: 'bad-email', password: 'pw', username: 'u' }),
    ).rejects.toThrow(InvalidEmailError);
  });
});
