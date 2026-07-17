import { LevelValidationError } from '../../../src/domain/errors/domain-error';
import { Leaderboard } from '../../../src/domain/entities/leaderboard.entity';
import { LevelDefinition } from '../../../src/domain/entities/level-definition.entity';
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
  const validNodes = [
    {
      id: 'n1',
      position: [0, 0] as [number, number],
      type: 'arrow' as const,
      direction: 'UP' as const,
    },
    { id: 'n2', position: [0, 1] as [number, number], type: 'exit' as const },
  ];
  const validEdges: [string, string][] = [['n1', 'n2']];

  it('should_validate_successfully_when_graph_is_correct', () => {
    const level = LevelDefinition.create(validNodes, validEdges, {});
    expect(level.validate()).toBe(true);
  });

  it('should_throw_when_edge_references_unknown_node', () => {
    const level = LevelDefinition.create(validNodes, [['n1', 'UNKNOWN']], {});
    expect(() => level.validate()).toThrow(LevelValidationError);
  });

  it('should_throw_when_no_exit_node', () => {
    const noExit = validNodes.filter((n) => n.type !== 'exit');
    const level = LevelDefinition.create(noExit, [], {});
    expect(() => level.validate()).toThrow(LevelValidationError);
  });

  it('should_throw_when_no_arrow_node', () => {
    const noArrow = [
      { id: 'e1', position: [0, 0] as [number, number], type: 'exit' as const },
    ];
    const level = LevelDefinition.create(noArrow, [], {});
    expect(() => level.validate()).toThrow(LevelValidationError);
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
