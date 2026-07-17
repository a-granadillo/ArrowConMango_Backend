import { GetGlobalLeaderboardUseCase } from '../../../src/application/use-cases/get-global-leaderboard.use-case';
import { PlayerProgress } from '../../../src/domain/entities/player-progress.entity';
import { User } from '../../../src/domain/entities/user.entity';
import { IProgressRepository } from '../../../src/domain/ports/progress.repository';
import { IUserRepository } from '../../../src/domain/ports/user.repository';
import { MangoScore } from '../../../src/domain/services/score-calculation.strategy';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { LevelId } from '../../../src/domain/value-objects/level-id.vo';
import { PasswordHash } from '../../../src/domain/value-objects/password-hash.vo';
import { Score } from '../../../src/domain/value-objects/score.vo';
import { UserId } from '../../../src/domain/value-objects/user-id.vo';

const strategy = new MangoScore();

const makeUser = (id: string, username: string) =>
  User.create(
    Email.create(`guest-${id}@guest.local`),
    PasswordHash.fromHash('$hash'),
    username,
    UserId.create(id),
  );

const makeProgressRepo = (all: PlayerProgress[]): IProgressRepository => ({
  byUser: jest.fn(),
  save: jest.fn(),
  all: jest.fn().mockResolvedValue(all),
});

const makeUserRepo = (users: User[]): IUserRepository => ({
  byEmail: jest.fn(),
  byId: jest.fn(),
  byIds: jest.fn().mockResolvedValue(users),
  save: jest.fn(),
});

describe('GetGlobalLeaderboardUseCase', () => {
  it('should_rank_players_by_total_mangos_descending', async () => {
    // Arrange — alice: 1 level at 5s (3 stars); bob: 2 levels at 50s each (1 star each = 2)
    const alice = makeUser('alice-id', 'Alice');
    const bob = makeUser('bob-id', 'Bob');

    const aliceProgress = PlayerProgress.create(UserId.create('alice-id'));
    aliceProgress.markCompleted(
      LevelId.create('1'),
      Score.create(0, 5_000),
      strategy,
    );

    const bobProgress = PlayerProgress.create(UserId.create('bob-id'));
    bobProgress.markCompleted(
      LevelId.create('1'),
      Score.create(0, 50_000),
      strategy,
    );
    bobProgress.markCompleted(
      LevelId.create('2'),
      Score.create(0, 50_000),
      strategy,
    );

    const progressRepo = makeProgressRepo([aliceProgress, bobProgress]);
    const userRepo = makeUserRepo([alice, bob]);
    const useCase = new GetGlobalLeaderboardUseCase(
      progressRepo,
      userRepo,
      strategy,
    );

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].displayName).toBe('Alice');
    expect(result[0].mangos).toBe(3);
    expect(result[0].rank).toBe(1);
    expect(result[1].displayName).toBe('Bob');
    expect(result[1].mangos).toBe(2);
    expect(result[1].levelsCompleted).toBe(2);
  });

  it('should_flag_isMe_for_the_requesting_user', async () => {
    // Arrange
    const alice = makeUser('alice-id', 'Alice');
    const aliceProgress = PlayerProgress.create(UserId.create('alice-id'));
    const progressRepo = makeProgressRepo([aliceProgress]);
    const userRepo = makeUserRepo([alice]);
    const useCase = new GetGlobalLeaderboardUseCase(
      progressRepo,
      userRepo,
      strategy,
    );

    // Act
    const result = await useCase.execute({ currentUserId: 'alice-id' });

    // Assert
    expect(result[0].isMe).toBe(true);
  });

  it('should_respect_the_top_limit', async () => {
    // Arrange
    const users = Array.from({ length: 5 }, (_, i) =>
      makeUser(`user-${i}`, `User${i}`),
    );
    const progresses = users.map((u) => PlayerProgress.create(u.id));
    const progressRepo = makeProgressRepo(progresses);
    const userRepo = makeUserRepo(users);
    const useCase = new GetGlobalLeaderboardUseCase(
      progressRepo,
      userRepo,
      strategy,
    );

    // Act
    const result = await useCase.execute({ top: 2 });

    // Assert
    expect(result).toHaveLength(2);
  });
});
