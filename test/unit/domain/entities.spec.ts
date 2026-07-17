import { LevelValidationError } from '../../../src/domain/errors/domain-error';
import { GlobalLeaderboard } from '../../../src/domain/entities/global-leaderboard.entity';
import { Leaderboard } from '../../../src/domain/entities/leaderboard.entity';
import {
  ArrowDefinition,
  LevelDefinition,
} from '../../../src/domain/entities/level-definition.entity';
import { PlayerProgress } from '../../../src/domain/entities/player-progress.entity';
import { ScoreEntry } from '../../../src/domain/entities/score-entry.entity';
import { User } from '../../../src/domain/entities/user.entity';
import { IPasswordHasher } from '../../../src/domain/ports/password-hasher';
import {
  MangoScore,
  MixedScore,
  MovesBasedScore,
  TimeBasedScore,
} from '../../../src/domain/services/score-calculation.strategy';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { GameMode } from '../../../src/domain/value-objects/game-mode.vo';
import { LevelId } from '../../../src/domain/value-objects/level-id.vo';
import { PasswordHash } from '../../../src/domain/value-objects/password-hash.vo';
import { PlayerStanding } from '../../../src/domain/value-objects/player-standing.vo';
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

  it('should_update_username_when_renamed', () => {
    const user = makeUser();
    user.rename('NewName');
    expect(user.username).toBe('NewName');
  });
});

