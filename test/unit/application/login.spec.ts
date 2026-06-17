import { LoginUseCase } from '../../../src/application/use-cases/login.use-case';
import { InvalidCredentialsError } from '../../../src/domain/errors/domain-error';
import { User } from '../../../src/domain/entities/user.entity';
import { IPasswordHasher } from '../../../src/domain/ports/password-hasher';
import { ITokenService } from '../../../src/domain/ports/token.service';
import { IUserRepository } from '../../../src/domain/ports/user.repository';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { PasswordHash } from '../../../src/domain/value-objects/password-hash.vo';
import { UserId } from '../../../src/domain/value-objects/user-id.vo';

const makeUser = () =>
  User.create(Email.create('player@game.com'), PasswordHash.fromHash('$hash'), 'player');

const makeRepo = (user: User | null): IUserRepository => ({
  byEmail: jest.fn().mockResolvedValue(user),
  byId: jest.fn().mockResolvedValue(null),
  save: jest.fn(),
});

const makeHasher = (valid: boolean): IPasswordHasher => ({
  hash: jest.fn(),
  compare: jest.fn().mockResolvedValue(valid),
});

const makeTokenSvc = (): ITokenService => ({
  sign: jest.fn().mockReturnValue('jwt.token.here'),
  verify: jest.fn(),
});

describe('LoginUseCase', () => {
  it('should_return_jwt_when_credentials_are_valid', async () => {
    // Arrange
    const user = makeUser();
    const useCase = new LoginUseCase(makeRepo(user), makeHasher(true), makeTokenSvc());
    // Act
    const result = await useCase.execute({ email: 'player@game.com', password: 'correct' });
    // Assert
    expect(result.token).toBe('jwt.token.here');
  });

  it('should_throw_InvalidCredentialsError_when_user_not_found', async () => {
    const useCase = new LoginUseCase(makeRepo(null), makeHasher(true), makeTokenSvc());
    await expect(
      useCase.execute({ email: 'ghost@game.com', password: 'pw' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('should_throw_InvalidCredentialsError_when_password_is_wrong', async () => {
    const user = makeUser();
    const useCase = new LoginUseCase(makeRepo(user), makeHasher(false), makeTokenSvc());
    await expect(
      useCase.execute({ email: 'player@game.com', password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });
});
