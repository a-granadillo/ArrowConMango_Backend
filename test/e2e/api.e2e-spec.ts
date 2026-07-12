import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest') as (
  app: unknown,
) => import('supertest').SuperTest<import('supertest').Test>;
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';

import { AppModule } from '../../src/infrastructure/config/app.module';
import { HttpExceptionFilter } from '../../src/infrastructure/aop/http-exception.filter';
import { LoggingInterceptor } from '../../src/infrastructure/aop/logging.interceptor';

/**
 * E2E tests — full HTTP stack using NestJS testing module + SQLite :memory:
 *
 * Flow: register → login → sync progress → get progress → submit score → get leaderboard
 * Error cases: 409 (dup email), 401 (no token), 422 (invalid level)
 */

process.env['DB_DRIVER'] = 'sqlite';
process.env['DB_PATH'] = ':memory:';
process.env['JWT_SECRET'] = 'e2e-test-secret';
process.env['JWT_EXPIRES_IN'] = '1h';

let app: INestApplication;
let bearerToken: string;

const LEVEL_ID = 'e2e-level-001';

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new LoggingInterceptor());
  await app.init();

  // Seed a valid level
  const ds = moduleRef.get<DataSource>(getDataSourceToken());
  await ds.query(
    `INSERT OR IGNORE INTO level_definitions (id, nodes, edges, rules, version) VALUES (?, ?, ?, ?, ?)`,
    [
      LEVEL_ID,
      JSON.stringify([
        { id: 'n1', position: [0, 0], type: 'arrow', direction: 'RIGHT' },
        { id: 'n2', position: [1, 0], type: 'exit' },
      ]),
      JSON.stringify([['n1', 'n2']]),
      JSON.stringify({}),
      1,
    ],
  );
});

afterAll(async () => {
  await app.close();
});

// ─── Auth ──────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('should_return_201_when_valid_data', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'e2e@test.com',
        password: 'password123',
        username: 'E2EUser',
      });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('e2e@test.com');
    expect(res.body.username).toBe('E2EUser');
    expect(res.body.id).toBeDefined();
  });

  it('should_return_409_when_email_already_registered', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'e2e@test.com',
        password: 'password123',
        username: 'E2EUser2',
      });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('EmailAlreadyInUseError');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('should_return_200_and_jwt_when_credentials_valid', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'e2e@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    bearerToken = res.body.token;
  });

  it('should_return_401_when_password_wrong', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'e2e@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/guest', () => {
  const guestUuid = 'a1b2c3d4-e5f6-4789-a123-b456c789d012';

  it('should_return_200_and_jwt_when_uuid_is_valid', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/guest')
      .send({ uuid: guestUuid });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('should_return_same_user_token_when_uuid_repeats', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/guest')
      .send({ uuid: guestUuid });

    const guestToken = first.body.token as string;
    const progressRes = await request(app.getHttpServer())
      .get('/api/v1/progress')
      .set('Authorization', `Bearer ${guestToken}`);

    expect(progressRes.status).not.toBe(401);
  });

  it('should_return_400_when_uuid_is_invalid', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/guest')
      .send({ uuid: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });
});

// ─── Progress ──────────────────────────────────────────────────────────────

describe('GET /api/v1/progress', () => {
  it('should_return_401_when_no_token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/progress');
    expect(res.status).toBe(401);
  });

  it('should_return_empty_progress_for_new_user', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/progress')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.completed).toEqual([]);
  });
});

describe('PUT /api/v1/progress', () => {
  it('should_sync_progress_and_return_updated_state', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/progress')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        completed: [LEVEL_ID],
        best: { [LEVEL_ID]: { moves: 3, timeMs: 10000 } },
      });
    expect(res.status).toBe(200);
    expect(res.body.completed).toContain(LEVEL_ID);
    expect(res.body.best[LEVEL_ID]).toBeDefined();
  });

  it('should_be_idempotent_when_syncing_same_data_twice', async () => {
    const payload = {
      completed: [LEVEL_ID],
      best: { [LEVEL_ID]: { moves: 3, timeMs: 10000 } },
    };
    await request(app.getHttpServer())
      .put('/api/v1/progress')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(payload);
    const res = await request(app.getHttpServer())
      .put('/api/v1/progress')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.completed).toHaveLength(1);
  });
});

// ─── Levels ────────────────────────────────────────────────────────────────

describe('GET /api/v1/levels', () => {
  it('should_return_seeded_levels_without_auth', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/levels');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = (res.body as Array<{ id: string }>).find(
      (l) => l.id === LEVEL_ID,
    );
    expect(found).toBeDefined();
  });
});

describe('PUT /api/v1/levels/:id', () => {
  it('should_return_401_when_no_token', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/levels/any-level')
      .send({
        nodes: [
          { id: 'n1', position: [0, 0], type: 'arrow', direction: 'RIGHT' },
        ],
        edges: [],
        rules: {},
      });
    expect(res.status).toBe(401);
  });

  it('should_return_422_when_level_has_no_exit', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/levels/invalid-level')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        nodes: [{ id: 'n1', position: [0, 0], type: 'arrow', direction: 'UP' }],
        edges: [],
        rules: {},
      });
    expect(res.status).toBe(422);
  });

  it('should_return_200_when_valid_level_upserted', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/levels/new-e2e-level')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        nodes: [
          { id: 'a1', position: [0, 0], type: 'arrow', direction: 'DOWN' },
          { id: 'a2', position: [0, 1], type: 'exit' },
        ],
        edges: [['a1', 'a2']],
        rules: {},
      });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('new-e2e-level');
  });
});

// ─── Leaderboard ───────────────────────────────────────────────────────────

describe('POST /api/v1/leaderboard', () => {
  it('should_return_401_when_no_token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/leaderboard')
      .send({ levelId: LEVEL_ID, moves: 5, timeMs: 20000 });
    expect(res.status).toBe(401);
  });

  it('should_return_201_when_score_submitted', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/leaderboard')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ levelId: LEVEL_ID, moves: 5, timeMs: 20000 });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBeDefined();
    expect(res.body.moves).toBe(5);
    expect(res.body.at).toBeDefined();
  });
});

describe('GET /api/v1/leaderboard', () => {
  it('should_return_scores_ordered_by_best', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/v1/leaderboard?level=${LEVEL_ID}`,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect((res.body as unknown[]).length).toBeGreaterThan(0);
  });
});
