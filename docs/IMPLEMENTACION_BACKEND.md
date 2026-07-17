# Documentación de Implementación — Backend Arrow con Mango

> Versión 2.0 — Implementación completa: Dominio + Aplicación + Interface Adapters + Frameworks & Drivers

---

## 1. Contexto y objetivos

**Arrow con Mango** es un clon del juego *Arrow Maze – Escape Puzzle* (SayGames Ltd.).
El backend es una API REST que gestiona autenticación JWT, sincronización de progreso,
tabla de clasificación global y definición remota de niveles (RF-B-01 a RF-B-07 del SRS).

Este documento explica **qué se implementó en las Fases 1 y 2**, por qué se tomó cada decisión
de diseño, y cómo se mapea a Clean Architecture + DDD + principios SOLID + patrones GoF + AOP.
El backend está completamente operativo: **86 pruebas verdes** (unit + integración + E2E),
API arrancando con NestJS + SQLite, y Swagger disponible en `/api/docs`.

---

## 2. Arquitectura: Clean Architecture + Hexagonal (Puertos y Adaptadores)

### 2.1 Las cuatro capas y la regla de dependencia

```
┌──────────────────────────────────────────────────────────┐
│  (4) Frameworks & Drivers                                 │  NestJS, TypeORM, SQLite/Postgres,
│   ┌─────────────────────────────────────────────────┐    │  bcrypt, jsonwebtoken, Swagger
│   │  (3) Interface Adapters                          │    │  Controllers, TypeOrm*Repository,
│   │   ┌──────────────────────────────────────────┐  │    │  JwtTokenService, BcryptHasher,
│   │   │  (2) Application (Use Cases)              │  │    │  Mappers, DTOs (class-validator),
│   │   │   ┌───────────────────────────────────┐  │  │    │  AOP Interceptors/Guards/Filters
│   │   │   │  (1) Domain (Entities)             │  │  │    │
│   │   │   │  User, PlayerProgress,             │  │  │    │  UseCase<I,O> + 8 casos de uso
│   │   │   │  LevelDefinition, Leaderboard,     │  │  │    │  DTOs de aplicación (sin Nest)
│   │   │   │  ScoreEntry, Score, Email,         │  │  │    │
│   │   │   │  UserId, LevelId, PasswordHash,    │  │  │    │  ← implementado en Fase 1
│   │   │   │  DomainErrors, Ports,              │  │  │    │
│   │   │   │  IScoreCalculationStrategy         │  │  │    │
│   │   │   └───────────────────────────────────┘  │  │    │
│   │   └──────────────────────────────────────────┘  │    │
│   └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
          ← las dependencias apuntan siempre hacia adentro →
```

**Regla de dependencia (SRS §4.1):** ningún módulo de la capa N puede importar algo de la capa N+1.
El dominio no conoce NestJS, TypeORM, bcrypt ni HTTP. Los casos de uso no conocen controllers ni ORMs.

### 2.2 Mapeo DDD ↔ Clean Architecture (según SRS §4.2)

| Concepto DDD | Capa Clean | Archivos en este proyecto |
|---|---|---|
| Value Objects | (1) Domain | `email.vo.ts`, `score.vo.ts`, `user-id.vo.ts`, `level-id.vo.ts`, `password-hash.vo.ts` |
| Aggregate Roots / Entities | (1) Domain | `user.entity.ts`, `player-progress.entity.ts`, `level-definition.entity.ts`, `leaderboard.entity.ts`, `score-entry.entity.ts` |
| Domain Services / Strategy | (1) Domain | `score-calculation.strategy.ts` |
| Domain Errors | (1) Domain | `domain-error.ts` |
| Ports (interfaces de repo) | (1) Domain | `user.repository.ts`, `progress.repository.ts`, `level.repository.ts`, `leaderboard.repository.ts`, `token.service.ts`, `password-hasher.ts` |
| Use Cases | (2) Application | `register-user`, `login`, `get-progress`, `sync-progress`, `get-levels`, `upsert-level`, `get-leaderboard`, `submit-score` |
| Controllers, Repos impl, Mappers, DTOs | (3) Adapters | `auth.controller.ts`, `progress.controller.ts`, `level.controller.ts`, `leaderboard.controller.ts`; `TypeOrm*Repository`; `UserMapper`, `ProgressMapper`, `LevelMapper`, `ScoreEntryMapper`; DTOs validados |
| NestJS, TypeORM, JWT, bcrypt | (4) Infrastructure | `database.module.ts`, `UserOrmEntity`, `auth.module.ts`, `JwtTokenService`, `BcryptHasher`, `app.module.ts`, `main.ts`, 5 aspectos AOP |

