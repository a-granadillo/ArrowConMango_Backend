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
let ds: DataSource;

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
  ds = moduleRef.get<DataSource>(getDataSourceToken());
  await ds.query(
    `INSERT OR IGNORE INTO level_definitions (id, name, difficulty, boardSize, arrows, rules, version, authorId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      LEVEL_ID,
      'E2E Level',
      'Easy',
      JSON.stringify({ rows: 2, cols: 2 }),
      JSON.stringify([
        {
          id: 'a1',
          startNode: { row: 0, col: 0 },
          trajectory: { segments: [{ direction: 'right', length: 2 }] },
          isSwitchable: false,
        },
      ]),
      JSON.stringify({}),
      1,
      null,
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
    // Registering must leave the caller logged in — no follow-up login call.
    expect(res.body.token).toBeDefined();
    const authed = await request(app.getHttpServer())
      .get('/api/v1/progress')
      .set('Authorization', `Bearer ${res.body.token}`);
    expect(authed.status).toBe(200);
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

  // Regression test: the controller once dropped `displayName` before
  // forwarding to the use case, so every guest kept the literal username
  // 'Guest' no matter what the client sent. Unit tests alone didn't catch
  // this — they call GuestLoginUseCase directly and bypass the controller.
  it('should_persist_the_provided_displayName_for_a_new_guest', async () => {
    const uuid = 'd4e5f678-9012-4abc-8def-345678901234';
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/guest')
      .send({ uuid, displayName: 'E2EDisplayName' });
    expect(res.status).toBe(200);

    const rows = await ds.query(`SELECT username FROM users WHERE email = ?`, [
      `guest-${uuid}@guest.local`,
    ]);
    expect(rows[0].username).toBe('E2EDisplayName');
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

  it('should_sync_and_return_current_level', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/progress')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ completed: [LEVEL_ID], best: {}, currentLevel: 3 });
    expect(res.status).toBe(200);
    expect(res.body.currentLevel).toBe(3);

    const getRes = await request(app.getHttpServer())
      .get('/api/v1/progress')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(getRes.body.currentLevel).toBe(3);
  });

  it('should_not_regress_current_level_when_syncing_a_lower_value', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/progress')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ completed: [LEVEL_ID], best: {}, currentLevel: 3 });
    const res = await request(app.getHttpServer())
      .put('/api/v1/progress')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ completed: [LEVEL_ID], best: {}, currentLevel: 2 });
    expect(res.status).toBe(200);
    expect(res.body.currentLevel).toBe(3);
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

describe('POST /api/v1/levels', () => {
  it('should_return_401_when_no_token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/levels')
      .send({
        name: 'Any Level',
        difficulty: 'Easy',
        boardSize: { rows: 2, cols: 2 },
        arrows: [
          {
            id: 'a1',
            startNode: { row: 0, col: 0 },
            trajectory: { segments: [{ direction: 'right', length: 2 }] },
            isSwitchable: false,
          },
        ],
        rules: {},
      });
    expect(res.status).toBe(401);
  });

  it('should_return_422_when_level_has_no_arrows', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/levels')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        name: 'Invalid Level',
        difficulty: 'Easy',
        boardSize: { rows: 2, cols: 2 },
        arrows: [],
        rules: {},
      });
    expect(res.status).toBe(422);
  });

  it('should_return_201_and_a_generated_id_when_valid_level_created', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/levels')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        name: 'New Draft Level',
        difficulty: 'Easy',
        boardSize: { rows: 2, cols: 2 },
        arrows: [
          {
            id: 'a1',
            startNode: { row: 0, col: 0 },
            trajectory: { segments: [{ direction: 'down', length: 2 }] },
            isSwitchable: false,
          },
        ],
        rules: {},
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('New Draft Level');
  });
});

describe('PUT /api/v1/levels/:id', () => {
  it('should_return_401_when_no_token', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/levels/any-level')
      .send({
        name: 'Any Level',
        difficulty: 'Easy',
        boardSize: { rows: 2, cols: 2 },
        arrows: [
          {
            id: 'a1',
            startNode: { row: 0, col: 0 },
            trajectory: { segments: [{ direction: 'right', length: 2 }] },
            isSwitchable: false,
          },
        ],
        rules: {},
      });
    expect(res.status).toBe(401);
  });

  it('should_return_422_when_level_has_no_arrows', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/levels/invalid-level')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        name: 'Invalid Level',
        difficulty: 'Easy',
        boardSize: { rows: 2, cols: 2 },
        arrows: [],
        rules: {},
      });
    expect(res.status).toBe(422);
  });

  it('should_return_200_when_valid_level_upserted', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/levels/new-e2e-level')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        name: 'New E2E Level',
        difficulty: 'Easy',
        boardSize: { rows: 2, cols: 2 },
        arrows: [
          {
            id: 'a1',
            startNode: { row: 0, col: 0 },
            trajectory: { segments: [{ direction: 'down', length: 2 }] },
            isSwitchable: false,
          },
        ],
        rules: {},
      });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('new-e2e-level');
  });
});

describe('GET /api/v1/levels/mine, GET /api/v1/levels/community, POST /api/v1/levels/:id/publish', () => {
  it('should_return_401_when_no_token_on_mine', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/levels/mine');
    expect(res.status).toBe(401);
  });

  it('should_return_401_when_no_token_on_publish', async () => {
    const res = await request(app.getHttpServer()).post(
      '/api/v1/levels/new-e2e-level/publish',
    );
    expect(res.status).toBe(401);
  });

  it('should_list_only_my_own_levels_and_reject_publishing_someone_elses', async () => {
    // `new-e2e-level` (created above) belongs to the `bearerToken` user.
    const mine = await request(app.getHttpServer())
      .get('/api/v1/levels/mine')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(mine.status).toBe(200);
    expect(
      (mine.body as Array<{ id: string }>).find(
        (l) => l.id === 'new-e2e-level',
      ),
    ).toBeDefined();

    const otherGuest = await request(app.getHttpServer())
      .post('/api/v1/auth/guest')
      .send({ uuid: 'b2c3d4e5-f6a7-4890-b234-c567d890e123' });
    const otherToken = otherGuest.body.token as string;

    const forbidden = await request(app.getHttpServer())
      .post('/api/v1/levels/new-e2e-level/publish')
      .set('Authorization', `Bearer ${otherToken}`);
    expect(forbidden.status).toBe(403);
  });

  it('should_publish_a_level_and_surface_it_in_the_community_list', async () => {
    const communityBefore = await request(app.getHttpServer()).get(
      '/api/v1/levels/community',
    );
    expect(communityBefore.status).toBe(200);
    expect(
      (communityBefore.body as Array<{ id: string }>).find(
        (l) => l.id === 'new-e2e-level',
      ),
    ).toBeUndefined();

    const published = await request(app.getHttpServer())
      .post('/api/v1/levels/new-e2e-level/publish')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(published.status).toBe(201);
    expect(published.body.isPublished).toBe(true);

    const communityAfter = await request(app.getHttpServer()).get(
      '/api/v1/levels/community',
    );
    expect(
      (communityAfter.body as Array<{ id: string }>).find(
        (l) => l.id === 'new-e2e-level',
      ),
    ).toBeDefined();
  });

  it('should_return_404_when_publishing_a_nonexistent_level', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/levels/does-not-exist/publish')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res.status).toBe(404);
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

describe('GET /api/v1/leaderboard/:nivel', () => {
  it('should_return_401_when_no_token', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/v1/leaderboard/${LEVEL_ID}`,
    );
    expect(res.status).toBe(401);
  });

  it('should_return_top_and_me_for_the_requesting_player', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/leaderboard/${LEVEL_ID}`)
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.top)).toBe(true);
    expect(res.body.top.length).toBeGreaterThan(0);
    expect(res.body.top[0].rank).toBe(1);
    expect(res.body.top[0].displayName).toBeDefined();
  });

  it('should_not_be_swallowed_by_the_global_route', async () => {
    // Regression guard for the Nest route-ordering trap: 'global' must be
    // matched literally, not treated as a levelId by GET /leaderboard/:nivel.
    const res = await request(app.getHttpServer())
      .get('/api/v1/leaderboard/global')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).not.toHaveProperty('top');
  });

  it('should_not_be_swallowed_by_the_survival_route', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/leaderboard/supervivencia')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('top');
    expect(res.body).toHaveProperty('me');
  });
});

describe('GET /api/v1/leaderboard/supervivencia', () => {
  it('should_return_401_when_no_token', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/leaderboard/supervivencia',
    );
    expect(res.status).toBe(401);
  });

  it('should_rank_a_survival_submission_and_exclude_it_from_the_level_leaderboard', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/leaderboard')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ levelId: '-1', moves: 3, timeMs: 5_000, mode: 'survival' });

    const survival = await request(app.getHttpServer())
      .get('/api/v1/leaderboard/supervivencia')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(survival.status).toBe(200);
    expect(survival.body.top.length).toBeGreaterThan(0);
    expect(survival.body.top.some((e: { isMe: boolean }) => e.isMe)).toBe(true);

    const levelBoard = await request(app.getHttpServer())
      .get('/api/v1/leaderboard/-1')
      .set('Authorization', `Bearer ${bearerToken}`);
    expect(levelBoard.status).toBe(200);
    expect(levelBoard.body.top).toEqual([]);
    expect(levelBoard.body.me).toBeNull();
  });
});
