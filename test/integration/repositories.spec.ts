import { DataSource } from 'typeorm';
import { TypeOrmUserRepository } from '../../src/infrastructure/persistence/typeorm-user.repository';
import { TypeOrmProgressRepository } from '../../src/infrastructure/persistence/typeorm-progress.repository';
import { TypeOrmLevelRepository } from '../../src/infrastructure/persistence/typeorm-level.repository';
import { TypeOrmLeaderboardRepository } from '../../src/infrastructure/persistence/typeorm-leaderboard.repository';
import { User } from '../../src/domain/entities/user.entity';
import { PlayerProgress } from '../../src/domain/entities/player-progress.entity';
import {
  ArrowDefinition,
  LevelDefinition,
} from '../../src/domain/entities/level-definition.entity';
import { ScoreEntry } from '../../src/domain/entities/score-entry.entity';
import { MixedScore } from '../../src/domain/services/score-calculation.strategy';
import { Email } from '../../src/domain/value-objects/email.vo';
import { GameMode } from '../../src/domain/value-objects/game-mode.vo';
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

const BOARD_SIZE = { rows: 4, cols: 4 };
const VALID_ARROWS: ArrowDefinition[] = [
  {
    id: 'a1',
    startNode: { row: 0, col: 0 },
    trajectory: { segments: [{ direction: 'right', length: 2 }] },
    isSwitchable: false,
  },
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
  const strategy = new MixedScore();

  it('should_persist_and_retrieve_progress', async () => {
    // Arrange
    const repo = makeProgressRepo();
    const userId = UserId.create();
    const progress = PlayerProgress.create(userId);
    progress.markCompleted(
      LevelId.create('lvl-1'),
      Score.create(3, 10_000),
      strategy,
    );
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
    progress.markCompleted(
      LevelId.create('lvl-a'),
      Score.create(5, 20_000),
      strategy,
    );
    await repo.save(progress);

    // Act — save again with better score (idempotent upsert)
    const progress2 = PlayerProgress.create(userId);
    progress2.markCompleted(
      LevelId.create('lvl-a'),
      Score.create(2, 5_000),
      strategy,
    );
    const existing = await repo.byUser(userId);
    existing!.merge(progress2, strategy);
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
      'Level 1',
      'Easy',
      BOARD_SIZE,
      VALID_ARROWS,
      {},
      LevelId.create('test-level-1'),
    );
    // Act
    await repo.upsert(level);
    const all = await repo.getAll();
    // Assert
    const found = all.find((l) => l.id.value === 'test-level-1');
    expect(found).toBeDefined();
    expect(found!.arrows).toHaveLength(1);
    expect(found!.authorId).toBeNull();
  });

  it('should_retrieve_level_by_id', async () => {
    // Arrange
    const repo = makeLevelRepo();
    const levelId = LevelId.create('test-level-2');
    const level = LevelDefinition.create(
      'Level 2',
      'Easy',
      BOARD_SIZE,
      VALID_ARROWS,
      {},
      levelId,
    );
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

  it('should_round_trip_a_hexagonal_level_through_simple_json_columns', async () => {
    // Arrange — hex boardSize {radius} and axial startNode {q,r} live in the
    // same simple-json columns as the rectangular shape; `shape` is the only
    // new column, so this proves the extension needs no schema migration.
    const repo = makeLevelRepo();
    const levelId = LevelId.create('test-hex-level-1');
    const level = LevelDefinition.create(
      'Hex Level',
      'Easy',
      { radius: 2 },
      [
        {
          id: 'h1',
          startNode: { q: 0, r: 0 },
          trajectory: { segments: [{ direction: 'se', length: 2 }] },
          isSwitchable: false,
        },
      ],
      {},
      levelId,
      1,
      null,
      undefined,
      undefined,
      'hex',
    );
    // Act
    await repo.upsert(level);
    const found = await repo.getById(levelId);
    // Assert
    expect(found).not.toBeNull();
    expect(found!.shape).toBe('hex');
    expect(found!.boardSize).toEqual({ radius: 2 });
    expect(found!.arrows[0].startNode).toEqual({ q: 0, r: 0 });
    expect(found!.validate()).toBe(true);
  });

  it('should_default_shape_to_grid2d_for_pre_existing_rows', async () => {
    // Simulates a level persisted before the `shape` column existed —
    // sqlite's synchronize adds the column with a default, so old rows are
    // backward-compatible without a data migration.
    const repo = makeLevelRepo();
    const levelId = LevelId.create('test-legacy-level');
    const level = LevelDefinition.create(
      'Legacy',
      'Easy',
      BOARD_SIZE,
      VALID_ARROWS,
      {},
      levelId,
    );
    await repo.upsert(level);
    const found = await repo.getById(levelId);
    expect(found!.shape).toBe('grid2d');
  });
});

// ─── LeaderboardRepository ─────────────────────────────────────────────────
//
// The repository is intentionally "dumb": it filters by level and nothing
// else. Ranking (which entry is "best") is a domain decision made by
// Leaderboard.top(strategy, n) — see test/unit/domain/entities.spec.ts for
// the ranking behavior, including the regression test for the bug where
// this repository used to `ORDER BY moves ASC` in SQL, diverging from the
// domain's score-based ranking.