### 2.3 Hexagonal (Puertos y Adaptadores)

La arquitectura hexagonal complementa Clean Architecture: el hexágono central (dominio + aplicación)
se comunica con el exterior **solo a través de puertos (interfaces)**. Los adaptadores (capa 3-4)
implementan esos puertos.

```
         [Flutter Client]        [Admin HTTP]
               │                      │
          [Controllers]          [AuthGuard]          ← Capa 3 (Adaptadores)
               │                      │
        [Use Cases] ──────── [UseCase<I,O>]           ← Capa 2 (Aplicación)
               │                      │
    [IUserRepository]    [ITokenService]              ← Puertos (interfaces en Dominio)
               │                      │
    [TypeOrmUserRepo]  [JwtTokenService]              ← Capa 4 (Infraestructura)
               │
          [PostgreSQL / SQLite]
```

---

## 3. Capa 1 — Dominio

### 3.1 Value Objects

Los VOs son **inmutables**, **sin identidad**, comparables por valor (no por referencia).
Se crean vía factories estáticos que validan en el momento de construcción (fail-fast).

#### `Email`
```typescript
// src/domain/value-objects/email.vo.ts
static create(raw: string): Email {
  const normalised = raw.trim().toLowerCase();
  if (!Email.PATTERN.test(normalised)) throw new InvalidEmailError(raw);
  return new Email(normalised);  // constructor privado: garantiza instancias válidas
}
```
**Por qué:** El dominio nunca puede tener un `Email` inválido en memoria. Si la validación
estuviera en el controller, podría llegar un email mal formado al dominio.

#### `Score`
```typescript
// src/domain/value-objects/score.vo.ts
value(): number {
  const BASE = 10_000;
  return Math.max(0, BASE - this._moves * 10 - Math.floor(this._timeMs * 0.1));
}
```
**Por qué:** `Score` encapsula la derivación del puntaje. Esto evita que la lógica se duplique
en controllers, presenters y pruebas. Las estrategias (`IScoreCalculationStrategy`) pueden
override este cálculo sin modificar el VO (OCP).

#### `PasswordHash`
```typescript
// src/domain/value-objects/password-hash.vo.ts
static fromHash(hash: string): PasswordHash { ... }
toString(): string { return '[PasswordHash]'; }
```
**Por qué:** El VO envuelve el hash ya generado (bcrypt lo genera en infraestructura).
`toString()` oculta el hash para evitar leaks accidentales en logs (seguridad, RNF-07).

### 3.2 Entidades y Aggregate Roots

#### `User` — decisión de diseño crítica

```typescript
// src/domain/entities/user.entity.ts
async verify(plainPassword: string, hasher: IPasswordHasher): Promise<boolean> {
  return hasher.compare(plainPassword, this._pass);
}
```

El diagrama muestra `verify(pwd): bool`. Sin embargo, importar bcrypt directamente en la entidad
violaría la regla de dependencia (el dominio importaría infraestructura). La solución es pasar
`IPasswordHasher` como parámetro — el caller (caso de uso) inyecta el hasher. La entidad
permanece framework-agnostic y es 100% testeable con un mock.

#### `PlayerProgress.merge()` — idempotencia de sincronización

```typescript
merge(other: PlayerProgress): void {
  for (const levelId of other._completed) this._completed.add(levelId);
  for (const [levelId, score] of other._best) {
    const existing = this._best.get(levelId);
    if (!existing || score.isBetterThan(existing)) this._best.set(levelId, score);
  }
}
```

**Por qué:** La sincronización es "oportunista" (el cliente puede reenviar el mismo progreso
múltiples veces sin conexión estable). La merge debe ser idempotente: `send(A); send(A)` ≡ `send(A)`.
Esto es un invariante del dominio, no una regla de infraestructura (RF-B-02, Guía §9).

#### `LevelDefinition.validate()` — integridad del grafo

