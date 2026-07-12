# AI Usage Documentation — Arrow con Mango Backend

> Obligatorio según §12 del SRS y §7 del enunciado del proyecto.
> Este archivo registra cada uso significativo de IA durante el desarrollo del backend.

---

## Herramientas utilizadas

| Herramienta | Modelo / Versión | Rol en el flujo de trabajo |
|---|---|---|
| **Claude Code** | Claude Opus 4.8 (`claude-opus-4-8`) | Diseño de arquitectura, generación de andamiaje de dominio y aplicación, revisión de principios SOLID/GoF/Clean. |
| **Claude Code** | Claude Sonnet 4.6 (`claude-sonnet-4-6`) | Implementación de componentes individuales, pruebas unitarias AAA, documentación técnica. |

---

## Registro de uso por tarea

### Entrada #01 — Análisis de documentos y diseño del plan

- **Fecha / autor:** 2026-06-15 / Equipo backend
- **Herramienta:** Claude Opus 4.8
- **Rol en el flujo:** Análisis + diseño del plan de implementación
- **Tarea/problema:** Leer el SRS, la Guía de IA, el enunciado, el `design.md` y el `diagrama backend.xml` para producir un plan detallado de implementación del núcleo del backend.
- **Prompt (paráfrasis fiel):**
  > "Analiza los documentos del proyecto Arrow con Mango (SRS, Guía IA, enunciado, design.md, diagrama backend.xml). Con base en las especificaciones y el contexto, desarrolla toda la implementación base del backend para el proyecto. Documenta cada cosa que hagas en un documento .md final que explique detalladamente todo lo que se hizo y el porqué, todo de acuerdo a Clean+Hexagonal, SOLID y patrones de diseño."
- **Resultado obtenido:** Plan de implementación en 5 fases (estructurado en archivo `.claude/plans/`), con decisiones de tecnología, estructura de carpetas, contrato literal extraído del diagrama, y criterios de verificación.
- **Modificaciones del equipo:** Se eligió estructura plana (SRS/Guía) en lugar del `design.md` para coincidir literalmente con el diagrama. Se decidió alcance = solo núcleo (capas 1-2) para la fase actual.
- **Verificación:** Plan revisado y aprobado por el equipo antes de proceder a la implementación.
- **Lecciones / limitaciones:** La IA identificó correctamente la discrepancia entre el layout de `design.md` y el del SRS, y aplicó la regla "gana el SRS" de la Guía de IA.

---

### Entrada #02 — Implementación de la capa de Dominio (Capa 1)

- **Fecha / autor:** 2026-06-15 / Equipo backend
- **Herramienta:** Claude Sonnet 4.6
- **Rol en el flujo:** Generación + revisión de código
- **Tarea/problema:** Implementar los 5 Value Objects, 5 entidades/agregados, 1 servicio de estrategia, 6 puertos y los errores de dominio, respetando el contrato exacto del diagrama backend.xml y las reglas de Clean Architecture.
- **Prompt (paráfrasis fiel):**
  > "Implementa los Value Objects del dominio (Email, PasswordHash, UserId, LevelId, Score), las entidades (User, PlayerProgress, LevelDefinition, Leaderboard, ScoreEntry), el Strategy de scoring, los puertos (IUserRepository, IProgressRepository, ILevelRepository, ILeaderboardRepository, ITokenService, IPasswordHasher) y los DomainErrors. Sin imports de NestJS, TypeORM ni librerías externas. Sigue el contrato del diagrama backend.xml al pie de la letra."
- **Resultado obtenido:** Todos los archivos de dominio en `src/domain/`, con contratos coincidentes con el diagrama, TS puro, inmutabilidad, y errores tipados.
- **Modificaciones del equipo:**
  - `User.verify()` recibe `IPasswordHasher` como parámetro (no importado) para preservar la pureza del dominio. El diagrama mostraba `verify(pwd): bool`; la IA identificó que importar bcrypt directamente violaría la regla de dependencia y documentó la justificación.
  - `PlayerProgress.merge()` implementada como idempotente (unión de completados + máximo Score por nivel).
