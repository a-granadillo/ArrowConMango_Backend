import { ConfigService } from '@nestjs/config';
import { BcryptHasher } from '../../../src/infrastructure/auth/bcrypt-hasher';
import { JwtTokenService } from '../../../src/infrastructure/auth/jwt-token.service';
import { UnauthorizedError } from '../../../src/domain/errors/domain-error';
import { UserId } from '../../../src/domain/value-objects/user-id.vo';
import { ScoreEntry } from '../../../src/domain/entities/score-entry.entity';
import { LevelId } from '../../../src/domain/value-objects/level-id.vo';
import { Score } from '../../../src/domain/value-objects/score.vo';

const makeConfig = (overrides: Record<string, string> = {}): ConfigService => {
  const values: Record<string, string> = {
    'app.jwtSecret': 'test-secret',
    'app.jwtExpiresIn': '1h',
    ...overrides,
  };
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      const value = values[key];
      if (value === undefined) {
        throw new Error(`Missing config value: ${key}`);
      }
      return value;
    },
  } as unknown as ConfigService;
};

// ─── JwtTokenService ───────────────────────────────────────────────────────

describe('JwtTokenService', () => {
  it('should_return_same_userId_when_sign_then_verify', () => {
    // Arrange
    const svc = new JwtTokenService(makeConfig());
    const userId = UserId.create('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    // Act
    const token = svc.sign(userId);
    const result = svc.verify(token);
    // Assert
    expect(result.value).toBe(userId.value);
  });

  it('should_throw_UnauthorizedError_when_token_is_invalid', () => {
    // Arrange
    const svc = new JwtTokenService(makeConfig());
    // Act & Assert
    expect(() => svc.verify('not.a.token')).toThrow(UnauthorizedError);
  });

  it('should_throw_UnauthorizedError_when_token_signed_with_different_secret', () => {
    // Arrange
    const signer = new JwtTokenService(
      makeConfig({ 'app.jwtSecret': 'secret-a' }),
    );
    const verifier = new JwtTokenService(
      makeConfig({ 'app.jwtSecret': 'secret-b' }),
    );
    const token = signer.sign(UserId.create());
    // Act & Assert
    expect(() => verifier.verify(token)).toThrow(UnauthorizedError);
  });
});

// ─── BcryptHasher ──────────────────────────────────────────────────────────

describe('BcryptHasher', () => {
  const hasher = new BcryptHasher();

  it('should_produce_hash_different_from_plaintext', async () => {
    // Arrange
    const plain = 'mySecretPassword123';
    // Act
    const result = await hasher.hash(plain);
    // Assert
    expect(result.hash).not.toBe(plain);
    expect(result.hash.startsWith('$2b$')).toBe(true);
  });

  it('should_return_true_when_plain_matches_hash', async () => {
    // Arrange
    const plain = 'correctPassword';
    const hash = await hasher.hash(plain);
    // Act
    const match = await hasher.compare(plain, hash);
    // Assert
    expect(match).toBe(true);
  });

  it('should_return_false_when_plain_does_not_match_hash', async () => {
    // Arrange
    const hash = await hasher.hash('correctPassword');
    // Act
    const match = await hasher.compare('wrongPassword', hash);
    // Assert
    expect(match).toBe(false);
  });
});

// ─── ScoreEntry.reconstitute (D3) ──────────────────────────────────────────

describe('ScoreEntry.reconstitute', () => {
  it('should_preserve_original_timestamp_when_reconstituting', () => {
    // Arrange
    const userId = UserId.create('u1');
    const levelId = LevelId.create('l1');
    const score = Score.create(5, 20_000);
    const originalDate = new Date('2024-01-15T10:30:00Z');
    // Act
    const entry = ScoreEntry.reconstitute(userId, levelId, score, originalDate);
    // Assert
    expect(entry.at.toISOString()).toBe(originalDate.toISOString());
    expect(entry.userId.value).toBe('u1');
    expect(entry.levelId.value).toBe('l1');
  });
});
