import { UpdatePlayerNameUseCase } from '../../../src/application/use-cases/update-player-name.use-case';
import { User } from '../../../src/domain/entities/user.entity';
import { UserNotFoundError } from '../../../src/domain/errors/domain-error';
import { IUserRepository } from '../../../src/domain/ports/user.repository';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { PasswordHash } from '../../../src/domain/value-objects/password-hash.vo';
import { UserId } from '../../../src/domain/value-objects/user-id.vo';

const makeUser = () =>
  User.create(
    Email.create('guest-abc@guest.local'),
    PasswordHash.fromHash('$hash'),
    'Guest',
    UserId.create('user-1'),
  );

const makeRepo = (user: User | null): IUserRepository => ({
  byEmail: jest.fn(),
  byId: jest.fn().mockResolvedValue(user),
  byIds: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(undefined),
});

describe('UpdatePlayerNameUseCase', () => {
  it('should_rename_and_persist_the_user_when_it_exists', async () => {
    // Arrange
    const repo = makeRepo(makeUser());
    const useCase = new UpdatePlayerNameUseCase(repo);
    // Act
    const result = await useCase.execute({
      userId: 'user-1',
      displayName: 'NewName',
    });
    // Assert
    expect(result.username).toBe('NewName');
    expect(result.id).toBe('user-1');
    const savedUser = (repo.save as jest.Mock).mock.calls[0][0] as User;
    expect(savedUser.username).toBe('NewName');
  });

  it('should_throw_UserNotFoundError_when_user_does_not_exist', async () => {
    // Arrange
    const repo = makeRepo(null);
    const useCase = new UpdatePlayerNameUseCase(repo);
    // Act & Assert
    await expect(
      useCase.execute({ userId: 'missing-user', displayName: 'X' }),
    ).rejects.toThrow(UserNotFoundError);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
