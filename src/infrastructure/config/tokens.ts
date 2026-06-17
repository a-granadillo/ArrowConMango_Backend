/**
 * Injection tokens for domain ports.
 * Interfaces don't exist at runtime, so we use string constants as DI tokens.
 * The composition root (app.module.ts) binds each token to its concrete implementation.
 */
export const USER_REPOSITORY = 'IUserRepository';
export const PROGRESS_REPOSITORY = 'IProgressRepository';
export const LEVEL_REPOSITORY = 'ILevelRepository';
export const LEADERBOARD_REPOSITORY = 'ILeaderboardRepository';
export const TOKEN_SERVICE = 'ITokenService';
export const PASSWORD_HASHER = 'IPasswordHasher';
