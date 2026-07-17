import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import envConfig from './env.config';

import { AuthController } from '../../adapters/controllers/auth.controller';
import { LeaderboardController } from '../../adapters/controllers/leaderboard.controller';
import { LevelController } from '../../adapters/controllers/level.controller';
import { ProgressController } from '../../adapters/controllers/progress.controller';
import { TypeOrmLeaderboardRepository } from '../persistence/typeorm-leaderboard.repository';
import { TypeOrmLevelRepository } from '../persistence/typeorm-level.repository';
import { TypeOrmProgressRepository } from '../persistence/typeorm-progress.repository';
import { TypeOrmUserRepository } from '../persistence/typeorm-user.repository';

import { MangoScore } from '../../domain/services/score-calculation.strategy';

import { GetLeaderboardUseCase } from '../../application/use-cases/get-leaderboard.use-case';
import { GetLevelsUseCase } from '../../application/use-cases/get-levels.use-case';
import { GetProgressUseCase } from '../../application/use-cases/get-progress.use-case';
import { GuestLoginUseCase } from '../../application/use-cases/guest-login.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { SubmitScoreUseCase } from '../../application/use-cases/submit-score.use-case';
import { SyncProgressUseCase } from '../../application/use-cases/sync-progress.use-case';
import { UpsertLevelUseCase } from '../../application/use-cases/upsert-level.use-case';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../orm/database.module';
import {
  LEADERBOARD_REPOSITORY,
  LEVEL_REPOSITORY,
  PASSWORD_HASHER,
  PROGRESS_REPOSITORY,
  SCORE_STRATEGY,
  TOKEN_SERVICE,
  USER_REPOSITORY,
} from './tokens';

import { AuthGuard } from '../../adapters/aop/auth.guard';

/**
 * Composition Root (D1+D2):
 * This is the ONLY place where concrete implementations are wired to domain ports.
 * Use-cases receive ports via factory providers — they never import NestJS or TypeORM.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [envConfig] }),
    DatabaseModule,
    AuthModule,
  ],
  controllers: [
    AuthController,
    ProgressController,
    LevelController,
    LeaderboardController,
  ],
  providers: [
    // ── Port → Implementation bindings (Adapter pattern, DIP) ──────────────
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    {
      provide: PROGRESS_REPOSITORY,
      useClass: TypeOrmProgressRepository,
    },
    {
      provide: LEVEL_REPOSITORY,
      useClass: TypeOrmLevelRepository,
    },
    {
      provide: LEADERBOARD_REPOSITORY,
      useClass: TypeOrmLeaderboardRepository,
    },
    {
      provide: SCORE_STRATEGY,
      useClass: MangoScore,
    },

    // ── AOP aspects ─────────────────────────────────────────────────────────
    AuthGuard,

    // ── Use-case factory providers (D1: use-cases stay framework-agnostic) ──
    {
      provide: RegisterUserUseCase,
      useFactory: (repo: any, hasher: any) =>
        new RegisterUserUseCase(repo, hasher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
    },
    {
      provide: LoginUseCase,
      useFactory: (repo: any, hasher: any, token: any) =>
        new LoginUseCase(repo, hasher, token),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE],
    },
    {
      provide: GuestLoginUseCase,
      useFactory: (repo: any, hasher: any, token: any) =>
        new GuestLoginUseCase(repo, hasher, token),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE],
    },
    {
      provide: GetProgressUseCase,
      useFactory: (repo: any, scoring: any) =>
        new GetProgressUseCase(repo, scoring),
      inject: [PROGRESS_REPOSITORY, SCORE_STRATEGY],
    },
    {
      provide: SyncProgressUseCase,
      useFactory: (repo: any, scoring: any) =>
        new SyncProgressUseCase(repo, scoring),
      inject: [PROGRESS_REPOSITORY, SCORE_STRATEGY],
    },
    {
      provide: GetLevelsUseCase,
      useFactory: (repo: any) => new GetLevelsUseCase(repo),
      inject: [LEVEL_REPOSITORY],
    },
    {
      provide: UpsertLevelUseCase,
      useFactory: (repo: any) => new UpsertLevelUseCase(repo),
      inject: [LEVEL_REPOSITORY],
    },
    {
      provide: GetLeaderboardUseCase,
      useFactory: (repo: any, scoring: any) =>
        new GetLeaderboardUseCase(repo, scoring),
      inject: [LEADERBOARD_REPOSITORY, SCORE_STRATEGY],
    },
    {
      provide: SubmitScoreUseCase,
      useFactory: (leaderboardRepo: any, progressRepo: any, scoring: any) =>
        new SubmitScoreUseCase(leaderboardRepo, progressRepo, scoring),
      inject: [LEADERBOARD_REPOSITORY, PROGRESS_REPOSITORY, SCORE_STRATEGY],
    },
  ],
})
export class AppModule {}
