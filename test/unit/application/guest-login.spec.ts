import { GuestLoginUseCase } from '../../../src/application/use-cases/guest-login.use-case';
import { User } from '../../../src/domain/entities/user.entity';
import { IPasswordHasher } from '../../../src/domain/ports/password-hasher';
import { ITokenService } from '../../../src/domain/ports/token.service';
import { IUserRepository } from '../../../src/domain/ports/user.repository';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { PasswordHash } from '../../../src/domain/value-objects/password-hash.vo';

const GUEST_UUID = '3f4a1e2b-5c6d-4e7f-8a9b-0c1d2e3f4a5b';

const makeGuestUser = () =>
  User.create(
    Email.create(`guest-${GUEST_UUID}@guest.local`),
    PasswordHash.fromHash('$hash'),
    'Guest',
  );

const makeRepo = (user: User | null): IUserRepository => ({
  byEmail: jest.fn().mockResolvedValue(user),
  byId: jest.fn().mockResolvedValue(null),
  save: jest.fn(),
});

const makeHasher = (): IPasswordHasher => ({
  hash: jest.fn().mockResolvedValue(PasswordHash.fromHash('$hashed-uuid')),
  compare: jest.fn(),
});

const makeTokenSvc = (): ITokenService => ({
  sign: jest.fn().mockReturnValue('jwt.token.here'),
  verify: jest.fn(),
});

describe('GuestLoginUseCase', () => {
  it('should_return_jwt_when_guest_exists', async () => {
    // Arrange
    const repo = makeRepo(makeGuestUser());
    const useCase = new GuestLoginUseCase(repo, makeHasher(), makeTokenSvc());
    // Act
    const result = await useCase.execute({ uuid: GUEST_UUID });
    // Assert
    expect(result.token).toBe('jwt.token.here');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('should_create_user_and_return_jwt_when_guest_is_new', async () => {
    // Arrange
    const repo = makeRepo(null);
    const useCase = new GuestLoginUseCase(repo, makeHasher(), makeTokenSvc());
    // Act
    const result = await useCase.execute({ uuid: GUEST_UUID });
    // Assert
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(result.token).toBe('jwt.token.here');
  });

  it('should_use_provided_displayName_when_creating_a_new_guest', async () => {
    // Arrange
    const repo = makeRepo(null);
    const useCase = new GuestLoginUseCase(repo, makeHasher(), makeTokenSvc());
    // Act
    await useCase.execute({ uuid: GUEST_UUID, displayName: 'MangoLoco_42' });
    // Assert
    const savedUser = (repo.save as jest.Mock).mock.calls[0][0] as User;
    expect(savedUser.username).toBe('MangoLoco_42');
  });

  it('should_default_to_Guest_when_no_displayName_is_provided_for_a_new_guest', async () => {
    // Arrange
    const repo = makeRepo(null);
    const useCase = new GuestLoginUseCase(repo, makeHasher(), makeTokenSvc());
    // Act
    await useCase.execute({ uuid: GUEST_UUID });
    // Assert
    const savedUser = (repo.save as jest.Mock).mock.calls[0][0] as User;
    expect(savedUser.username).toBe('Guest');
  });

  it('should_ignore_displayName_when_guest_already_exists', async () => {
    // Arrange — existing guest is already named 'ExistingName'
    const repo = makeRepo(makeGuestUser());
    const useCase = new GuestLoginUseCase(repo, makeHasher(), makeTokenSvc());
    // Act
    await useCase.execute({ uuid: GUEST_UUID, displayName: 'NewName' });
    // Assert — find-or-create: no save happens, so no rename either
    expect(repo.save).not.toHaveBeenCalled();
  });
});
