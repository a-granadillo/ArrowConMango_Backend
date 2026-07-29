import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { LevelDefinitionOrmEntity } from './orm/level.orm-entity';
import { buildDataSourceOptions } from './orm/data-source-options.factory';

interface LevelJson {
  id: string;
  name: string;
  difficulty: string;
  shape?: 'grid2d' | 'hex';
  boardSize: { rows?: number; cols?: number; radius?: number };
  arrows: unknown[];
  rules: Record<string, unknown>;
  version: number;
  authorId: string | null;
}

// Frozen artifact exported by the frontend's tool/export_levels.dart —
// byte-identical to assets/levels/campaign_levels.json. Re-copy that file
// here (do not hand-edit) whenever the campaign levels change.
const CAMPAIGN_LEVELS: LevelJson[] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'seed-data', 'campaign-levels.json'),
    'utf-8',
  ),
) as LevelJson[];

// Hand-authored hexagonal-mode catalogue (pointy-top, axial coordinates).
const HEXAGONAL_LEVELS: LevelJson[] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'seed-data', 'hexagonal-levels.json'),
    'utf-8',
  ),
) as LevelJson[];

/**
 * Idempotently inserts the bundled campaign + hexagonal catalogues into
 * an already-initialized [dataSource]. Safe to call repeatedly (skips ids
 * that already exist) and safe to call against the app's own connection
 * (see `main.ts`'s `SEED_ON_BOOT`) — this function never closes it.
 */
export async function seedLevels(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(LevelDefinitionOrmEntity);

  for (const level of [...CAMPAIGN_LEVELS, ...HEXAGONAL_LEVELS]) {
    const existing = await repo.findOne({ where: { id: level.id } });
    if (!existing) {
      await repo.save({
        ...level,
        shape: level.shape ?? 'grid2d',
      } as unknown as LevelDefinitionOrmEntity);
      console.log(`Seeded level: ${level.id} (${level.name})`);
    } else {
      console.log(`Level ${level.id} already exists, skipping.`);
    }
  }
}

/** CLI entry point: `npm run seed` (dev, ts-node) / `npm run seed:prod` (compiled). */
async function main(): Promise<void> {
  const dataSource = new DataSource(
    buildDataSourceOptions({
      dbDriver: process.env['DB_DRIVER'] ?? 'sqlite',
      dbPath: process.env['DB_PATH'] ?? 'arrow.sqlite',
      databaseUrl: process.env['DATABASE_URL'],
      dbHost: process.env['DB_HOST'] ?? 'localhost',
      dbPort: parseInt(process.env['DB_PORT'] ?? '5432', 10),
      dbUser: process.env['DB_USER'] ?? 'postgres',
      dbPassword: process.env['DB_PASSWORD'] ?? '',
      dbName: process.env['DB_NAME'] ?? 'arrow_con_mango',
      dbSynchronize: (process.env['DB_SYNCHRONIZE'] ?? 'true') === 'true',
    }),
  );

  await dataSource.initialize();
  await seedLevels(dataSource);
  await dataSource.destroy();
  console.log('Seed complete.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