- **Verificación:** Pruebas unitarias AAA en `test/unit/domain/` cubren todos los componentes.
- **Lecciones / limitaciones:** La IA generó código correcto para todos los VOs. En `PasswordHash`, inicialmente propuso incluir la lógica de hashing, lo cual fue detectado y corregido por el equipo (viola DIP).

---

### Entrada #03 — Implementación de la capa de Aplicación (Capa 2)

- **Fecha / autor:** 2026-06-15 / Equipo backend
- **Herramienta:** Claude Sonnet 4.6
- **Rol en el flujo:** Generación de código
- **Tarea/problema:** Implementar los 8 casos de uso (`RegisterUserUseCase`, `LoginUseCase`, `GetProgressUseCase`, `SyncProgressUseCase`, `GetLevelsUseCase`, `UpsertLevelUseCase`, `GetLeaderboardUseCase`, `SubmitScoreUseCase`) y la interfaz `UseCase<I,O>`.
- **Prompt (paráfrasis fiel):**
  > "Implementa los 8 casos de uso del backend de Arrow con Mango. Cada uno en su propio archivo (SRP), implementando UseCase<I,O>, recibiendo puertos por constructor (DIP), sin instanciar repositorios ni importar NestJS. Incluye DTOs de aplicación planos (sin decoradores NestJS)."
- **Resultado obtenido:** 8 archivos en `src/application/use-cases/`, interfaz `UseCase<I,O>` en `src/application/shared/`, DTOs en `src/application/dtos/`.
- **Modificaciones del equipo:**
  - `GetLevelsUseCase.execute()` se tipó como `Promise<LevelOutput[]>` con `void` como input (el diagrama mostraba `execute(): Level[]`).
  - `SyncProgressUseCase` se diseñó con un wrapper de input `{ userId, data }` para mantener la firma `execute(I): Promise<O>` limpia.
- **Verificación:** Pruebas en `test/unit/application/` con mocks de todos los puertos. Todas en verde.
- **Lecciones / limitaciones:** La IA respetó correctamente la regla "nunca instanciar repos concretos" en los casos de uso.

---

### Entrada #04 — Pruebas unitarias AAA

- **Fecha / autor:** 2026-06-15 / Equipo backend
- **Herramienta:** Claude Sonnet 4.6
- **Rol en el flujo:** Generación de pruebas
- **Tarea/problema:** Escribir pruebas unitarias AAA para el dominio y los casos de uso, siguiendo la convención `should_[resultado]_when_[condición]`.
- **Prompt (paráfrasis fiel):**
  > "Escribe pruebas unitarias con jest y ts-jest en patrón AAA, convención should_X_when_Y, para el dominio (VOs, entidades, estrategia) y para los casos de uso (con mocks de puertos). No pruebes detalles de implementación, solo comportamiento observable."
- **Resultado obtenido:** 4 archivos de prueba con ~45 casos en total cubriendo todos los componentes del núcleo.
- **Modificaciones del equipo:** El equipo revisó los nombres de tests y ajustó los mocks de `PlayerProgress` en `sync-progress.spec.ts` para reflejar el comportamiento idempotente real.
- **Verificación:** `npm test` → todas las pruebas en verde.
- **Lecciones / limitaciones:** La IA generó pruebas correctas en general. Un caso en `entities.spec.ts` utilizaba `require()` para el Strategy (por la forma de las exportaciones); el equipo lo verificó y aceptó como válido para ts-jest.

---

### Entrada #05 — Documentación técnica (IMPLEMENTACION_BACKEND.md)

