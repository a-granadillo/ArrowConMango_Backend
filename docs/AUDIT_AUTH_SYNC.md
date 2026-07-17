# Auditoría — Autenticación y Sincronización

Fecha: 2026-07-17. Alcance: `POST /auth/register`, `POST /auth/login`, `POST /auth/guest`,
`GET/PUT /progress`, y hallazgos relacionados encontrados al revisar `PUT /levels/:id`.

## Corregido en este PR

- **`POST /auth/register` no devolvía token.** Devolvía `{id, email, username}`, obligando al
  cliente a encadenar un `POST /auth/login` inmediato tras registrarse. `RegisterUserUseCase`
  ahora firma un token igual que `login`/`guest` (`RegisterOutput.token`, `RegisterResponseDto`),
  así que registrarse deja la sesión iniciada. Cubierto por un test e2e que registra y usa el
  token devuelto contra `GET /progress` sin login adicional.

## Deuda documentada, fuera de alcance de este PR

- **`JWT_SECRET` con default inseguro.** `src/infrastructure/config/env.config.ts` usa
  `'change-me-in-production'` como valor por defecto si la variable de entorno no está
  configurada. Cualquier despliegue que no la sobrescriba explícitamente firma tokens con un
  secreto público. Acción recomendada: hacer que el arranque falle en producción si
  `JWT_SECRET` no está seteada explícitamente, en vez de caer a un default.

- **No hay migraciones de base de datos.** El esquema se crea con `synchronize: true`
  (`src/infrastructure/orm/database.module.ts`) sobre SQLite. Con `DB_DRIVER=postgres`,
  `synchronize` pasa a `false` y no existen migraciones que creen las tablas — un despliegue
  contra una base Postgres vacía no arrancaría. Acción recomendada: generar migraciones
  TypeORM antes de habilitar el driver Postgres en cualquier entorno real.

- **`PUT /levels/:id` sin control de autoría/rol — la brecha más seria encontrada.**
  `POST`/`PUT /levels` están anotados "(admin)" en Swagger pero solo verifican `AuthGuard`
  (autenticado, sin más). `UpsertLevelUseCase` recibe el `id` de la ruta y sobrescribe el nivel
  existente sin comprobar si el `authorId` guardado coincide con el usuario que hace la
  petición. Cualquier usuario autenticado — incluido un invitado, ya que `guest-login` emite un
  JWT válido — puede hacer `PUT /levels/1` y sobrescribir un nivel de campaña (`authorId: null`)
  o el nivel de otro autor. Acción recomendada: `UpsertLevelUseCase` debe cargar el nivel
  existente y rechazar la escritura si `existing.authorId` no es `null` (nivel de campaña, solo
  editable por un rol admin real que hoy no existe) ni coincide con `input.userId`.

- **El JWT se persiste sin cifrar en el cliente** (fuera del alcance de este repo — ver
  `frontend/ArrowConMango_Front/lib/features/player/data/auth_token_store.dart`, que usa una
  box Hive plana en vez de `flutter_secure_storage`). Se documenta aquí porque es la otra mitad
  del flujo auditado.

## Confirmado correcto, sin cambios

- **`AuthGuard`** (`src/adapters/aop/auth.guard.ts`) y la firma/verificación JWT en
  `JwtTokenService` — extraen y validan el Bearer token correctamente, rechazando con
  `UnauthorizedError` cuando falta o es inválido.

- **`PlayerProgress.merge()`** (`src/domain/entities/player-progress.entity.ts`) es idempotente:
  `completed` es unión de conjuntos, `best` se queda con el mejor score por nivel según la
  estrategia inyectada, y `currentLevel` toma el máximo. Sincronizar el mismo payload dos veces
  no duplica ni pierde datos. Esta garantía es la que permite que la futura migración de
  progreso de invitado a cuenta registrada (frontend) sea un simple `PUT /progress` sin lógica
  de fusión adicional en el cliente.

- **Escalabilidad de niveles.** Los niveles son filas en `level_definitions`
  (`GET/POST/PUT /levels`), no constantes en código — añadir un nivel nuevo no requiere tocar
  el esquema. El seed (`npm run seed`) es idempotente: usa `INSERT OR IGNORE`, así que correrlo
  dos veces no duplica los 15 niveles de campaña.

- **`GET /auth/guest` (find-or-create por UUID)** siempre resuelve al mismo usuario para un UUID
  dado y solo aplica `displayName` cuando el usuario es nuevo — un guest ya existente no se
  renombra accidentalmente por una llamada repetida con un `displayName` distinto.
