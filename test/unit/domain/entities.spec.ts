import { LevelValidationError } from '../../../src/domain/errors/domain-error';
import { Leaderboard } from '../../../src/domain/entities/leaderboard.entity';
import {
  ArrowDefinition,
  LevelDefinition,
} from '../../../src/domain/entities/level-definition.entity';
import { PlayerProgress } from '../../../src/domain/entities/player-progress.entity';
import { ScoreEntry } from '../../../src/domain/entities/score-entry.entity';
import { User } from '../../../src/domain/entities/user.entity';
import { IPasswordHasher } from '../../../src/domain/ports/password-hasher';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { LevelId } from '../../../src/domain/value-objects/level-id.vo';
import { PasswordHash } from '../../../src/domain/value-objects/password-hash.vo';
import { Score } from '../../../src/domain/value-objects/score.vo';
import { UserId } from '../../../src/domain/value-objects/user-id.vo';

// ─── Shared helpers ──────────────────────────────────────────────────────────
const makeUser = () =>
  User.create(
    Email.create('alice@test.com'),
    PasswordHash.fromHash('$hash'),
    'alice',
  );

const makeHasher = (result: boolean): IPasswordHasher => ({
  hash: async (plain) => PasswordHash.fromHash('$hashed:' + plain),
  compare: async () => result,
});

// ─── User ─────────────────────────────────────────────────────────────────────
describe('User', () => {
  it('should_verify_password_when_hasher_returns_true', async () => {
    // Arrange
    const user = makeUser();
    const hasher = makeHasher(true);
    // Act
    const result = await user.verify('secret', hasher);
    // Assert
    expect(result).toBe(true);
  });

  it('should_reject_password_when_hasher_returns_false', async () => {
    const user = makeUser();
    const hasher = makeHasher(false);
    const result = await user.verify('wrong', hasher);
    expect(result).toBe(false);
  });
});

// ─── PlayerProgress ───────────────────────────────────────────────────────────
describe('PlayerProgress', () => {
  const uid = UserId.create('user-1');
  const lvl1 = LevelId.create('lvl-1');
  const lvl2 = LevelId.create('lvl-2');
  const lowScore = Score.create(20, 60_000);
  const highScore = Score.create(2, 5_000);

  it('should_mark_level_as_completed_when_score_submitted', () => {
    const progress = PlayerProgress.create(uid);
    progress.markCompleted(lvl1, lowScore);
    expect(progress.isCompleted(lvl1)).toBe(true);
  });

  it('should_keep_best_score_when_better_score_submitted', () => {
    const progress = PlayerProgress.create(uid);
    progress.markCompleted(lvl1, lowScore);
    progress.markCompleted(lvl1, highScore);
    expect(progress.bestFor(lvl1)!.value()).toBe(highScore.value());
  });

  it('should_not_replace_best_score_when_worse_score_submitted', () => {
    const progress = PlayerProgress.create(uid);
    progress.markCompleted(lvl1, highScore);
    progress.markCompleted(lvl1, lowScore);
    expect(progress.bestFor(lvl1)!.value()).toBe(highScore.value());
  });

  it('should_merge_progress_idempotently_when_same_data_sent_twice', () => {
    // Arrange — server has lvl1 with highScore
    const server = PlayerProgress.create(uid);
    server.markCompleted(lvl1, highScore);

    // Client sends same data twice
    const clientData = PlayerProgress.reconstitute(uid, [lvl1.value], {
      [lvl1.value]: { moves: highScore.moves, timeMs: highScore.timeMs },
    });
    server.merge(clientData);
    server.merge(clientData); // idempotent: second merge must not change anything

    // Assert — completed still has only lvl1, best is unchanged
    expect(server.completed.size).toBe(1);
    expect(server.bestFor(lvl1)!.value()).toBe(highScore.value());
  });

  it('should_union_completed_levels_when_merging', () => {
    const server = PlayerProgress.create(uid);
    server.markCompleted(lvl1, lowScore);

    const incoming = PlayerProgress.reconstitute(uid, [lvl2.value], {
      [lvl2.value]: { moves: 5, timeMs: 10_000 },
    });
    server.merge(incoming);

    expect(server.isCompleted(lvl1)).toBe(true);
    expect(server.isCompleted(lvl2)).toBe(true);
  });

  it('should_default_current_level_to_zero_when_created', () => {
    const progress = PlayerProgress.create(uid);
    expect(progress.currentLevel).toBe(0);
  });

  it('should_keep_higher_current_level_when_merging_a_lower_one', () => {
    const server = PlayerProgress.reconstitute(uid, [], {}, 3);
    const incoming = PlayerProgress.reconstitute(uid, [], {}, 2);
    server.merge(incoming);
    expect(server.currentLevel).toBe(3);
  });

  it('should_advance_current_level_when_merging_a_higher_one', () => {
    const server = PlayerProgress.reconstitute(uid, [], {}, 2);
    const incoming = PlayerProgress.reconstitute(uid, [], {}, 5);
    server.merge(incoming);
    expect(server.currentLevel).toBe(5);
  });
});