- **Fecha / autor:** 2026-06-15 / Equipo backend
- **Herramienta:** Claude Sonnet 4.6
- **Rol en el flujo:** Documentación técnica
- **Tarea/problema:** Generar el documento `docs/IMPLEMENTACION_BACKEND.md` que explique cada decisión de arquitectura, principio SOLID, patrón GoF y estrategia AOP con ejemplos reales del código.
- **Prompt (paráfrasis fiel):**
  > "Escribe el documento IMPLEMENTACION_BACKEND.md explicando cada componente implementado, su capa Clean, el porqué de las decisiones de diseño, con secciones dedicadas a SOLID, GoF y AOP, con ejemplos de código del proyecto."
- **Resultado obtenido:** Documento de ~500 líneas estructurado en secciones de arquitectura, componentes, SOLID, GoF, AOP, verificación y TODO.
- **Modificaciones del equipo:** El equipo revisó la sección de AOP para asegurarse de que el ejemplo del decorador `UseCase<I,O>` coincidiera exactamente con el código generado.
- **Verificación:** Revisión manual contra el checklist del §12 de la Guía de IA.
- **Lecciones / limitaciones:** La documentación generada fue precisa y alineada con el código real.

---

### Entrada #06 — Milestone 4a: Toolchain + ORM + Auth adapters (Fase 2)

- **Fecha / autor:** 2026-06-16 / Equipo backend
- **Herramienta:** Claude Sonnet 4.6
- **Rol en el flujo:** Generación + revisión de código
- **Tarea/problema:** Establecer el toolchain de NestJS (nest-cli.json, tsconfig.build.json, scripts npm), implementar las 4 ORM entities, el `DatabaseModule` con soporte SQLite/PostgreSQL, `JwtTokenService`, `BcryptHasher`, y añadir `ScoreEntry.reconstitute()` al dominio.
- **Prompt (paráfrasis fiel):**
  > "Implementa el toolchain NestJS (nest build, nest-cli.json, tsconfig.build.json), las entidades ORM con TypeORM (users, player_progress, level_definitions, score_entries), el DatabaseModule con soporte dual SQLite/PostgreSQL vía env, los auth adapters JwtTokenService e BcryptHasher, y el AuthModule. Añade ScoreEntry.reconstitute() en el dominio para rehidratación desde BD."
- **Resultado obtenido:** Toolchain funcional (`npm run build` → `nest build`), 4 ORM entities, `database.module.ts` con TypeORM, `JwtTokenService` y `BcryptHasher` en `src/infrastructure/auth/`, `ScoreEntry.reconstitute()` en dominio, 7 pruebas en `test/unit/infrastructure/auth-adapters.spec.ts`.
- **Modificaciones del equipo:**
  - Se añadió `@types/express` a devDependencies (la IA omitió la dependencia necesaria para `Response` de Express en el filter).
  - El script `seed` se ajustó a `ts-node -r tsconfig-paths/register` para resolver los path aliases.
- **Verificación:** `npx jest --testPathPattern=infrastructure` → 7/7 tests verdes. `npx tsc -p tsconfig.build.json --noEmit` → sin errores.
- **Lecciones / limitaciones:** La IA gestionó bien la dualidad SQLite/PostgreSQL con variables de entorno. El `reconstitute()` en dominio fue una decisión arquitectónica correcta que la IA propuso para preservar timestamps sin contaminar el dominio con ORM.

---

### Entrada #07 — Milestone 4b: Repositorios TypeORM + Mappers ACL (Fase 2)

- **Fecha / autor:** 2026-06-16 / Equipo backend
- **Herramienta:** Claude Sonnet 4.6
- **Rol en el flujo:** Generación de código
- **Tarea/problema:** Implementar los 4 repositorios TypeORM (`TypeOrmUserRepository`, `TypeOrmProgressRepository`, `TypeOrmLevelRepository`, `TypeOrmLeaderboardRepository`) implementando los puertos del dominio, y los 4 mappers Anti-Corruption Layer.
- **Prompt (paráfrasis fiel):**
  > "Implementa los 4 repositorios TypeORM (en src/adapters/repositories/) que implementen los puertos del dominio. Implementa los 4 mappers (UserMapper, ProgressMapper, LevelMapper, ScoreEntryMapper) que traduzcan entre ORM entities y domain entities. Los repositorios deben ser @Injectable() pero NO los casos de uso. Agrega pruebas de integración usando DataSource real con SQLite :memory:."
