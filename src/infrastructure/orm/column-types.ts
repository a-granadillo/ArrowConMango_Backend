/**
 * SQLite's `datetime` column type doesn't exist in Postgres (TypeORM throws
 * `DataTypeNotSupportedError` at bootstrap). Entities are loaded once at
 * process start, so reading the driver directly from the environment here
 * (instead of through ConfigService, which isn't available at decorator
 * evaluation time) is sufficient to pick the right type for whichever
 * database `database.module.ts` connects to.
 */
export const isPostgresDriver =
  process.env['DB_DRIVER'] === 'postgres' || !!process.env['DATABASE_URL'];

export const DATETIME_COLUMN_TYPE = isPostgresDriver
  ? 'timestamptz'
  : 'datetime';
