import { DataSource } from 'typeorm';
import { TypeOrmUserRepository } from '../../src/infrastructure/persistence/typeorm-user.repository';
import { TypeOrmProgressRepository } from '../../src/infrastructure/persistence/typeorm-progress.repository';
import { TypeOrmLevelRepository } from '../../src/infrastructure/persistence/typeorm-level.repository';
import { TypeOrmLeaderboardRepository } from '../../src/infrastructure/persistence/typeorm-leaderboard.repository';
import { User } from '../../src/domain/entities/user.entity';
import { PlayerProgress } from '../../src/domain/entities/player-progress.entity';
import { LevelDefinition } from '../../src/domain/entities/level-definition.entity';
import { ScoreEntry } from '../../src/domain/entities/score-entry.entity';
import { Email } from '../../src/domain/value-objects/email.vo';
import { PasswordHash } from '../../src/domain/value-objects/password-hash.vo';
import { UserId } from '../../src/domain/value-objects/user-id.vo';
import { LevelId } from '../../src/domain/value-objects/level-id.vo';
import { Score } from '../../src/domain/value-objects/score.vo';
import { UserOrmEntity } from '../../src/infrastructure/orm/user.orm-entity';
import { PlayerProgressOrmEntity } from '../../src/infrastructure/orm/progress.orm-entity';
import { LevelDefinitionOrmEntity } from '../../src/infrastructure/orm/level.orm-entity';
import { ScoreEntryOrmEntity } from '../../src/infrastructure/orm/score-entry.orm-entity';

let ds: DataSource;

beforeAll(async () => {
  ds = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [
      UserOrmEntity,
      PlayerProgressOrmEntity,
      LevelDefinitionOrmEntity,
      ScoreEntryOrmEntity,
    ],
    synchronize: true,
  });
  await ds.initialize();
});

afterAll(async () => {
  await ds.destroy();
});

const makeUserRepo = () =>
  new TypeOrmUserRepository(ds.getRepository(UserOrmEntity));
const makeProgressRepo = () =>
  new TypeOrmProgressRepository(ds.getRepository(PlayerProgressOrmEntity));
const makeLevelRepo = () =>
  new TypeOrmLevelRepository(ds.getRepository(LevelDefinitionOrmEntity));
const makeLeaderboardRepo = () =>
  new TypeOrmLeaderboardRepository(ds.getRepository(ScoreEntryOrmEntity));

const VALID_NODES = [
  {
    id: 'n1',
    position: [0, 0] as [number, number],
    type: 'arrow' as const,
    direction: 'UP' as const,
  },
  { id: 'n2', position: [1, 0] as [number, number], type: 'exit' as const },
];

// ─── UserRepository ────────────────────────────────────────────────────────

describe('TypeOrmUserRepository', () => {
  it('should_persist_and_find_user_by_email', async () => {
    // Arrange
    const repo = makeUserRepo();
    const user = User.create(
      Email.create('integration@test.com'),
      PasswordHash.fromHash('$2b$12$hashedvalue'),
      'IntegrationUser',
    );
    // Act
    await repo.save(user);
    const found = await repo.byEmail(Email.create('integration@test.com'));
    // Assert
    expect(found).not.toBeNull();
    expect(found!.username).toBe('IntegrationUser');
    expect(found!.email.value).toBe('integration@test.com');
  });

  it('should_return_null_when_email_not_found', async () => {
    const repo = makeUserRepo();
    const result = await repo.byEmail(Email.create('nobody@test.com'));
    expect(result).toBeNull();
  });

  it('should_persist_and_find_user_by_id', async () => {
    // Arrange
    const repo = makeUserRepo();
    const user = User.create(
      Email.create('byid@test.com'),
      PasswordHash.fromHash('$2b$12$hashedvalue2'),
      'ByIdUser',
    );
    await repo.save(user);
    // Act
    const found = await repo.byId(user.id);
    // Assert
    expect(found).not.toBeNull();
    expect(found!.id.value).toBe(user.id.value);
  });
});

// ─── ProgressRepository ────────────────────────────────────────────────────

