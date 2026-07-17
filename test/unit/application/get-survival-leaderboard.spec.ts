import { GetSurvivalLeaderboardUseCase } from '../../../src/application/use-cases/get-survival-leaderboard.use-case';
import { ScoreEntry } from '../../../src/domain/entities/score-entry.entity';
import { User } from '../../../src/domain/entities/user.entity';
import { ILeaderboardRepository } from '../../../src/domain/ports/leaderboard.repository';
import { IUserRepository } from '../../../src/domain/ports/user.repository';
import { MangoScore } from '../../../src/domain/services/score-calculation.strategy';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { GameMode } from '../../../src/domain/value-objects/game-mode.vo';
import { LevelId } from '../../../src/domain/value-objects/level-id.vo';
import { PasswordHash } from '../../../src/domain/value-objects/password-hash.vo';
import { Score } from '../../../src/domain/value-objects/score.vo';
import { UserId } from '../../../src/domain/value-objects/user-id.vo';

const strategy = new MangoScore();
const survivalLevel = LevelId.create('-1');

const makeUser = (id: string, username: string) =>
  User.create(
    Email.create(`guest-${id}@guest.local`),
    PasswordHash.fromHash('$hash'),
    username,
    UserId.create(id),
  );

const makeUserRepo = (users: User[]): IUserRepository => ({
  byEmail: jest.fn(),
  byId: jest.fn(),
  byIds: jest.fn().mockResolvedValue(users),
  save: jest.fn(),
});

const makeLbRepo = (survivalEntries: ScoreEntry[]): ILeaderboardRepository => ({
  byLevel: jest.fn().mockResolvedValue([]),
  bySurvival: jest.fn().mockResolvedValue(survivalEntries),
  add: jest.fn(),
});

describe('GetSurvivalLeaderboardUseCase', () => {
  it('should_sum_mangos_across_every_run_not_just_the_best', async () => {
    // Arrange — alice has two runs (5s → 3 stars, 60s → 1 star = 4 total)
    const alice = UserId.create('alice-id');
    const entries = [
      ScoreEntry.create(
        alice,
        survivalLevel,
        Score.create(0, 5_000),
        GameMode.survival(),
      ),
      ScoreEntry.create(
        alice,
        survivalLevel,
        Score.create(0, 60_000),
        GameMode.survival(),
      ),
    ];
    const repo = makeLbRepo(entries);
    const userRepo = makeUserRepo([makeUser('alice-id', 'Alice')]);
    const useCase = new GetSurvivalLeaderboardUseCase(repo, userRepo, strategy);

    // Act
    const result = await useCase.execute({});

    // Assert
    expect(result.top).toHaveLength(1);
    expect(result.top[0].displayName).toBe('Alice');
    expect(result.top[0].mangos).toBe(4);
    expect(result.top[0].runs).toBe(2);
    expect(result.top[0].rank).toBe(1);
  });

  it('should_rank_players_by_total_mangos_descending', async () => {
    const alice = UserId.create('alice-id');
    const bob = UserId.create('bob-id');
    const entries = [
      ScoreEntry.create(
        alice,
        survivalLevel,
        Score.create(0, 5_000),
        GameMode.survival(),
      ),
      ScoreEntry.create(
        bob,
        survivalLevel,
        Score.create(0, 60_000),
        GameMode.survival(),
      ),
    ];
    const repo = makeLbRepo(entries);
    const userRepo = makeUserRepo([
      makeUser('alice-id', 'Alice'),
      makeUser('bob-id', 'Bob'),
    ]);
    const useCase = new GetSurvivalLeaderboardUseCase(repo, userRepo, strategy);

    const result = await useCase.execute({});

    expect(result.top[0].displayName).toBe('Alice');
    expect(result.top[1].displayName).toBe('Bob');
  });

  it('should_return_the_real_rank_for_a_player_outside_the_top', async () => {
    const entries = Array.from({ length: 12 }, (_, i) =>
      ScoreEntry.create(
        UserId.create(`p${i}`),
        survivalLevel,
        // p0 fastest (most stars) .. p11 slowest (fewest stars)
        Score.create(0, i * 1_000),
        GameMode.survival(),
      ),
    );
    const repo = makeLbRepo(entries);
    const userRepo = makeUserRepo(
      entries.map((e) => makeUser(e.userId.value, e.userId.value)),
    );
    const useCase = new GetSurvivalLeaderboardUseCase(repo, userRepo, strategy);

    const result = await useCase.execute({ currentUserId: 'p11' });

    expect(result.top).toHaveLength(10);
    expect(result.top.some((e) => e.userId === 'p11')).toBe(false);
    expect(result.me?.userId).toBe('p11');
    expect(result.me?.rank).toBe(12);
    expect(result.me?.isMe).toBe(true);
  });

  it('should_return_empty_top_and_null_me_when_no_survival_runs_exist', async () => {
    const repo = makeLbRepo([]);
    const userRepo = makeUserRepo([]);
    const useCase = new GetSurvivalLeaderboardUseCase(repo, userRepo, strategy);

    const result = await useCase.execute({});

    expect(result.top).toEqual([]);
    expect(result.me).toBeNull();
  });
});