// ─── PlayerProgress ───────────────────────────────────────────────────────────
describe('PlayerProgress', () => {
  const uid = UserId.create('user-1');
  const lvl1 = LevelId.create('lvl-1');
  const lvl2 = LevelId.create('lvl-2');
  const lowScore = Score.create(20, 60_000);
  const highScore = Score.create(2, 5_000);
  const strategy = new MixedScore();

  it('should_mark_level_as_completed_when_score_submitted', () => {
    const progress = PlayerProgress.create(uid);
    progress.markCompleted(lvl1, lowScore, strategy);
    expect(progress.isCompleted(lvl1)).toBe(true);
  });

  it('should_keep_best_score_when_better_score_submitted', () => {
    const progress = PlayerProgress.create(uid);
    progress.markCompleted(lvl1, lowScore, strategy);
    progress.markCompleted(lvl1, highScore, strategy);
    expect(progress.bestFor(lvl1)!.equals(highScore)).toBe(true);
  });

  it('should_not_replace_best_score_when_worse_score_submitted', () => {
    const progress = PlayerProgress.create(uid);
    progress.markCompleted(lvl1, highScore, strategy);
    progress.markCompleted(lvl1, lowScore, strategy);
    expect(progress.bestFor(lvl1)!.equals(highScore)).toBe(true);
  });

  it('should_merge_progress_idempotently_when_same_data_sent_twice', () => {
    // Arrange — server has lvl1 with highScore
    const server = PlayerProgress.create(uid);
    server.markCompleted(lvl1, highScore, strategy);

    // Client sends same data twice
    const clientData = PlayerProgress.reconstitute(uid, [lvl1.value], {
      [lvl1.value]: { moves: highScore.moves, timeMs: highScore.timeMs },
    });
    server.merge(clientData, strategy);
    server.merge(clientData, strategy); // idempotent: second merge must not change anything

    // Assert — completed still has only lvl1, best is unchanged
    expect(server.completed.size).toBe(1);
    expect(server.bestFor(lvl1)!.equals(highScore)).toBe(true);
  });

  it('should_union_completed_levels_when_merging', () => {
    const server = PlayerProgress.create(uid);
    server.markCompleted(lvl1, lowScore, strategy);

    const incoming = PlayerProgress.reconstitute(uid, [lvl2.value], {
      [lvl2.value]: { moves: 5, timeMs: 10_000 },
    });
    server.merge(incoming, strategy);

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
    server.merge(incoming, strategy);
    expect(server.currentLevel).toBe(3);
  });

  it('should_advance_current_level_when_merging_a_higher_one', () => {
    const server = PlayerProgress.reconstitute(uid, [], {}, 2);
    const incoming = PlayerProgress.reconstitute(uid, [], {}, 5);
    server.merge(incoming, strategy);
    expect(server.currentLevel).toBe(5);
  });

  it('should_sum_mango_stars_across_every_best_run', () => {
    const mangoStrategy = new MangoScore();
    const progress = PlayerProgress.create(uid);
    // 5s -> 950 points -> 3 stars
    progress.markCompleted(lvl1, Score.create(0, 5_000), mangoStrategy);
    // 50s -> 500 points -> 1 star
    progress.markCompleted(lvl2, Score.create(0, 50_000), mangoStrategy);
    expect(progress.mangos(mangoStrategy)).toBe(4);
  });

  it('should_return_zero_mangos_when_nothing_completed', () => {
    const progress = PlayerProgress.create(uid);
    expect(progress.mangos(new MangoScore())).toBe(0);
  });

  it('should_count_completed_levels', () => {
    const progress = PlayerProgress.create(uid);
    progress.markCompleted(lvl1, highScore, strategy);
    progress.markCompleted(lvl2, highScore, strategy);
    expect(progress.completedCount()).toBe(2);
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
  const strategy = new MixedScore();

  it('should_return_top_scores_sorted_descending', () => {
    // Arrange
    const board = Leaderboard.create(levelId);
    board.submit(
      ScoreEntry.create(
        userId1,
        levelId,
        Score.create(10, 30_000),
        GameMode.campaign(),
      ),
    );
    board.submit(
      ScoreEntry.create(
        userId2,
        levelId,
        Score.create(1, 5_000),
        GameMode.campaign(),
      ),
    );
    // Act
    const top = board.top(strategy, 2);
    // Assert
    expect(top[0].userId.value).toBe('u2');
    expect(top[1].userId.value).toBe('u1');
  });

  it('should_return_at_most_n_entries', () => {
    const board = Leaderboard.create(levelId);
    for (let i = 0; i < 15; i++) {
      board.submit(
        ScoreEntry.create(
          UserId.create(`u${i}`),
          levelId,
          Score.create(i, i * 1000),
          GameMode.campaign(),
        ),
      );
    }
    expect(board.top(strategy, 5)).toHaveLength(5);
  });

  it('should_return_all_entries_when_n_exceeds_total', () => {
    const board = Leaderboard.create(levelId);
    board.submit(
      ScoreEntry.create(
        userId1,
        levelId,
        Score.create(3, 10_000),
        GameMode.campaign(),
      ),
    );
    expect(board.top(strategy, 100)).toHaveLength(1);
  });

  it('should_keep_only_the_best_entry_per_user', () => {
    // A player who retries keeps only their best run in the ranking —
    // otherwise repeated submissions could fill the whole top N.
    const board = Leaderboard.create(levelId);
    board.submit(
      ScoreEntry.create(
        userId1,
        levelId,
        Score.create(20, 60_000),
        GameMode.campaign(),
      ),
    );
    board.submit(
      ScoreEntry.create(
        userId1,
        levelId,
        Score.create(1, 1_000),
        GameMode.campaign(),
      ),
    );
    board.submit(
      ScoreEntry.create(
        userId1,
        levelId,
        Score.create(15, 45_000),
        GameMode.campaign(),
      ),
    );

    const top = board.top(strategy, 10);

    expect(top).toHaveLength(1);
    expect(top[0].score.equals(Score.create(1, 1_000))).toBe(true);
  });

  it('should_rank_by_value_descending_not_by_moves_ascending', () => {
    // Regression test for the SQL-ordering bug: A has fewer moves but a
    // vastly worse time; B has more moves but a much better time. Ordering
    // by `moves ASC` (the old, wrong SQL rule) would put A first and could
    // drop B entirely once `take: n` truncates before value is considered.
    // The domain rule (MangoScore.compute() descending) must rank B first.
    const board = Leaderboard.create(levelId);
    const a = ScoreEntry.create(
      UserId.create('a'),
      levelId,
      Score.create(1, 90_000),
      GameMode.campaign(),
    );
    const b = ScoreEntry.create(
      UserId.create('b'),
      levelId,
      Score.create(2, 1_000),
      GameMode.campaign(),
    );
    board.submit(a);
    board.submit(b);

    const top = board.top(new MangoScore(), 1);

    expect(top).toHaveLength(1);
    expect(top[0].userId.value).toBe('b');
  });

  it('should_produce_a_different_order_when_the_injected_strategy_changes', () => {
    // Proves the Strategy pattern is load-bearing, not decorative: swapping
    // the strategy changes the ranking outcome for the exact same entries.
    const board = Leaderboard.create(levelId);
    const fewMovesSlowTime = ScoreEntry.create(
      UserId.create('few-moves'),
      levelId,
      Score.create(1, 100_000),
      GameMode.campaign(),
    );
    const manyMovesFastTime = ScoreEntry.create(
      UserId.create('many-moves'),
      levelId,
      Score.create(80, 500),
      GameMode.campaign(),
    );
    board.submit(fewMovesSlowTime);
    board.submit(manyMovesFastTime);

    const byTime = board.top(new TimeBasedScore(), 1);
    const byMoves = board.top(new MovesBasedScore(), 1);

    expect(byTime[0].userId.value).toBe('many-moves');
    expect(byMoves[0].userId.value).toBe('few-moves');
  });
});

// ─── GlobalLeaderboard ────────────────────────────────────────────────────────
describe('GlobalLeaderboard', () => {
  it('should_rank_standings_by_mangos_descending', () => {
    const low = PlayerStanding.create('u1', 'Low', 5, 3);
    const high = PlayerStanding.create('u2', 'High', 40, 15);
    const board = GlobalLeaderboard.from([low, high]);

    const top = board.top(10);

    expect(top[0].userId).toBe('u2');
    expect(top[1].userId).toBe('u1');
  });

  it('should_respect_the_n_limit', () => {
    const standings = Array.from({ length: 5 }, (_, i) =>
      PlayerStanding.create(`u${i}`, `Player${i}`, i, i),
    );
    const board = GlobalLeaderboard.from(standings);

    expect(board.top(2)).toHaveLength(2);
  });
});

// ─── Strategy ─────────────────────────────────────────────────────────────────
describe('ScoreCalculationStrategy', () => {
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

  // MangoScore is the production default: it must mirror the frontend's
  // MoveBasedScoring exactly (movePenalty=0 there — time-only scoring), or
  // the backend-computed leaderboard would disagree with what the player
  // sees on their own victory screen for the same run.
  describe('MangoScore', () => {
    const strategy = new MangoScore();

    it('should_award_max_points_for_a_perfect_zero_time_run', () => {
      expect(strategy.compute(Score.create(0, 0))).toBe(1000);
    });

    it('should_deduct_ten_points_per_whole_second_elapsed', () => {
      expect(strategy.compute(Score.create(0, 5_000))).toBe(950);
      expect(strategy.compute(Score.create(999, 5_000))).toBe(950); // moves don't affect it
    });

    it('should_floor_at_the_minimum_points', () => {
      expect(strategy.compute(Score.create(0, 1_000_000))).toBe(100);
    });
  });
});
