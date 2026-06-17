# Capa 3 — Interface Adapters (TODO - Next Phase)

Esta capa convierte datos entre el dominio y el mundo exterior (HTTP, ORM).
Ninguna clase aquí contiene lógica de negocio.

## Archivos a implementar

### controllers/
- `auth.controller.ts` — `AuthController` («Controller»)
  - `POST /api/v1/auth/register` → llama `RegisterUserUseCase`
  - `POST /api/v1/auth/login`    → llama `LoginUseCase`
- `progress.controller.ts` — `ProgressController`
  - `GET  /api/v1/progress` → `GetProgressUseCase` [requiere AuthGuard]
  - `PUT  /api/v1/progress` → `SyncProgressUseCase` [requiere AuthGuard]
- `level.controller.ts` — `LevelController`
  - `GET /api/v1/levels`        → `GetLevelsUseCase`
  - `GET /api/v1/levels/:id`    → (extensión, misma repo)
  - `PUT /api/v1/levels/:id`    → `UpsertLevelUseCase` [requiere AuthGuard]
- `leaderboard.controller.ts` — `LeaderboardController`
  - `GET  /api/v1/leaderboard?level={id}` → `GetLeaderboardUseCase`
  - `POST /api/v1/leaderboard`            → `SubmitScoreUseCase` [requiere AuthGuard]

### dtos/ (con @ApiProperty y class-validator)
- `auth.dto.ts`        — `RegisterDto`, `LoginDto`, `AuthResponseDto`
- `progress.dto.ts`    — `SyncProgressDto`, `ProgressResponseDto`
- `level.dto.ts`       — `UpsertLevelDto`, `LevelResponseDto`
- `leaderboard.dto.ts` — `SubmitScoreDto`, `ScoreEntryResponseDto`

### repositories/  (implementan puertos del dominio — Adapter pattern)
- `typeorm-user.repository.ts`        — `TypeOrmUserRepository implements IUserRepository`
- `typeorm-progress.repository.ts`    — `TypeOrmProgressRepository implements IProgressRepository`
- `typeorm-level.repository.ts`       — `TypeOrmLevelRepository implements ILevelRepository`
- `typeorm-leaderboard.repository.ts` — `TypeOrmLeaderboardRepository implements ILeaderboardRepository`

### mappers/  (Anti-Corruption Layer — Entity ↔ ORM Model ↔ DTO)
- `user.mapper.ts`     — `UserMapper.toEntity()` / `toDto()`
- `level.mapper.ts`    — `LevelMapper.toEntity()` / `toDto()`
- `progress.mapper.ts` — `ProgressMapper.toEntity()` / `toDto()`

## AOP — Aspectos en esta capa (NestJS mechanisms)

| Aspecto               | Mecanismo NestJS      | Concern                                      |
|-----------------------|-----------------------|----------------------------------------------|
| `LoggingInterceptor`  | `NestInterceptor`     | Entrada/salida/duración de cada request      |
| `MetricsInterceptor`  | `NestInterceptor`     | Tiempo de operaciones costosas (RNF-01)      |
| `CacheInterceptor`    | `NestInterceptor`     | Caché de `GET /leaderboard`                  |
| `AuthGuard`           | `CanActivate`         | Verificación JWT antes de endpoints protegidos|
| `HttpExceptionFilter` | `ExceptionFilter`     | Mapea DomainError → respuesta HTTP uniforme  |

Estrategia AOP: todos envuelven un componente sin que este lo conozca (Decorator/Proxy SOLID).
El caso de uso nunca importa el aspecto — cumple LSP y OCP.