- **Resultado obtenido:** 4 repositorios en `src/adapters/repositories/`, 4 mappers en `src/adapters/mappers/`, 11 pruebas de integración en `test/integration/repositories.spec.ts` usando TypeORM con SQLite `:memory:` (sin NestJS module).
- **Modificaciones del equipo:**
  - `ProgressMapper.toDomain()` convirtió `simple-json` objects a `Map<string, Score>` usando `Score.fromRaw()`; la IA inicialmente usó `new Score()` directamente (constructor privado) y el equipo aplicó el factory method.
  - `TypeOrmLeaderboardRepository.top()` recibió ordenamiento explícito `moves ASC, timeMs ASC` que la IA omitió en el primer borrador.
- **Verificación:** `npx jest --testPathPattern=integration` → 11/11 tests verdes con BD real.
- **Lecciones / limitaciones:** Las pruebas de integración sin NestJS module (DataSource directo) fueron más limpias y rápidas. La IA lo propuso correctamente.

---

### Entrada #08 — Milestone 4c: Controllers + DTOs + Composition Root (Fase 2)

- **Fecha / autor:** 2026-06-16 / Equipo backend
- **Herramienta:** Claude Sonnet 4.6
- **Rol en el flujo:** Generación de código
- **Tarea/problema:** Implementar los 4 controllers REST con DTOs validados (`class-validator`, `@ApiProperty`), el Composition Root (`app.module.ts` con `useFactory`), `main.ts`, `swagger.config.ts`, y el `seed.ts`.
- **Prompt (paráfrasis fiel):**
  > "Implementa los 4 controllers NestJS (auth, progress, level, leaderboard) con sus DTOs de entrada/salida usando class-validator y @ApiProperty. Implementa el app.module.ts como Composition Root: los casos de uso se instancian con useFactory (no @Injectable). Crea main.ts con globalPrefix 'api/v1', ValidationPipe, HttpExceptionFilter global, y setupSwagger. Añade seed.ts para inicializar niveles de ejemplo."
- **Resultado obtenido:** 4 controllers en `src/adapters/controllers/`, 4 archivos de DTOs con validación, `app.module.ts` con factory providers para todos los use-cases, `main.ts` operativo, Swagger en `/api/docs`, `seed.ts` con 2 niveles de ejemplo.
- **Modificaciones del equipo:**
  - `LevelController.upsert()` requirió `return result as unknown as LevelResponseDto[]` por incompatibilidad de tipos entre `LevelRules` y `Record<string, unknown>`.
  - `seed.ts` requirió `repo.save(level as unknown as LevelDefinitionOrmEntity)` para silenciar un error de tipo en el cast de aristas.
  - `tokens.ts` se creó como archivo independiente para los tokens DI (la IA los había inlineado en `app.module.ts`).
- **Verificación:** `npx tsc -p tsconfig.build.json --noEmit` → sin errores. API arranca con `npm run start:dev`.
- **Lecciones / limitaciones:** El patrón `useFactory` sin `@Injectable()` fue implementado correctamente por la IA, respetando la regla de que los use-cases no deben conocer NestJS (D1). Los type casts `as unknown as X` son el precio de la separación de capas sin conversiones explícitas.

---

### Entrada #09 — Milestone 4d: AOP + E2E Tests + Fix de revisión (Fase 2)

