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
      ssl: { rejectUnauthorized: false },
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
    entities: ORM_ENTITIES,
    synchronize: env.dbSynchronize,
  };
}
