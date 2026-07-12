# Arrow con Mango — Backend

[![CI](https://github.com/a-granadillo/ArrowConMango_Backend/actions/workflows/ci.yml/badge.svg)](https://github.com/a-granadillo/ArrowConMango_Backend/actions/workflows/ci.yml)

API REST para el clon de *Arrow Maze – Escape Puzzle*. Implementa autenticación JWT, sincronización de progreso, tabla de clasificación global y definición remota de niveles (RF-B-01 a RF-B-07).

**Stack:** NestJS 10 · TypeORM 0.3 · SQLite / PostgreSQL · bcrypt · jsonwebtoken · Swagger · Jest

---

## Architecture

El backend sigue **Clean Architecture + Hexagonal (Puertos y Adaptadores)** con 4 capas concéntricas.
La regla de dependencia es estricta: ninguna capa interna importa nada de una capa externa.

```
┌─────────────────────────────────────────────────────────┐
│  (4) Frameworks & Drivers  — src/infrastructure/        │
│   NestJS, TypeORM, SQLite/PostgreSQL, bcrypt, jwt       │
│   ┌─────────────────────────────────────────────────┐   │
│   │  (3) Interface Adapters  — src/adapters/        │   │
│   │   Controllers, TypeOrm*Repository, Mappers, DTOs │   │
│   │   ┌──────────────────────────────────────────┐  │   │
│   │   │  (2) Application  — src/application/     │  │   │
│   │   │   8 Use Cases · UseCase<I,O> · DTOs      │  │   │
│   │   │   ┌───────────────────────────────────┐  │  │   │
│   │   │   │  (1) Domain  — src/domain/        │  │  │   │
│   │   │   │   Entities · Value Objects        │  │  │   │
│   │   │   │   Ports · Errors · Strategy       │  │  │   │
│   │   │   └───────────────────────────────────┘  │  │   │
│   │   └──────────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
          dependencias apuntan siempre hacia adentro
```

### Composition Root (D1 + D2)

Los casos de uso son clases TypeScript puras (sin `@Injectable()`). `app.module.ts` los cablea
mediante `useFactory` + tokens string (`USER_REPOSITORY`, `TOKEN_SERVICE`, etc.) para respetar
la regla de que las interfaces no existen en runtime.

```typescript
// src/infrastructure/config/app.module.ts
{ provide: RegisterUserUseCase,
  useFactory: (repo, hasher) => new RegisterUserUseCase(repo, hasher),
  inject: [USER_REPOSITORY, PASSWORD_HASHER] }
```

---

## Design Patterns

| Patrón | Categoría | Evidencia en el código |
|---|---|---|
| **Strategy** | Comportamiento | `IScoreCalculationStrategy` · `MovesBasedScore` · `TimeBasedScore` · `MixedScore` en `src/domain/services/` |
| **Factory Method** | Creacional | Constructores privados + `Email.create()`, `Score.fromRaw()`, `ScoreEntry.reconstitute()` en todos los VOs/Entidades |
| **Adapter** | Estructural | `JwtTokenService implements ITokenService` · `BcryptHasher implements IPasswordHasher` en `src/infrastructure/auth/` |
| **Repository** | Estructural | `TypeOrmUserRepository implements IUserRepository` (y 3 más) en `src/adapters/repositories/` |
| **Mapper / ACL** | Estructural | `UserMapper`, `ProgressMapper`, `LevelMapper`, `ScoreEntryMapper` en `src/adapters/mappers/` — traducen ORM ↔ dominio |
| **Singleton** | Creacional | Todos los providers NestJS son singletons por defecto (DI container) |
| **Decorator / Proxy** | Estructural | `UseCase<I,O>` como base; NestJS Interceptors/Guards/Filters como decoradores de cross-cutting concerns |

---

## SOLID

| Principio | Evidencia |
|---|---|
| **S** Single Responsibility | Un archivo por caso de uso · `Email` solo valida emails · `Score` solo encapsula puntuación |
| **O** Open/Closed | Añadir nueva estrategia de puntuación = nueva clase; no se modifica `Score` ni los use-cases |
| **L** Liskov Substitution | `TypeOrmUserRepository`, mock en memoria y SQLite `:memory:` son intercambiables donde se espera `IUserRepository` |
| **I** Interface Segregation | `IUserRepository`: 3 métodos; `ILeaderboardRepository`: 2 métodos; `UseCase<I,O>`: 1 método |
| **D** Dependency Inversion | Los use-cases reciben puertos (interfaces) por constructor; las implementaciones concretas solo existen en `app.module.ts` |

---

## AOP — Programación Orientada a Aspectos

Cinco aspectos implementados en `src/infrastructure/aop/`, registrados sin modificar la lógica de negocio:

| Aspecto | Mecanismo NestJS | Registro | Función |
|---|---|---|---|
| `LoggingInterceptor` | `NestInterceptor` | Global en `main.ts` | Loguea IN/OUT/ERR con tiempo de respuesta |
| `MetricsInterceptor` | `NestInterceptor` | Global en `main.ts` | Advierte si un handler supera 200 ms |
| `CacheInterceptor` | `NestInterceptor` | `@UseInterceptors` en `GET /leaderboard` | Caché en memoria Map con TTL 30 s |
| `AuthGuard` | `CanActivate` | `@UseGuards` en endpoints protegidos | Extrae Bearer token · verifica JWT · deposita `userId` en request |
| `HttpExceptionFilter` | `ExceptionFilter` | Global en `main.ts` | Mapea `DomainError` → HTTP (409/401/422/404/500) |

El filtro es el **único** punto de traducción entre el dominio y el protocolo HTTP.

---

## Getting Started

```bash
# 1. Instalar dependencias
npm install --legacy-peer-deps

# 2. (Opcional) Configurar entorno
cp .env.example .env
# Editar .env: DB_DRIVER=sqlite, DB_PATH=arrow.sqlite, JWT_SECRET=<secreto>, PORT=3000

# 3. Seed de niveles de ejemplo
npm run seed

# 4. Arrancar en modo desarrollo
npm run start:dev
# → http://localhost:3000
# → Swagger: http://localhost:3000/api/docs

# 5. Ejecutar todas las pruebas (86 tests)
npm test

# 6. Calidad de código (lo mismo que valida el CI)
npm run lint           # ESLint
npm run format:check   # Prettier (verificación)
# Autocorrección: npm run lint:fix · npm run format

# 7. Build de producción
npm run build      # nest build → dist/
npm run start:prod # node dist/main
```

### Variables de entorno

| Variable | Ejemplo | Descripción |
|---|---|---|
| `DB_DRIVER` | `sqlite` | `sqlite` o `postgres` |
| `DB_PATH` | `arrow.sqlite` | Ruta del archivo SQLite (ignorado si postgres) |
| `DB_HOST` | `localhost` | Host PostgreSQL |
| `DB_PORT` | `5432` | Puerto PostgreSQL |
| `DB_NAME` | `arrow` | Base de datos PostgreSQL |
| `DB_USER` | `postgres` | Usuario PostgreSQL |
| `DB_PASSWORD` | *(vacío)* | Contraseña PostgreSQL |
| `JWT_SECRET` | `change-me` | Secreto para firmar tokens JWT |
| `JWT_EXPIRES_IN` | `7d` | Expiración del token |
| `PORT` | `3000` | Puerto HTTP |

---

## API Endpoints

Prefijo global: `/api/v1`

| Método | Ruta | Auth | RF | Descripción |
|---|---|---|---|---|
| `POST` | `/auth/register` | — | RF-B-01 | Registrar nuevo usuario (201) |
| `POST` | `/auth/login` | — | RF-B-01 | Autenticar y obtener JWT (200) |
| `POST` | `/auth/guest` | — | RF-B-01 | Login de invitado: UUID → JWT (200) |
| `GET` | `/progress` | Bearer | RF-B-02 | Obtener progreso del usuario |
| `PUT` | `/progress` | Bearer | RF-B-02 | Sincronizar progreso (merge idempotente) |
| `GET` | `/levels` | — | RF-B-04 | Listar todas las definiciones de niveles |
| `PUT` | `/levels/:id` | Bearer | RF-B-04, RF-B-07 | Crear o actualizar nivel (admin) |
| `GET` | `/leaderboard?level=&top=` | — | RF-B-03 | Top N scores por nivel (cacheado 30 s) |
| `POST` | `/leaderboard` | Bearer | RF-B-03 | Enviar score al leaderboard (201) |

Documentación interactiva completa: `http://localhost:3000/api/docs`

---

## Testing

```
test/
├── unit/
│   ├── domain/          → 25 tests (VOs, entidades, strategy)
│   ├── application/     → 28 tests (use-cases con mocks de puertos)
│   └── infrastructure/  →  7 tests (JwtTokenService, BcryptHasher, ScoreEntry.reconstitute)
├── integration/         → 11 tests (TypeOrm*Repository con SQLite :memory: real)
└── e2e/                 → 15 tests (flujo HTTP completo con supertest)
                           Total: 86 pruebas
```

Todos los tests usan la convención `should_[resultado]_when_[condición]` y siguen el patrón AAA.

---

## CI / Flujo de trabajo

La Integración Continua corre en **GitHub Actions** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))
en cada `push` a `master` y en cada Pull Request. El pipeline ejecuta, sobre `ubuntu-latest`:

```
npm ci --legacy-peer-deps → format:check → lint → build → test:coverage
```

No necesita secretos ni base de datos externa: las pruebas de integración y e2e usan
SQLite `:memory:`. El reporte de cobertura se publica como artefacto del workflow.

El flujo de colaboración (ramas `feat/…`, `fix/…`, Pull Requests, `master` protegido y
Conventional Commits) está documentado en [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Documentación adicional

- [Implementación detallada — decisiones de diseño, SOLID, GoF, AOP](docs/IMPLEMENTACION_BACKEND.md)
- [Registro de uso de IA (entradas #01–#09)](AI_USAGE.md)