- **Fecha / autor:** 2026-06-16 / Equipo backend
- **Herramienta:** Claude Sonnet 4.6
- **Rol en el flujo:** Generación de código + corrección de bugs
- **Tarea/problema:** Implementar los 5 aspectos AOP, las pruebas E2E con supertest, y corregir dos fallos detectados en revisión de código: guard faltante en `PUT /levels/:id` y `CacheInterceptor` importado pero no aplicado.
- **Prompt (paráfrasis fiel):**
  > "Implementa los 5 aspectos AOP: LoggingInterceptor, MetricsInterceptor, CacheInterceptor (TTL en memoria), AuthGuard (extrae userId de Bearer), HttpExceptionFilter (mapea DomainErrors a HTTP). Escribe pruebas E2E con supertest y @nestjs/testing, usando SQLite :memory: y flujo completo register→login→sync→submit→leaderboard. Incluye tests de error cases: 409, 401, 422."
- **Resultado obtenido:** 5 aspectos en `src/infrastructure/aop/`, pruebas E2E en `test/e2e/api.e2e-spec.ts` con 15 tests (incluyendo el nuevo 401 para `PUT /levels/:id`), total de 86 pruebas verdes.
- **Modificaciones del equipo — correcciones de revisión:**
  - **Guard faltante (RF-B-07):** `LevelController.upsert()` carecía de `@UseGuards(AuthGuard)`, dejando `PUT /levels/:id` abierto sin autenticación. La IA generó el controller sin el guard y el equipo lo detectó en revisión. **Fix aplicado:** importar `AuthGuard` + añadir `@UseGuards(AuthGuard)` al método `upsert`.
  - **CacheInterceptor muerto:** `LeaderboardController.get()` importaba `CacheInterceptor` pero nunca lo aplicaba (faltaba `@UseInterceptors(new CacheInterceptor(30))`); además tenía un `@UseGuards()` vacío como ruido. **Fix aplicado:** reemplazar `@UseGuards()` por `@UseInterceptors(new CacheInterceptor(30))`.
  - Estos dos bugs son el ejemplo más claro de que la IA puede omitir detalles de cableado (decoradores) que son funcionalmente críticos y solo detectables con revisión humana.
- **Verificación:** `npx jest --no-coverage --forceExit` → 86/86 tests verdes.
- **Lecciones / limitaciones:** La IA implementó los aspectos AOP correctamente en sus archivos, pero fallió en aplicarlos consistentemente en los controllers. El 100% de cobertura de los aspectos requirió revisión manual post-generación.

---

### Entrada #10 — Guest login + CORS (Issue #41)

- **Fecha / autor:** 2026-07-12 / Equipo backend
- **Herramienta:** Claude Opus 4.8
- **Rol en el flujo:** Análisis de issue cross-repo + implementación
- **Tarea/problema:** El Issue #41 fue creado en el repositorio del frontend (`ArrowConMango_Front`) pero describe trabajo de backend: habilitar CORS y soportar sesiones de invitado (Guest-First) sin registro, para que el frontend Flutter pueda sincronizar progreso con un JWT obtenido a partir de un UUID local.
- **Prompt (paráfrasis fiel):**
  > "Analiza el Issue #41 del repositorio del frontend (feat(backend): implement guest authentication and enable CORS) e impleméntalo en el backend, siguiendo la arquitectura Clean/Hexagonal existente."
- **Resultado obtenido:** `app.enableCors()` en `src/main.ts`; nuevo `GuestLoginUseCase` (find-or-create idempotente por `Email.create('guest-<uuid>@guest.local')`) cableado en `app.module.ts` con el mismo patrón `useFactory` que `LoginUseCase`; `GuestLoginDto` (`@IsUUID()`) y endpoint `POST /auth/guest` en `AuthController`; tests unitarios (`guest-login.spec.ts`) y 3 casos E2E nuevos.
- **Modificaciones del equipo:** Se confirmaron dos decisiones de alcance con el equipo antes de implementar: (1) contrato mínimo `{ uuid } → { token }` (sin `displayName`, sin enriquecer la respuesta) y (2) CORS abierto sin restricción de origen. Se corrigió el código HTTP esperado en el test E2E de UUID inválido: el `ValidationPipe` global devuelve `400` (no `422`, que está reservado a `DomainError`s vía `HttpExceptionFilter`).
- **Verificación:** `npm run format:check && npm run lint && npm run build && npm run test:coverage`.
- **Lecciones / limitaciones:** Un issue de producto puede describir trabajo de otra capa/repositorio del mismo proyecto; verificar primero de qué repo/servicio se trata antes de implementar evita descartar la petición o implementarla en el lugar equivocado.

