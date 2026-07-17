# ADR 0001 — El ranking se agrega en el dominio, no en SQL; `mangos` = Σ estrellas

## Estado
Aceptada (F2, F5).

## Contexto

`typeorm-leaderboard.repository.ts` reimplementaba el ranking en SQL
(`ORDER BY moves ASC ... LIMIT n`), con una regla distinta a la del agregado
de dominio `Leaderboard.top()` (que ordena por `value()` de la estrategia de
puntuación). `Leaderboard` nunca se instanciaba en producción — era código
muerto correcto al lado de código SQL incorrecto. Con `?top=1`, el mejor
score real desaparecía del resultado.

Además, `player_progress.best` es una columna `simple-json` (un mapa
`levelId → LevelBest`), no una tabla normalizada. El schema impide
físicamente un `GROUP BY`/`SUM` en SQL para calcular un ranking global de
mangos por usuario.

## Decisión

1. **El ranking se calcula en el dominio, no en SQL.** El repositorio solo
   filtra (`WHERE level = ?`); `GetLeaderboardUseCase` reconstituye un
   `Leaderboard` con las filas y llama a `.top(strategy, n)`. Es la primera
   vez que el agregado se instancia en producción — antes solo existía para
   los tests.
2. **Una sola `ScoreCalculationStrategy` para todo el juego** (`MangoScore`,
   inyectada globalmente vía `SCORE_STRATEGY`), no por nivel — ver la nota en
   `docs/IMPLEMENTACION_BACKEND.md §3.5` para el razonamiento completo.
3. **`mangos` en el leaderboard global = Σ estrellas (1-3 por nivel
   completado), no Σ puntos.** El frontend ya modela así el diseño
   aprobado (`MangoRating`/`MangoStars`, umbrales 900/600 sobre una escala
   0-1000): las estrellas son la unidad comparable *entre* niveles, algo que
   la puntuación cruda no es. `GlobalLeaderboard` es un *read-model
   aggregate*: se construye en memoria a partir de `player_progress.best` +
   `users`, no se persiste.
4. **`Leaderboard.top()` deduplica por `userId`.** Con reintentos de
   `POST /leaderboard` el top-N podía terminar siendo N filas del mismo
   jugador.

## Consecuencias

- El leaderboard es O(N) sin paginar (carga todo y rankea en memoria). Es
  correcto y sobra para el volumen actual (N usuarios × ~15 niveles); el
  `CacheInterceptor` ya aplicado a `GET /leaderboard*` cubre el costo de
  repetición. Si escalara, la respuesta principiada es un read model CQRS
  (tabla-proyección escrita por el dominio), no volver a SQL crudo.
- Prueba ancla: `Leaderboard.reconstitute(lvl, [scoreA(90s), scoreB(1s)]).top(strategy, 1)`
  debe devolver `scoreB` — falla con la regla SQL vieja (`moves ASC`),
  pasa con el agregado de dominio, y sobrevive a cambios de fórmula porque
  la strategy es un parámetro, no un valor fijo.
