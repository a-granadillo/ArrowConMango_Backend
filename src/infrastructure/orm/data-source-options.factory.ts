import { DataSourceOptions } from 'typeorm';
import { LevelDefinitionOrmEntity } from './level.orm-entity';
import { PlayerProgressOrmEntity } from './progress.orm-entity';
import { ScoreEntryOrmEntity } from './score-entry.orm-entity';
import { UserOrmEntity } from './user.orm-entity';

export const ORM_ENTITIES = [
  UserOrmEntity,
  PlayerProgressOrmEntity,
  LevelDefinitionOrmEntity,
  ScoreEntryOrmEntity,
];

export interface DatabaseEnv {
  dbDriver: string;
  dbPath: string;
  databaseUrl?: string;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbSynchronize: boolean;
  /**
   * Neon/Render's hosted Postgres requires SSL; a local/docker-compose
   * Postgres (no cert configured) rejects the SSL handshake outright and
   * the driver hangs retrying forever. Defaults to true (the hosted case)
   * — set DB_SSL=false for local/compose Postgres.
   */
  dbSsl: boolean;
}

/**
 * Single source of truth for TypeORM connection options, shared by
 * `database.module.ts` (NestJS runtime) and `seed.ts` (plain script, no
 * Nest DI available). `DATABASE_URL` — the format Neon/Render hand out —
 * takes priority over discrete `DB_*` vars when present.
 */
export function buildDataSourceOptions(env: DatabaseEnv): DataSourceOptions {
  const usesPostgres = env.dbDriver === 'postgres' || !!env.databaseUrl;

  if (!usesPostgres) {
    return {
      type: 'sqlite',
      database: env.dbPath,
      entities: ORM_ENTITIES,
      synchronize: true,
    };
  }

  if (env.databaseUrl) {
    return {
      type: 'postgres',
      url: env.databaseUrl,
      ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
      entities: ORM_ENTITIES,
      synchronize: env.dbSynchronize,
    };
  }

  return {
    type: 'postgres',
    host: env.dbHost,
    port: env.dbPort,
    username: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
    entities: ORM_ENTITIES,
    synchronize: env.dbSynchronize,
  };
}