describe('TypeOrmLeaderboardRepository', () => {
  it('should_return_all_entries_for_a_level_unordered', async () => {
    // Arrange
    const repo = makeLeaderboardRepo();
    const levelId = LevelId.create('leaderboard-level-1');
    const entries = [
      ScoreEntry.create(
        UserId.create('u1'),
        levelId,
        Score.create(10, 30_000),
        GameMode.campaign(),
      ),
      ScoreEntry.create(
        UserId.create('u2'),
        levelId,
        Score.create(3, 5_000),
        GameMode.campaign(),
      ),
      ScoreEntry.create(
        UserId.create('u3'),
        levelId,
        Score.create(7, 15_000),
        GameMode.campaign(),
      ),
    ];
    for (const e of entries) await repo.add(e);
    // Act
    const found = await repo.byLevel(levelId);
    // Assert
    expect(found).toHaveLength(3);
    expect(found.map((e) => e.userId.value).sort()).toEqual(['u1', 'u2', 'u3']);
  });

  it('should_only_return_entries_for_the_requested_level', async () => {
    const repo = makeLeaderboardRepo();
    const levelA = LevelId.create('level-a');
    const levelB = LevelId.create('level-b');
    await repo.add(
      ScoreEntry.create(
        UserId.create('u1'),
        levelA,
        Score.create(1, 1_000),
        GameMode.campaign(),
      ),
    );
    await repo.add(
      ScoreEntry.create(
        UserId.create('u2'),
        levelB,
        Score.create(2, 2_000),
        GameMode.campaign(),
      ),
    );

    const found = await repo.byLevel(levelA);

    expect(found).toHaveLength(1);
    expect(found[0].userId.value).toBe('u1');
  });

  it('should_persist_score_entry_with_correct_data', async () => {
    // Arrange
    const repo = makeLeaderboardRepo();
    const levelId = LevelId.create('persist-level');
    const userId = UserId.create('persist-user');
    const entry = ScoreEntry.create(
      userId,
      levelId,
      Score.create(4, 12_000),
      GameMode.campaign(),
    );
    // Act
    await repo.add(entry);
    const found = await repo.byLevel(levelId);
    // Assert
    expect(found).toHaveLength(1);
    expect(found[0].score.moves).toBe(4);
    expect(found[0].score.timeMs).toBe(12_000);
  });

  it('should_exclude_survival_entries_from_byLevel', async () => {
    const repo = makeLeaderboardRepo();
    const levelId = LevelId.create('mixed-mode-level');
    await repo.add(
      ScoreEntry.create(
        UserId.create('campaign-player'),
        levelId,
        Score.create(5, 10_000),
        GameMode.campaign(),
      ),
    );
    await repo.add(
      ScoreEntry.create(
        UserId.create('survival-player'),
        levelId,
        Score.create(2, 3_000),
        GameMode.survival(),
      ),
    );

    const found = await repo.byLevel(levelId);

    expect(found).toHaveLength(1);
    expect(found[0].userId.value).toBe('campaign-player');
  });

  it('should_only_return_survival_entries_from_bySurvival', async () => {
    // Note: this in-memory DataSource is shared across tests in this file
    // (see repository is "intentionally dumb" comment above), so bySurvival
    // may include entries from other tests — assert by membership, not
    // exact length.
    const repo = makeLeaderboardRepo();
    const levelId = LevelId.create('bysurvival-level');
    await repo.add(
      ScoreEntry.create(
        UserId.create('campaign-player-bysurvival'),
        levelId,
        Score.create(5, 10_000),
        GameMode.campaign(),
      ),
    );
    await repo.add(
      ScoreEntry.create(
        UserId.create('survival-player-bysurvival'),
        levelId,
        Score.create(2, 3_000),
        GameMode.survival(),
      ),
    );

    const found = await repo.bySurvival();

    expect(found.every((e) => e.mode.value === 'survival')).toBe(true);
    expect(
      found.some((e) => e.userId.value === 'survival-player-bysurvival'),
    ).toBe(true);
    expect(
      found.some((e) => e.userId.value === 'campaign-player-bysurvival'),
    ).toBe(false);
  });

  it('should_only_return_hexagonal_entries_from_byHexagonal', async () => {
    const repo = makeLeaderboardRepo();
    const levelId = LevelId.create('byhexagonal-level');
    await repo.add(
      ScoreEntry.create(
        UserId.create('campaign-player-byhexagonal'),
        levelId,
        Score.create(5, 10_000),
        GameMode.campaign(),
      ),
    );
    await repo.add(
      ScoreEntry.create(
        UserId.create('hexagonal-player-byhexagonal'),
        levelId,
        Score.create(2, 3_000),
        GameMode.hexagonal(),
      ),
    );

    const found = await repo.byHexagonal();

    expect(found.every((e) => e.mode.value === 'hexagonal')).toBe(true);
    expect(
      found.some((e) => e.userId.value === 'hexagonal-player-byhexagonal'),
    ).toBe(true);
    expect(
      found.some((e) => e.userId.value === 'campaign-player-byhexagonal'),
    ).toBe(false);
  });

  it('should_only_return_cube3d_entries_from_byCube3d', async () => {
    const repo = makeLeaderboardRepo();
    const levelId = LevelId.create('bycube3d-level');
    await repo.add(
      ScoreEntry.create(
        UserId.create('campaign-player-bycube3d'),
        levelId,
        Score.create(5, 10_000),
        GameMode.campaign(),
      ),
    );
    await repo.add(
      ScoreEntry.create(
        UserId.create('cube3d-player-bycube3d'),
        levelId,
        Score.create(2, 3_000),
        GameMode.cube3d(),
      ),
    );

    const found = await repo.byCube3d();

    expect(found.every((e) => e.mode.value === 'cube3d')).toBe(true);
    expect(found.some((e) => e.userId.value === 'cube3d-player-bycube3d')).toBe(
      true,
    );
    expect(
      found.some((e) => e.userId.value === 'campaign-player-bycube3d'),
    ).toBe(false);
  });
});
