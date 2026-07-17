# Capa 3 — Interface Adapters

Esta capa convierte datos entre el dominio y el mundo exterior (HTTP). Ninguna
clase aquí contiene lógica de negocio — solo mapea request → input de caso de
uso, y output de caso de uso → response.

Los repositorios TypeORM y sus mappers de persistencia viven en
`infrastructure/persistence/` (ver `infrastructure/README.md`), no aquí: son
detalles de almacenamiento, no de "adaptar HTTP". `auth.guard.ts` y
`cache.interceptor.ts` sí están en esta capa (`adapters/aop/`) porque son
aspectos de HTTP, no de infraestructura de arranque.

## controllers/

| Controller | Ruta | Caso de uso | Auth |
|---|---|---|---|
| `auth.controller.ts` | `POST /api/v1/auth/register` | `RegisterUserUseCase` | — |
| | `POST /api/v1/auth/login` | `LoginUseCase` | — |
| | `POST /api/v1/auth/guest` | `GuestLoginUseCase` | — |
| `player.controller.ts` | `PATCH /api/v1/player/me` | `UpdatePlayerNameUseCase` | ✅ |
| `progress.controller.ts` | `GET /api/v1/progress` | `GetProgressUseCase` | ✅ |
| | `PUT /api/v1/progress` | `SyncProgressUseCase` | ✅ |
| `level.controller.ts` | `GET /api/v1/levels` | `GetLevelsUseCase` | — |
| | `PUT /api/v1/levels/:id` | `UpsertLevelUseCase` | ✅ (autor) |
| `leaderboard.controller.ts` | `GET /api/v1/leaderboard?level={id}` | `GetLeaderboardUseCase` | — |
| | `GET /api/v1/leaderboard/global?top={n}` | `GetGlobalLeaderboardUseCase` | — |
| | `POST /api/v1/leaderboard` | `SubmitScoreUseCase` | ✅ |

## dtos/ (con `@ApiProperty` y `class-validator`)

- `auth.dto.ts` — `RegisterDto`, `LoginDto`, `GuestLoginDto`, `AuthResponseDto`, `UpdatePlayerNameDto`
- `progress.dto.ts` — `SyncProgressDto`, `ProgressResponseDto`
- `level.dto.ts` — `UpsertLevelDto`, `LevelResponseDto` y sub-DTOs (`BoardSizeDto`, `ArrowDefinitionDto`, `TrajectorySegmentDto`, `LevelRulesDto`)
- `leaderboard.dto.ts` — `SubmitScoreDto`, `ScoreEntryResponseDto`, `PlayerStandingResponseDto`

## decorators/

- `current-user.decorator.ts` — `@CurrentUser()`, extrae el `userId` verificado por `AuthGuard` del request.

## AOP — Aspectos en esta capa

| Aspecto | Mecanismo NestJS | Concern |
|---|---|---|
| `AuthGuard` (`adapters/aop/auth.guard.ts`) | `CanActivate` | Verifica el JWT antes de endpoints protegidos, expone `req.userId` |
| `CacheInterceptor` (`adapters/aop/cache.interceptor.ts`) | `NestInterceptor` | Caché de `GET /leaderboard*` |

Los aspectos globales (`LoggingInterceptor`, `MetricsInterceptor`,
`HttpExceptionFilter`) viven en `infrastructure/aop/` porque se cablean una
sola vez en `main.ts` para toda la app, no por controller — ver
`infrastructure/README.md`.

Estrategia AOP: todos envuelven un componente sin que este lo conozca
(Decorator/Proxy). El caso de uso nunca importa el aspecto — cumple LSP y OCP.
