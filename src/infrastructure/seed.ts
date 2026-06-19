import 'reflect-metadata';
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

const LEVELS = [
  {
    id: 'level-001',
    nodes: [
      { id: 'n1', position: [0, 0], type: 'arrow', direction: 'RIGHT' },
      { id: 'n2', position: [1, 0], type: 'arrow', direction: 'DOWN' },
      { id: 'n3', position: [1, 1], type: 'exit' },
    ],
    edges: [
      ['n1', 'n2'],
      ['n2', 'n3'],
    ],
    rules: { timeLimitSeconds: 60 },
    version: 1,
  },
  {
    id: 'level-002',
    nodes: [
      { id: 'a1', position: [0, 0], type: 'arrow', direction: 'DOWN' },
      { id: 'a2', position: [0, 1], type: 'arrow', direction: 'RIGHT' },
      { id: 'a3', position: [1, 1], type: 'arrow', direction: 'UP' },
      { id: 'a4', position: [1, 0], type: 'exit' },
    ],
    edges: [
      ['a1', 'a2'],
      ['a2', 'a3'],
      ['a3', 'a4'],
    ],
    rules: { timeLimitSeconds: 90, allowRotation: true },
    version: 1,
  },
];

async function seed(): Promise<void> {
  await ds.initialize();
  const repo = ds.getRepository(LevelDefinitionOrmEntity);

  for (const level of LEVELS) {
    const existing = await repo.findOne({ where: { id: level.id } });
    if (!existing) {
      await repo.save(level as unknown as LevelDefinitionOrmEntity);
      console.log(`Seeded level: ${level.id}`);
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
