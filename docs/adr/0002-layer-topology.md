# ADR 0002 — Topología de capas: persistencia en `infrastructure/`, no en `adapters/`

## Estado
Aceptada (F1b).

## Contexto

Los repositorios TypeORM y sus mappers vivían en `adapters/repositories/` y
`adapters/mappers/`; `AuthGuard` y `CacheInterceptor` vivían en
`infrastructure/aop/`. El diagrama de capas de la documentación (Clean
Architecture: Domain → Application → Adapters → Infrastructure) no coincidía
con el código: no había una dependencia mal invertida, era una
**topología mal nombrada**.

## Decisión

- Un repositorio TypeORM y su mapper son *infraestructura* (detalle de
  almacenamiento — TypeORM podría cambiarse por Prisma sin que ninguna capa
  interna se entere): se movieron a `infrastructure/persistence/`.
- `AuthGuard` y `CacheInterceptor` son aspectos de *HTTP* (dependen de
  `Request`/`Response`, se aplican por controller): se movieron a
  `adapters/aop/`. Los aspectos verdaderamente globales
  (`LoggingInterceptor`, `MetricsInterceptor`, `HttpExceptionFilter`, que se
  cablean una sola vez en `main.ts` para toda la app) se quedaron en
  `infrastructure/aop/`.
- Se añadió una regla `eslint no-restricted-imports` que falla el build si
  `domain/` o `application/` importan algo de un framework — convierte la
  verificación de "sin imports de NestJS/TypeORM en el dominio" de un grep
  puntual a una garantía continua en CI.

## Consecuencias

Cambio puramente estructural: no afecta comportamiento ni corrige bugs. Su
valor es que el diagrama de capas de la documentación coincide con la
realidad del código, y que un futuro import accidental de framework en
`domain/`/`application/` rompe el build en vez de pasar desapercibido.