describe('TypeOrmProgressRepository', () => {
  it('should_persist_and_retrieve_progress', async () => {
    // Arrange
    const repo = makeProgressRepo();
    const userId = UserId.create();
    const progress = PlayerProgress.create(userId);
    progress.markCompleted(LevelId.create('lvl-1'), Score.create(3, 10_000));
    // Act
    await repo.save(progress);
    const found = await repo.byUser(userId);
    // Assert
    expect(found).not.toBeNull();
    expect(found!.completed.has('lvl-1')).toBe(true);
    expect(found!.bestFor(LevelId.create('lvl-1'))?.moves).toBe(3);
  });

  it('should_preserve_idempotent_merge_after_upsert', async () => {
    // Arrange
    const repo = makeProgressRepo();
    const userId = UserId.create();
    const progress = PlayerProgress.create(userId);
    progress.markCompleted(LevelId.create('lvl-a'), Score.create(5, 20_000));
    await repo.save(progress);

    // Act — save again with better score (idempotent upsert)
    const progress2 = PlayerProgress.create(userId);
    progress2.markCompleted(LevelId.create('lvl-a'), Score.create(2, 5_000));
    const existing = await repo.byUser(userId);
    existing!.merge(progress2);
    await repo.save(existing!);

    const found = await repo.byUser(userId);
    // Assert — best score updated
    expect(found!.bestFor(LevelId.create('lvl-a'))?.moves).toBe(2);
  });

  it('should_return_null_when_user_has_no_progress', async () => {
    const repo = makeProgressRepo();
    const result = await repo.byUser(UserId.create());
    expect(result).toBeNull();
  });

  it('should_persist_and_retrieve_current_level', async () => {
    // Arrange
    const repo = makeProgressRepo();
    const userId = UserId.create();
    const progress = PlayerProgress.reconstitute(userId, [], {}, 4);
    // Act
    await repo.save(progress);
    const found = await repo.byUser(userId);
    // Assert
    expect(found!.currentLevel).toBe(4);
  });
});

// ─── LevelRepository ───────────────────────────────────────────────────────

describe('TypeOrmLevelRepository', () => {
  it('should_upsert_and_retrieve_all_levels', async () => {
    // Arrange
    const repo = makeLevelRepo();
    const level = LevelDefinition.create(
      VALID_NODES,
      [['n1', 'n2']],
      {},
      LevelId.create('test-level-1'),
    );
    // Act
    await repo.upsert(level);
    const all = await repo.getAll();
    // Assert
    const found = all.find((l) => l.id.value === 'test-level-1');
    expect(found).toBeDefined();
    expect(found!.nodes).toHaveLength(2);
  });

  it('should_retrieve_level_by_id', async () => {
    // Arrange
    const repo = makeLevelRepo();
    const levelId = LevelId.create('test-level-2');
    const level = LevelDefinition.create(VALID_NODES, [], {}, levelId);
    await repo.upsert(level);
    // Act
    const found = await repo.getById(levelId);
    // Assert
    expect(found).not.toBeNull();
    expect(found!.id.value).toBe('test-level-2');
  });

  it('should_return_null_when_level_not_found', async () => {
    const repo = makeLevelRepo();
    const result = await repo.getById(LevelId.create('nonexistent'));
    expect(result).toBeNull();
  });
});

// ─── LeaderboardRepository ─────────────────────────────────────────────────

describe('TypeOrmLeaderboardRepository', () => {
  it('should_return_top_entries_ordered_by_best_score', async () => {
    // Arrange
    const repo = makeLeaderboardRepo();
    const levelId = LevelId.create('leaderboard-level-1');
    const entries = [
      ScoreEntry.create(UserId.create('u1'), levelId, Score.create(10, 30_000)),
      ScoreEntry.create(UserId.create('u2'), levelId, Score.create(3, 5_000)),
      ScoreEntry.create(UserId.create('u3'), levelId, Score.create(7, 15_000)),
    ];
    for (const e of entries) await repo.add(e);
    // Act
    const top = await repo.top(levelId, 2);
    // Assert
    expect(top).toHaveLength(2);
    // Best score = fewest moves first (ASC)
    expect(top[0].userId.value).toBe('u2');
    expect(top[1].userId.value).toBe('u3');
  });

  it('should_persist_score_entry_with_correct_data', async () => {
    // Arrange
    const repo = makeLeaderboardRepo();
    const levelId = LevelId.create('persist-level');
    const userId = UserId.create('persist-user');
    const entry = ScoreEntry.create(userId, levelId, Score.create(4, 12_000));
    // Act
    await repo.add(entry);
    const top = await repo.top(levelId, 10);
    // Assert
    expect(top).toHaveLength(1);
    expect(top[0].score.moves).toBe(4);
    expect(top[0].score.timeMs).toBe(12_000);
  });
});
