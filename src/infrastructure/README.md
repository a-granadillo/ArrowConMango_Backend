# Capa 4 — Frameworks & Drivers

Detalles más volátiles y reemplazables: ORM, JWT, hashing, arranque de la
app. Si se cambia de TypeORM a Prisma, o de bcrypt a argon2, ninguna capa
interna se ve afectada.

## persistence/ (Anti-Corruption Layer — Entity ↔ ORM Model, Adapter pattern)

Los repositorios TypeORM y sus mappers viven juntos aquí (no en `adapters/`)
porque ambos son detalles de *cómo se guarda* el dato, no de *cómo llega por
HTTP* — ver `docs/adr/0002-layer-topology.md`.

- `typeorm-user.repository.ts` — `TypeOrmUserRepository implements IUserRepository`
- `typeorm-progress.repository.ts` — `TypeOrmProgressRepository implements IProgressRepository`
- `typeorm-level.repository.ts` — `TypeOrmLevelRepository implements ILevelRepository`
- `typeorm-leaderboard.repository.ts` — `TypeOrmLeaderboardRepository implements ILeaderboardRepository`
- `user.mapper.ts`, `level.mapper.ts`, `progress.mapper.ts`, `score-entry.mapper.ts` — `toDomain()` / `toOrm()`

## orm/

- `user.orm-entity.ts` — `UserOrmEntity`
- `progress.orm-entity.ts` — `PlayerProgressOrmEntity` (`best` es `simple-json`, por diseño — ver `docs/adr/0001-ranking-in-domain.md`)
- `level.orm-entity.ts` — `LevelDefinitionOrmEntity` (board+arrows como `simple-json`; `authorId` nullable)
- `score-entry.orm-entity.ts` — `ScoreEntryOrmEntity`
- `database.module.ts` — `TypeOrmModule.forRootAsync(...)`, SQLite (dev) o PostgreSQL (prod) vía `DB_DRIVER` en `.env`

## auth/

- `jwt-token.service.ts` — `JwtTokenService implements ITokenService`, usa `@nestjs/jwt`
- `bcrypt-hasher.ts` — `BcryptHasher implements IPasswordHasher`, `bcrypt.hash(plain, 12)`
- `auth.module.ts` — registra `JwtModule` (no usa PassportJS; el `AuthGuard` en `adapters/aop/` valida el JWT directamente vía `ITokenService`)

## config/

- `app.module.ts` — Composition Root: el único módulo que instancia implementaciones concretas (`useClass`) y las liga a los puertos del dominio vía tokens (`tokens.ts`). Los casos de uso se registran con `useFactory` para que sigan siendo agnósticos de NestJS.
- `env.config.ts` — carga y valida variables de entorno, consumido vía `ConfigService` (`ConfigModule.forRoot({ load: [envConfig] })`)
- `swagger.config.ts` — `SwaggerModule.setup('/api/docs', app, document)`
- `tokens.ts` — símbolos de inyección para los puertos (`USER_REPOSITORY`, `LEVEL_REPOSITORY`, `SCORE_STRATEGY`, etc.)

## aop/ (aspectos globales, cableados una sola vez en `main.ts`)

| Aspecto | Mecanismo NestJS | Concern |
|---|---|---|
| `LoggingInterceptor` | `NestInterceptor` global | Entrada/salida/duración de cada request |
| `MetricsInterceptor` | `NestInterceptor` global | Tiempo de operaciones costosas (RNF-01) |
| `HttpExceptionFilter` | `ExceptionFilter` global | Mapea `DomainError` → respuesta HTTP uniforme (incluye `LevelValidationError → 422`) |

(`AuthGuard` y `CacheInterceptor` son aspectos por-controller y viven en
`adapters/aop/` — ver `adapters/README.md`.)

## seed-data/ + seed.ts

`seed.ts` puebla los 15 niveles de campaña desde
`seed-data/campaign-levels.json` — una copia exacta del artefacto que exporta
el frontend (`tool/export_levels.dart` → `assets/levels/campaign_levels.json`).
No editar `campaign-levels.json` a mano: re-exportar desde el frontend y
copiar. Ejecutar con `npm run seed`.