---

## Evaluación crítica

### Porcentaje aproximado de código asistido por IA

| Componente | % IA | % Equipo (correcciones) |
|---|---|---|
| Dominio + Aplicación (núcleo, Fases 1) | ~85% | ~15% |
| ORM entities + Mappers + Repositories (Fase 2) | ~80% | ~20% |
| Controllers + DTOs + Composition Root (Fase 2) | ~75% | ~25% |
| Aspectos AOP (Fase 2) | ~70% | ~30% |
| Pruebas unitarias + integración + E2E | ~70% | ~30% |
| Documentación técnica | ~80% | ~20% |

### Casos donde la IA produjo resultados incorrectos o subóptimos

1. **`PasswordHash` con lógica de hashing interna:** La IA propuso incluir bcrypt directamente en el VO. El equipo lo corrigió al patrón `IPasswordHasher` (DIP).
2. **`verify(pwd)` sin inyección de hasher:** Diagrama mostraba `verify(pwd): bool` pero importar bcrypt viola Clean Architecture. La IA propuso la solución correcta tras la corrección del punto 1.
3. **`@UseGuards(AuthGuard)` faltante en `PUT /levels/:id`:** Bug de seguridad — cualquier usuario sin token podía crear/editar niveles. La IA generó el controller sin el guard; el equipo lo detectó en revisión de código y lo corrigió (ver entrada #09).
4. **`CacheInterceptor` importado pero no aplicado:** La IA importó el interceptor pero omitió el `@UseInterceptors(new CacheInterceptor(30))` en el método `get` de `LeaderboardController`. El aspecto estaba construido pero muerto. Fix aplicado en revisión (ver entrada #09).
5. **`ProgressMapper` con `new Score()` directo:** El constructor de `Score` es privado (factory method). La IA usó `new Score()` que TypeScript rechazó; se corrigió a `Score.fromRaw()`.
6. **`TypeOrmLeaderboardRepository.top()` sin ordenamiento:** La IA omitió `ORDER BY moves ASC, timeMs ASC` en la primera versión. El equipo lo añadió al revisar la especificación de `GetLeaderboardUseCase`.

### Reflexión del equipo

El uso de IA en la Fase 2 aceleró significativamente la implementación de boilerplate NestJS/TypeORM (estimado 5-7 días de trabajo manual en ~6 horas asistidas). Sin embargo, el equipo tuvo que:
- Verificar cada decorator de cada controller (cableado AOP — los aspectos existían pero no estaban conectados).
- Corregir type casts necesarios por la separación de capas (`as unknown as X`).
- Añadir dependencias omitidas (`@types/express`, `tsconfig-paths`).
- Ajustar el ordering de queries y los mapeos de tipos complejos (`Map` ↔ JSON).

**Lección principal:** La IA genera bien los componentes individuales (el aspecto, el repositorio, el controller) pero puede omitir las conexiones entre ellos (el decorator que aplica el aspecto al endpoint). La revisión cruzada entre "qué se construyó" y "qué se cablea" es responsabilidad del equipo.

**Conclusión:** La IA es un excelente asistente de implementación pero no reemplaza el criterio arquitectónico ni la revisión de seguridad. El diseño previo (SRS + diagrama) y la revisión post-generación fueron indispensables para garantizar la corrección de los outputs.

---

> El equipo es responsable de todo el código entregado. Cada fragmento fue revisado, entendido y
> cubierto con pruebas antes de considerarse terminado (§12 del SRS, §7.1 del enunciado).