```typescript
validate(): boolean {
  // 1. Todas las aristas referencian nodos existentes
  // 2. Existe al menos un nodo tipo 'exit'
  // 3. Existe al menos un nodo tipo 'arrow'
}
```

**Por qué:** Permite al administrador publicar niveles sin recompilar la app (RF-B-04).
La validación en el dominio evita que la base de datos almacene un nivel inválido.

### 3.3 Puertos (Interfaces de Repositorio y Servicios)

```typescript
// src/domain/ports/user.repository.ts
export interface IUserRepository {
  byEmail(email: Email): Promise<User | null>;
  byId(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
}
```

**Por qué viven en el dominio:** Los casos de uso dependen de estos puertos, no de implementaciones
concretas. Si mañana se cambia TypeORM por Prisma, o PostgreSQL por MongoDB, ningún caso de uso
cambia. Esto es DIP en su expresión más pura.

### 3.4 Errores de Dominio

```typescript
// src/domain/errors/domain-error.ts
export abstract class DomainError extends Error { ... }
export class InvalidEmailError extends DomainError { ... }
export class EmailAlreadyInUseError extends DomainError { ... }
export class InvalidCredentialsError extends DomainError { ... }
export class LevelValidationError extends DomainError { ... }
```

**Por qué:** Los errores de dominio son puros (sin código HTTP). El `HttpExceptionFilter` de NestJS
(capa 3, AOP) los mapea a `400`, `401`, `404`, etc. El dominio no conoce HTTP.

### 3.5 Servicio de Dominio — `IScoreCalculationStrategy`

```typescript
// src/domain/services/score-calculation.strategy.ts
export interface IScoreCalculationStrategy {
  compute(score: Score): number;
}
export class MovesBasedScore implements IScoreCalculationStrategy { ... }
export class TimeBasedScore implements IScoreCalculationStrategy { ... }
export class MixedScore implements IScoreCalculationStrategy { ... }
export class MangoScore implements IScoreCalculationStrategy { ... } // usada en producción
```