// ─── LevelDefinition ──────────────────────────────────────────────────────────
describe('LevelDefinition', () => {
  const boardSize = { rows: 4, cols: 4 };
  const validArrows: ArrowDefinition[] = [
    {
      id: 'a1',
      startNode: { row: 0, col: 0 },
      trajectory: { segments: [{ direction: 'right', length: 2 }] },
      isSwitchable: false,
    },
  ];

  it('should_validate_successfully_when_board_is_correct', () => {
    const level = LevelDefinition.create(
      'Test Level',
      'Easy',
      boardSize,
      validArrows,
      {},
    );
    expect(level.validate()).toBe(true);
  });

  it('should_throw_when_no_arrows', () => {
    const level = LevelDefinition.create('Empty', 'Easy', boardSize, [], {});
    expect(() => level.validate()).toThrow(LevelValidationError);
  });

  it('should_throw_when_arrow_ids_are_duplicated', () => {
    const level = LevelDefinition.create(
      'Dup',
      'Easy',
      boardSize,
      [validArrows[0], { ...validArrows[0] }],
      {},
    );
    expect(() => level.validate()).toThrow(LevelValidationError);
  });

  it('should_throw_when_startNode_is_outside_the_board', () => {
    const level = LevelDefinition.create(
      'Out of bounds',
      'Easy',
      boardSize,
      [
        {
          id: 'a1',
          startNode: { row: 99, col: 0 },
          trajectory: { segments: [{ direction: 'right', length: 1 }] },
          isSwitchable: false,
        },
      ],
      {},
    );
    expect(() => level.validate()).toThrow(LevelValidationError);
  });

  it('should_throw_when_a_segment_has_length_less_than_one', () => {
    const level = LevelDefinition.create(
      'Zero-length',
      'Easy',
      boardSize,
      [
        {
          id: 'a1',
          startNode: { row: 0, col: 0 },
          trajectory: { segments: [{ direction: 'right', length: 0 }] },
          isSwitchable: false,
        },
      ],
      {},
    );
    expect(() => level.validate()).toThrow(LevelValidationError);
  });

  it('should_allow_the_exit_trajectory_to_cross_the_board_boundary', () => {
    // The arrow's body starts in-bounds; its exit path stepping off the
    // board is fine — arrows exit through the edge, there is no exit node.
    const level = LevelDefinition.create(
      'Exits cleanly',
      'Easy',
      boardSize,
      [
        {
          id: 'a1',
          startNode: { row: 0, col: 3 },
          trajectory: { segments: [{ direction: 'right', length: 5 }] },
          isSwitchable: false,
        },
      ],
      {},
    );
    expect(level.validate()).toBe(true);
  });
});

// ─── Leaderboard ─────────────────────────────────────────────────────────────
describe('Leaderboard', () => {
  const levelId = LevelId.create('lvl-001');
  const userId1 = UserId.create('u1');
  const userId2 = UserId.create('u2');

  it('should_return_top_scores_sorted_descending', () => {
    // Arrange
    const board = Leaderboard.create(levelId);
    board.submit(ScoreEntry.create(userId1, levelId, Score.create(10, 30_000)));
    board.submit(ScoreEntry.create(userId2, levelId, Score.create(1, 5_000)));
    // Act
    const top = board.top(2);
    // Assert
    expect(top[0].userId.value).toBe('u2');
    expect(top[1].userId.value).toBe('u1');
  });

  it('should_return_at_most_n_entries', () => {
    const board = Leaderboard.create(levelId);
    for (let i = 0; i < 15; i++) {
      board.submit(
        ScoreEntry.create(userId1, levelId, Score.create(i, i * 1000)),
      );
    }
    expect(board.top(5)).toHaveLength(5);
  });

  it('should_return_all_entries_when_n_exceeds_total', () => {
    const board = Leaderboard.create(levelId);
    board.submit(ScoreEntry.create(userId1, levelId, Score.create(3, 10_000)));
    expect(board.top(100)).toHaveLength(1);
  });
});

// ─── Strategy ─────────────────────────────────────────────────────────────────
describe('ScoreCalculationStrategy', () => {
  const { MovesBasedScore, TimeBasedScore, MixedScore } =
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../../src/domain/services/score-calculation.strategy');

  it('should_score_higher_with_fewer_moves_in_MovesBasedScore', () => {
    const s1 = new MovesBasedScore();
    const better = Score.create(1, 60_000);
    const worse = Score.create(50, 60_000);
    expect(s1.compute(better)).toBeGreaterThan(s1.compute(worse));
  });

  it('should_score_higher_with_less_time_in_TimeBasedScore', () => {
    const s2 = new TimeBasedScore();
    const quick = Score.create(20, 1_000);
    const slow = Score.create(20, 50_000);
    expect(s2.compute(quick)).toBeGreaterThan(s2.compute(slow));
  });

  it('should_never_return_negative_in_any_strategy', () => {
    const badScore = Score.create(999, 999_999);
    [new MovesBasedScore(), new TimeBasedScore(), new MixedScore()].forEach(
      (s) => {
        expect(s.compute(badScore)).toBeGreaterThanOrEqual(0);
      },
    );
  });
});
