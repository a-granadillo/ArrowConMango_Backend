import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  dbDriver: process.env['DB_DRIVER'] ?? 'sqlite',
  dbPath: process.env['DB_PATH'] ?? 'arrow.sqlite',
  /** Connection string, e.g. from Neon/Render Postgres. Takes priority over discrete DB_* vars when set. */
  databaseUrl: process.env['DATABASE_URL'],
  dbHost: process.env['DB_HOST'] ?? 'localhost',
  dbPort: parseInt(process.env['DB_PORT'] ?? '5432', 10),
  dbUser: process.env['DB_USER'] ?? 'postgres',
  dbPassword: process.env['DB_PASSWORD'] ?? '',
  dbName: process.env['DB_NAME'] ?? 'arrow_con_mango',
  /** Whether TypeORM should auto-create/alter the schema from entities. Defaults on: no migrations exist yet. */
  dbSynchronize: (process.env['DB_SYNCHRONIZE'] ?? 'true') === 'true',
  jwtSecret: process.env['JWT_SECRET'] ?? 'change-me-in-production',
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
  /** Comma-separated list of allowed CORS origins. Empty = reflect no origin (same as disabled). */
  corsOrigins: (process.env['CORS_ORIGINS'] ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  seedOnBoot: process.env['SEED_ON_BOOT'] === 'true',
}));