**Patrón Strategy, pero una sola instancia global — no por nivel.** El diseño
original de este documento planteaba una estrategia *por nivel* ("un nivel de
velocidad usa `TimeBasedScore`"). Al implementar el leaderboard global (F5) se
optó por una única strategy (`MangoScore`, inyectada vía el token
`SCORE_STRATEGY` en `app.module.ts`) para todo el juego. Razón: el ranking
global sumaría los `compute()` de niveles distintos para obtener `mangos`; si
cada nivel puntuara con una fórmula distinta, esos números no serían
comparables entre sí y la suma no significaría nada. La igualación real ocurre
un nivel más arriba — `MangoRating`/`MangoStars` convierte el puntaje en 1-3
estrellas con los mismos umbrales en cualquier nivel, y **eso** es lo que se
suma en el ranking global (ver `docs/adr/0001-ranking-in-domain.md`). El
patrón Strategy se conserva (y se prueba intercambiando `TimeBasedScore` en
`get-leaderboard.use-case.ts`'s test) por si en el futuro se necesita una
estrategia distinta para el Modo Creativo, pero hoy no hay `if (tipo ===
'speed')` porque no hay ramificación en absoluto: todo el juego usa la misma.

---

## 4. Capa 2 — Aplicación (Casos de Uso)

### 4.1 Interfaz `UseCase<I, O>`

```typescript
// src/application/shared/use-case.ts
export interface UseCase<I, O> {
  execute(input: I): Promise<O>;
}
```

**Por qué esta abstracción:** Un objeto que implementa `UseCase<I,O>` puede ser envuelto por un
decorador que también implementa `UseCase<I,O>`. Esto es la base del patrón AOP (ver §6).

### 4.2 Los 8 casos de uso

Cada caso de uso:
1. Está en su **propio archivo** (SRP: una única razón de cambio).
2. **Implementa** `UseCase<I,O>` (para habilitar decoradores AOP).
3. Recibe sus puertos **por constructor** (DIP: nunca `new TypeOrmUserRepository()`).
4. Lanza **DomainErrors** (no HttpException: eso es capa 3).

| Caso de uso | Puertos usados | Error propio |
|---|---|---|
| `RegisterUserUseCase` | `IUserRepository`, `IPasswordHasher` | `EmailAlreadyInUseError`, `InvalidEmailError` |
| `LoginUseCase` | `IUserRepository`, `IPasswordHasher`, `ITokenService` | `InvalidCredentialsError` |
| `GetProgressUseCase` | `IProgressRepository` | — (devuelve vacío si no existe) |
| `SyncProgressUseCase` | `IProgressRepository` | — |
| `GetLevelsUseCase` | `ILevelRepository` | — |
| `UpsertLevelUseCase` | `ILevelRepository` | `LevelValidationError` |
| `GetLeaderboardUseCase` | `ILeaderboardRepository` | — |
| `SubmitScoreUseCase` | `ILeaderboardRepository` | — |

**Ejemplo completo (RegisterUserUseCase):**
```typescript
export class RegisterUserUseCase implements UseCase<RegisterInput, RegisterOutput> {
  constructor(
    private readonly userRepo: IUserRepository,    // DIP: interfaz, no implementación
    private readonly hasher: IPasswordHasher,       // DIP
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
    const email = Email.create(input.email);        // valida en el dominio
    const existing = await this.userRepo.byEmail(email);
    if (existing) throw new EmailAlreadyInUseError(input.email);
    const passwordHash = await this.hasher.hash(input.password);
    const user = User.create(email, passwordHash, input.username);
    await this.userRepo.save(user);
    return { id: user.id.value, email: user.email.value, username: user.username };
  }
}
```

---

## 5. Principios SOLID — Evidencia en el código

### S — Single Responsibility Principle
- `RegisterUserUseCase` registra usuarios. `LoginUseCase` autentica. `SyncProgressUseCase` sincroniza.
  Ningún caso de uso hace más de una cosa.
- `Email` solo valida y representa un email. `Score` solo representa una puntuación.
- Los errores de dominio son clases separadas, no un enum monolítico.

### O — Open/Closed Principle
- `IScoreCalculationStrategy`: para añadir un nuevo algoritmo de puntuación se crea una nueva clase
  (`SpeedrunScore`) **sin modificar** los casos de uso ni el VO `Score`.
- `LevelDefinition`: nuevos tipos de nodo (`type: 'teleport'`) se añaden al enum sin tocar
  la lógica de validación del grafo.

### L — Liskov Substitution Principle
- Cualquier implementación de `IUserRepository` (TypeORM con PostgreSQL, TypeORM con SQLite, o
  un mock en memoria para tests) puede sustituirse donde se espera `IUserRepository` sin cambiar
  el comportamiento observable del caso de uso.
- `MovesBasedScore`, `TimeBasedScore` y `MixedScore` son intercambiables donde se espera
  `IScoreCalculationStrategy`.

### I — Interface Segregation Principle
- `IUserRepository`: solo `byEmail`, `byId`, `save`. No incluye operaciones de `Leaderboard`.
- `ILeaderboardRepository`: solo `top` y `add`. No incluye operaciones de `User`.
- `UseCase<I,O>`: interfaz de un único método. No agrega métodos innecesarios.

### D — Dependency Inversion Principle
- `RegisterUserUseCase` depende de `IUserRepository` (abstracción), nunca de
  `TypeOrmUserRepository` (implementación concreta).
- `User.verify()` depende de `IPasswordHasher` (abstracción), no de `bcrypt` (librería concreta).
- El único lugar donde se instancian implementaciones concretas es el **Composition Root**
  (`app.module.ts`, capa 4) — que aún es TODO.

---

## 6. Patrones de Diseño GoF — Implementados

### Creacionales

#### Factory Method (estático en Value Objects y Entidades)
```typescript
// Ejemplo: Email.create() — never expose constructor directly
const email = Email.create('user@test.com');  // ✓
// const email = new Email('user@test.com'); // ✗ imposible (constructor privado)

// ScoreEntry.reconstitute() — factory para rehidratar desde BD (preserva timestamp original)
static reconstitute(userId, levelId, score, at: Date): ScoreEntry { ... }
// ScoreEntry.create() — factory para nuevas entradas (sella at = new Date())
static create(userId, levelId, score): ScoreEntry { ... }
```
Los VOs y entidades exponen factories estáticos con semántica explícita. `reconstitute` vs `create`
distingue rehidratación de la BD de creación nueva — decisión de dominio que preserva la integridad
del timestamp sin contaminar el dominio con lógica de ORM.

#### Singleton (NestJS IoC — implementado)
NestJS registra los proveedores como singletons por defecto. `JwtTokenService`, `BcryptHasher`,
`TypeOrm*Repository`, `AuthGuard` y los 5 aspectos AOP tienen una única instancia durante el
ciclo de vida de la aplicación. Los aspectos globales (`LoggingInterceptor`, `MetricsInterceptor`,
`HttpExceptionFilter`) se registran una vez en `main.ts`.

### Estructurales

#### Adapter (implementado — Fase 2)
```typescript
// src/infrastructure/auth/jwt-token.service.ts
@Injectable()
export class JwtTokenService implements ITokenService {
  sign(userId: UserId): string { return jwt.sign({ sub: userId.value }, secret, { expiresIn }); }
  verify(token: string): UserId { /* jwt.verify + error → UnauthorizedError */ }
}

// src/infrastructure/auth/bcrypt-hasher.ts
@Injectable()
export class BcryptHasher implements IPasswordHasher {
  async hash(plain: string): Promise<PasswordHash> { return PasswordHash.fromHash(await bcrypt.hash(plain, 12)); }
  async compare(plain: string, hash: PasswordHash): Promise<boolean> { return bcrypt.compare(plain, hash.hash); }
}
```
El dominio nunca importa `jsonwebtoken` ni `bcrypt`. Los adaptadores traducen la API de la librería
al contrato del puerto, manteniendo la regla de dependencia intacta.

#### Repository (implementado — Fase 2)
```typescript
// src/adapters/repositories/typeorm-user.repository.ts
@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  async byEmail(email: Email): Promise<User | null> { /* TypeORM query + UserMapper.toDomain */ }
  async byId(id: UserId): Promise<User | null> { ... }
  async save(user: User): Promise<void> { /* UserMapper.toOrm + repo.save */ }
}
```
Los 4 repositorios (`TypeOrmUserRepository`, `TypeOrmProgressRepository`, `TypeOrmLevelRepository`,
`TypeOrmLeaderboardRepository`) son Adapters que implementan los puertos del dominio usando TypeORM.
La sustitución LSP es real: los tests de integración usan las implementaciones reales con SQLite `:memory:`.

#### Mapper / Anti-Corruption Layer (implementado — Fase 2)
```typescript
// src/adapters/mappers/user.mapper.ts
export class UserMapper {
  static toDomain(orm: UserOrmEntity): User { /* User.reconstitute de ORM → dominio */ }
  static toOrm(user: User): UserOrmEntity { /* dominio → ORM entity */ }
}
```
Los 4 mappers (`UserMapper`, `ProgressMapper`, `LevelMapper`, `ScoreEntryMapper`) actúan como
Anti-Corruption Layer: traducen entre el modelo de persistencia (columnas ORM) y el modelo de dominio
(VOs, Aggregate Roots). `ProgressMapper` convierte `Map<string, Score>` ↔ `Record<string, {moves,timeMs}>`.

#### Decorator / AOP (explicado en §7)

### De Comportamiento

#### Strategy (implementado — Fase 1)
```typescript
// src/domain/services/score-calculation.strategy.ts
interface IScoreCalculationStrategy { compute(score: Score): number; }
class MovesBasedScore implements IScoreCalculationStrategy { ... }
class TimeBasedScore implements IScoreCalculationStrategy { ... }
class MixedScore implements IScoreCalculationStrategy { ... }
```
La estrategia se inyecta en el contexto; el consumidor llama `strategy.compute(score)` sin saber
cuál estrategia concreta está activa.

#### Command + State (cliente Flutter — no aplica al backend)
Estos patrones son propios del agregado `GameSession`, que reside en el cliente Flutter.

---

## 7. Programación Orientada a Aspectos (AOP)

### 7.1 Estrategia SOLID sin librerías AOP

La Guía §7 especifica implementar AOP mediante el **patrón Decorator** sobre la interfaz `UseCase<I,O>`.
Esto separa los *cross-cutting concerns* (logging, métricas, caché, autorización) del código de negocio.

**El caso de uso no sabe que está siendo decorado.** Este es el principio AOP aplicado con SOLID:

```typescript
// Aspecto de Logging — envuelve cualquier UseCase<I,O>
class LoggingUseCase<I, O> implements UseCase<I, O> {
  constructor(
    private readonly inner: UseCase<I, O>,  // composición, no herencia
    private readonly log: Logger,
  ) {}

  async execute(input: I): Promise<O> {
    this.log.info(`IN  [${this.inner.constructor.name}]`);
    const start = Date.now();
    try {
      const result = await this.inner.execute(input);
      this.log.info(`OUT [${this.inner.constructor.name}] ${Date.now() - start}ms`);
      return result;
    } catch (err) {
      this.log.error(`ERR [${this.inner.constructor.name}] ${err}`);
      throw err;
    }
  }
}

// En el Composition Root (capa 4):
const rawUseCase = new RegisterUserUseCase(userRepo, hasher);
const decoratedUseCase = new LoggingUseCase(rawUseCase, logger);
// decoratedUseCase.execute(...) → loggea → delega en rawUseCase.execute(...)
```

### 7.2 Aspectos implementados (Fase 2 — NestJS)

En NestJS, los aspectos se expresan con mecanismos nativos. Los 5 aspectos están implementados
en `src/infrastructure/aop/`:

| Aspecto | Mecanismo NestJS | Archivo | Registro |
|---|---|---|---|
| **LoggingInterceptor** | `NestInterceptor` | `aop/logging.interceptor.ts` | Global (`main.ts`) |
| **MetricsInterceptor** | `NestInterceptor` | `aop/metrics.interceptor.ts` | Global (`main.ts`) |
| **CacheInterceptor** | `NestInterceptor` | `aop/cache.interceptor.ts` | Por-ruta `@UseInterceptors(new CacheInterceptor(30))` |
| **AuthGuard** | `CanActivate` | `aop/auth.guard.ts` | Por-ruta `@UseGuards(AuthGuard)` |
| **HttpExceptionFilter** | `ExceptionFilter` | `aop/http-exception.filter.ts` | Global (`main.ts`) |

**Decisión D1 — Use-cases framework-agnostic:** Los casos de uso son clases TypeScript puras sin
`@Injectable()`. El `app.module.ts` los cablea mediante `useFactory` + `inject`:
```typescript
// src/infrastructure/config/app.module.ts — Composition Root
{ provide: RegisterUserUseCase,
  useFactory: (repo: IUserRepository, hasher: IPasswordHasher) => new RegisterUserUseCase(repo, hasher),
  inject: [USER_REPOSITORY, PASSWORD_HASHER] }
```

**Decisión D2 — Tokens de DI:** Las interfaces no existen en runtime (TypeScript las borra).
Se usan tokens string (`USER_REPOSITORY`, `TOKEN_SERVICE`, etc.) definidos en `src/infrastructure/config/tokens.ts`.

**HttpExceptionFilter — único punto de mapeo DomainError → HTTP:**
```typescript
// src/infrastructure/aop/http-exception.filter.ts
// @Catch() — captura cualquier excepción, tanto DomainError como Error genérico
EmailAlreadyInUseError          → 409 Conflict
InvalidCredentialsError         → 401 Unauthorized
UnauthorizedError               → 401 Unauthorized
InvalidEmailError               → 422 Unprocessable Entity
LevelValidationError            → 422 Unprocessable Entity
UserNotFoundError               → 404 Not Found
LevelNotFoundError              → 404 Not Found
(cualquier otro Error)          → 500 Internal Server Error
```

**AuthGuard — extracción de identidad:**
El guard extrae el Bearer token del header `Authorization`, llama a `ITokenService.verify(token)`,
y deposita `userId.value` en `request.userId`. El decorator `@CurrentUser()` (capa 3) lo recupera
en los controllers. Los endpoints protegidos son: `GET /progress`, `PUT /progress`,
`PUT /levels/:id` (RF-B-07), `POST /leaderboard`.

**CacheInterceptor — caché en memoria con TTL:**
Implementación propia basada en `Map<string, {body, expiresAt}>`. Solo actúa en GET.
TTL configurado a 30 segundos en `GET /leaderboard` para reducir carga en consultas frecuentes.

---

## 8. Estructura de archivos (Fases 1 y 2)

```
backend/
├── package.json            # deps: nestjs, typeorm, sqlite3, bcrypt, jwt, uuid, jest, supertest
├── tsconfig.json           # strict TS, path aliases @domain/* @application/*
├── tsconfig.build.json     # extiende tsconfig; noEmit: false; excluye test/**
├── nest-cli.json           # sourceRoot: "src"
├── jest.config.js          # ts-jest, testMatch spec+e2e, path aliases, timeout 30s
├── .env.example            # DB_DRIVER, DB_PATH, JWT_SECRET, JWT_EXPIRES_IN, PORT
├── .gitignore
├── README.md               # Getting Started, Architecture, API endpoints, SOLID, AOP
├── src/
│   ├── domain/                          ← Capa 1 (sin dependencias externas)
│   │   ├── value-objects/               # email, score, user-id, level-id, password-hash
│   │   ├── entities/                    # user, player-progress, level-definition,
│   │   │                               #   leaderboard, score-entry (+ reconstitute)
│   │   ├── services/                    # score-calculation.strategy (Strategy)
│   │   ├── errors/                      # domain-error + 6 errores tipados
│   │   └── ports/                       # 6 interfaces de repositorio/servicio
│   ├── application/                     ← Capa 2 (solo TS puro, sin NestJS)
│   │   ├── shared/use-case.ts           # UseCase<I,O> — habilita AOP Decorator
│   │   ├── dtos/                        # tipos planos (auth, progress, level, leaderboard)
│   │   └── use-cases/                   # 8 casos de uso, uno por archivo (SRP)
│   ├── adapters/                        ← Capa 3 (Interface Adapters)
│   │   ├── controllers/                 # auth, progress, level, leaderboard
│   │   ├── dtos/                        # DTOs con @IsEmail/@IsString/@ApiProperty
│   │   ├── mappers/                     # UserMapper, ProgressMapper, LevelMapper, ScoreEntryMapper
│   │   ├── repositories/               # TypeOrmUserRepository, TypeOrmProgressRepository,
│   │   │                               #   TypeOrmLevelRepository, TypeOrmLeaderboardRepository
│   │   └── decorators/                 # @CurrentUser() param decorator
│   └── infrastructure/                  ← Capa 4 (Frameworks & Drivers)
│       ├── orm/                         # ORM entities + database.module.ts (SQLite/PostgreSQL)
│       ├── auth/                        # JwtTokenService, BcryptHasher, auth.module.ts
│       ├── aop/                         # logging, metrics, cache interceptors; auth.guard; http-exception.filter
│       ├── config/                      # app.module.ts (Composition Root), tokens.ts, swagger.config.ts, env.config.ts
│       ├── seed.ts                      # seed de niveles de ejemplo en SQLite
│       └── main.ts                      # bootstrap NestJS (global prefix, filters, interceptors, Swagger)
└── test/
    ├── unit/
    │   ├── domain/                      # value-objects.spec.ts, entities.spec.ts (25 tests)
    │   ├── application/                 # register-user, login, sync-progress,
    │   │                               #   leaderboard, levels (28 tests)
    │   └── infrastructure/              # auth-adapters.spec.ts: JwtTokenService, BcryptHasher,
    │                                   #   ScoreEntry.reconstitute (7 tests)
    ├── integration/
    │   └── repositories.spec.ts         # TypeOrm*Repository con DataSource SQLite :memory: (11 tests)
    └── e2e/
        └── api.e2e-spec.ts              # flujo completo HTTP con supertest (15 tests)
docs/
└── IMPLEMENTACION_BACKEND.md  # este documento
AI_USAGE.md                    # registro de uso de IA (entradas #01–#09)
```

---

## 9. Verificación

### Ejecutar las pruebas
```bash
cd backend
npm install --legacy-peer-deps   # instalar dependencias

npm run build    # nest build — compila a dist/ (tsconfig.build.json)
npm test         # jest — 86 pruebas: unit (53) + infra adapters (7) + integración (11) + E2E (15)

npm run seed     # ts-node — inserta 2 niveles de ejemplo en arrow.sqlite
npm run start:dev  # nest start --watch — arranca en http://localhost:3000
                   # Swagger: http://localhost:3000/api/docs
```

### Verificación de tipos (sin emitir)
```bash
npx tsc -p tsconfig.build.json --noEmit  # debe terminar sin salida (cero errores)
```

### Smoke test manual (Swagger)
1. `npm run seed && npm run start:dev`
2. `PUT /api/v1/levels/:id` sin Authorization → **401** (AuthGuard en acción)
3. `POST /api/v1/auth/register` → obtener token → `PUT /api/v1/levels/:id` con Bearer → **200**
4. Dos `GET /api/v1/leaderboard?level=...` consecutivos → log `CACHE HIT` en segundo llamado

### Checklist de conformidad (GUIA_IA §12)

**Fase 1 — Núcleo**
- [x] Nombres de clases/métodos coinciden con el `diagrama backend.xml`.
- [x] Cada clase está en la capa correcta (dominio no importa NestJS/TypeORM/HTTP).
- [x] Los casos de uso dependen de **interfaces**, no de implementaciones concretas (DIP).
- [x] Patrón Strategy aplicado (`IScoreCalculationStrategy`, `MovesBasedScore`, `TimeBasedScore`, `MixedScore`).
- [x] Patrón Factory Method en Value Objects (constructores privados + factory estático).
- [x] AOP explicado con ejemplo de `UseCase<I,O>` + `LoggingUseCase` decorator.
- [x] Pruebas AAA con nombres `should_X_when_Y`, no frágiles, mocks solo de puertos.
- [x] Sin secretos ni datos sensibles; `.env.example` no tiene valores reales.
- [x] `AI_USAGE.md` actualizado con todas las entradas de uso.

**Fase 2 — Capas externas**
- [x] 5 aspectos AOP reales: `LoggingInterceptor`, `MetricsInterceptor`, `CacheInterceptor`, `AuthGuard`, `HttpExceptionFilter`.
- [x] Patrones GoF adicionales: Adapter (`JwtTokenService`, `BcryptHasher`), Repository (`TypeOrm*`), Mapper/ACL (4 mappers), Singleton (NestJS DI).
- [x] Composition Root en `app.module.ts` — use-cases creados con `useFactory`, sin `@Injectable()`.
- [x] Todos los endpoints protegidos tienen `@UseGuards(AuthGuard)` (RF-B-07): `GET/PUT /progress`, `PUT /levels/:id`, `POST /leaderboard`.
- [x] `HttpExceptionFilter` es el único punto de mapeo `DomainError → HTTP` (409/401/422/404).
- [x] Pruebas de integración con TypeORM real sobre SQLite `:memory:` (sin mocks de BD).
- [x] Pruebas E2E con supertest — flujo completo `register → login → sync → submit → leaderboard`.

---

## 10. Estado de implementación

### Implementado (Fases 1 y 2)

| Ítem | Estado |
|---|---|
| Dominio completo (VOs, Entidades, Ports, Errors, Strategy) | ✅ implementado |
| 8 casos de uso con DIP (interfaz, no implementación) | ✅ implementado |
| Controllers REST con `class-validator` + `@ApiProperty` (Swagger) | ✅ implementado |
| ORM entities (TypeORM) + 4 repositorios concretos + mappers ACL | ✅ implementado |
| `JwtTokenService` y `BcryptHasher` (adapters de puerto) | ✅ implementado |
| 5 aspectos AOP: `LoggingInterceptor`, `MetricsInterceptor`, `CacheInterceptor`, `AuthGuard`, `HttpExceptionFilter` | ✅ implementado |
| Composition Root (`app.module.ts` + `main.ts`) con Swagger en `/api/docs` | ✅ implementado |
| Pruebas unitarias (dominio + aplicación + adaptadores infra) | ✅ 53 + 7 = 60 tests |
| Pruebas de integración (SQLite `:memory:`) | ✅ 11 tests |
| Pruebas E2E (supertest, flujo completo) | ✅ 15 tests |
| `README.md` del backend | ✅ implementado |

**Total: 86 pruebas verdes**

### Fuera de alcance (no implementado por decisión de diseño)

- **Pruebas de contrato Pact** — requieren servidor Pact Broker; fuera del alcance del proyecto.
- **CI/CD** (GitHub Actions, Docker) — infraestructura de despliegue no requerida por el SRS.
- **Autorización por roles granular** (admin vs. player) — el SRS no define roles, solo autenticación JWT.
- **Rate-limiting** — no requerido en los RNF del SRS.
- **Refresh tokens** — el SRS especifica JWT estático (sin renovación automática).
- **Migrations TypeORM** — se usa `synchronize: true` en desarrollo (SQLite); en producción se activarían migraciones.
