import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  dbDriver: process.env['DB_DRIVER'] ?? 'sqlite',
  dbPath: process.env['DB_PATH'] ?? 'arrow.sqlite',
  dbHost: process.env['DB_HOST'] ?? 'localhost',
  dbPort: parseInt(process.env['DB_PORT'] ?? '5432', 10),
  dbUser: process.env['DB_USER'] ?? 'postgres',
  dbPassword: process.env['DB_PASSWORD'] ?? '',
  dbName: process.env['DB_NAME'] ?? 'arrow_con_mango',
  jwtSecret: process.env['JWT_SECRET'] ?? 'change-me-in-production',
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
}));
