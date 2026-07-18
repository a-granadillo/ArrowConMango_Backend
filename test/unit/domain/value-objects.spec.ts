import {
  InvalidEmailError,
  InvalidGameModeError,
} from '../../../src/domain/errors/domain-error';
import { MixedScore } from '../../../src/domain/services/score-calculation.strategy';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { GameMode } from '../../../src/domain/value-objects/game-mode.vo';
import { LevelId } from '../../../src/domain/value-objects/level-id.vo';
import { MangoRating } from '../../../src/domain/value-objects/mango-rating.vo';
import { PasswordHash } from '../../../src/domain/value-objects/password-hash.vo';
import { Score } from '../../../src/domain/value-objects/score.vo';
import { UserId } from '../../../src/domain/value-objects/user-id.vo';

describe('Value Objects', () => {
  // ─── Email ─────────────────────────────────────────────────────────────────
  describe('Email', () => {
    it('should_create_valid_email_when_format_is_correct', () => {
      // Arrange & Act
      const email = Email.create('User@Example.COM');
      // Assert
      expect(email.value).toBe('user@example.com');
      expect(email.isValid()).toBe(true);
    });

    it('should_throw_InvalidEmailError_when_format_is_invalid', () => {
      // Arrange & Act & Assert
      expect(() => Email.create('not-an-email')).toThrow(InvalidEmailError);
      expect(() => Email.create('')).toThrow(InvalidEmailError);
      expect(() => Email.create('missing@domain')).toThrow(InvalidEmailError);
    });

    it('should_be_equal_when_same_normalised_value', () => {
      const a = Email.create('Test@Test.com');
      const b = Email.create('test@test.com');
      expect(a.equals(b)).toBe(true);
    });

    it('should_not_be_equal_when_different_addresses', () => {
      const a = Email.create('alice@test.com');
      const b = Email.create('bob@test.com');
      expect(a.equals(b)).toBe(false);
    });
  });

  // ─── UserId / LevelId ─────────────────────────────────────────────────────
  describe('UserId', () => {
    it('should_generate_unique_ids_when_no_value_provided', () => {
      const a = UserId.create();
      const b = UserId.create();
      expect(a.value).not.toBe(b.value);
    });

    it('should_preserve_provided_value', () => {
      const id = UserId.create('fixed-id');
      expect(id.value).toBe('fixed-id');
    });

    it('should_be_equal_when_same_value', () => {
      const a = UserId.create('same');
      const b = UserId.create('same');
      expect(a.equals(b)).toBe(true);
    });
  });

  describe('LevelId', () => {
    it('should_preserve_provided_value', () => {
      const id = LevelId.create('level-001');
      expect(id.value).toBe('level-001');
    });
  });

  // ─── GameMode ─────────────────────────────────────────────────────────────
  describe('GameMode', () => {
    it('should_create_hexagonal_mode_when_value_is_hexagonal', () => {
      const mode = GameMode.create('hexagonal');
      expect(mode.value).toBe('hexagonal');
      expect(mode.isHexagonal()).toBe(true);
      expect(mode.isSurvival()).toBe(false);
    });

    it('should_expose_hexagonal_via_static_factory', () => {
      expect(GameMode.hexagonal().isHexagonal()).toBe(true);
    });

    it('should_throw_InvalidGameModeError_when_value_is_unknown', () => {
      expect(() => GameMode.create('unknown-mode')).toThrow(
        InvalidGameModeError,
      );
    });
  });

  // ─── PasswordHash ─────────────────────────────────────────────────────────
  describe('PasswordHash', () => {
    it('should_store_hash_value', () => {
      const ph = PasswordHash.fromHash('$2b$12$abcdef');
      expect(ph.hash).toBe('$2b$12$abcdef');
    });

    it('should_throw_when_hash_is_empty', () => {
      expect(() => PasswordHash.fromHash('')).toThrow();
    });

    it('should_not_expose_hash_via_toString', () => {
      const ph = PasswordHash.fromHash('$2b$12$abcdef');
      expect(ph.toString()).toBe('[PasswordHash]');
    });
  });

  // ─── Score ────────────────────────────────────────────────────────────────
  // Score itself holds no scoring formula (Strategy pattern) — these tests
  // exercise isBetterThan() against MixedScore, a strategy that penalises
  // both moves and time, as a representative case.
  describe('Score', () => {
    const strategy = new MixedScore();

    it('should_compute_positive_value_for_reasonable_play', () => {
      const score = Score.create(5, 30_000);
      expect(strategy.compute(score)).toBeGreaterThan(0);
    });

    it('should_score_higher_when_fewer_moves', () => {
      const fast = Score.create(2, 10_000);
      const slow = Score.create(20, 10_000);
      expect(strategy.compute(fast)).toBeGreaterThan(strategy.compute(slow));
    });

    it('should_score_higher_when_less_time', () => {
      const quick = Score.create(5, 5_000);
      const late = Score.create(5, 60_000);
      expect(strategy.compute(quick)).toBeGreaterThan(strategy.compute(late));
    });

    it('should_never_return_negative_value', () => {
      const terrible = Score.create(10_000, 999_999);
      expect(strategy.compute(terrible)).toBeGreaterThanOrEqual(0);
    });

    it('should_throw_when_moves_is_negative', () => {
      expect(() => Score.create(-1, 1000)).toThrow();
    });

    it('should_throw_when_time_is_negative', () => {
      expect(() => Score.create(5, -1)).toThrow();
    });

    it('should_correctly_compare_two_scores', () => {
      const better = Score.create(1, 1_000);
      const worse = Score.create(20, 60_000);
      expect(better.isBetterThan(worse, strategy)).toBe(true);
      expect(worse.isBetterThan(better, strategy)).toBe(false);
    });
  });

  // ─── MangoRating ────────────────────────────────────────────────────────
  // Thresholds mirror the frontend's MangoRating.fromScore (mango_rating.dart)
  // exactly, tuned against MangoScore's 100-1000 point scale.
  describe('MangoRating', () => {
    it('should_award_three_stars_at_or_above_900_points', () => {
      expect(MangoRating.fromPoints(900).stars).toBe(3);
      expect(MangoRating.fromPoints(1000).stars).toBe(3);
    });

    it('should_award_two_stars_between_600_and_899_points', () => {
      expect(MangoRating.fromPoints(600).stars).toBe(2);
      expect(MangoRating.fromPoints(899).stars).toBe(2);
    });

    it('should_award_one_star_below_600_points', () => {
      expect(MangoRating.fromPoints(599).stars).toBe(1);
      expect(MangoRating.fromPoints(100).stars).toBe(1);
    });
  });
});
