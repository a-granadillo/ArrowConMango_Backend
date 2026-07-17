import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { LevelDefinitionOrmEntity } from './orm/level.orm-entity';
import { UserOrmEntity } from './orm/user.orm-entity';
import { PlayerProgressOrmEntity } from './orm/progress.orm-entity';
import { ScoreEntryOrmEntity } from './orm/score-entry.orm-entity';

const ds = new DataSource({
  type: 'sqlite',
  database: process.env['DB_PATH'] ?? 'arrow.sqlite',
  entities: [
    UserOrmEntity,
    PlayerProgressOrmEntity,
    LevelDefinitionOrmEntity,
    ScoreEntryOrmEntity,
  ],
  synchronize: true,
});

interface CampaignLevelJson {
  id: string;
  name: string;
  difficulty: string;
  boardSize: { rows: number; cols: number };
  arrows: unknown[];
  rules: Record<string, unknown>;
  version: number;
  authorId: string | null;
}

// Frozen artifact exported by the frontend's tool/export_levels.dart —
// byte-identical to assets/levels/campaign_levels.json. Re-copy that file
// here (do not hand-edit) whenever the campaign levels change.
const LEVELS: CampaignLevelJson[] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'seed-data', 'campaign-levels.json'),
    'utf-8',
  ),
) as CampaignLevelJson[];

async function seed(): Promise<void> {
  await ds.initialize();
  const repo = ds.getRepository(LevelDefinitionOrmEntity);

  for (const level of LEVELS) {
    const existing = await repo.findOne({ where: { id: level.id } });
    if (!existing) {
      await repo.save(level as unknown as LevelDefinitionOrmEntity);
      console.log(`Seeded level: ${level.id} (${level.name})`);
    } else {
      console.log(`Level ${level.id} already exists, skipping.`);
    }
  }

  await ds.destroy();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
