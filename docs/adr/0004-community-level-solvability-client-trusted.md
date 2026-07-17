# ADR 0004 — Solvabilidad de niveles de comunidad: confiada al cliente, por demostración

## Estado
Aceptada (F8, Modo Creativo).

## Contexto

El Modo Creativo permite a cualquier jugador diseñar y publicar un nivel. Un
nivel de comunidad mal formado estructuralmente ya se rechaza
(`LevelDefinition.validate()`: flechas dentro del tablero, ids únicos,
`timeLimitSeconds` en rango, `maxMistakes` correcto). Pero *estructuralmente
válido* no implica *resoluble* — un jugador podría publicar (por accidente o
a propósito) un tablero sin solución.

El solver que decide "¿este tablero tiene solución?" es determinista, sin
PRNG, y vive en el frontend (`LevelSolver`, extraído del método privado
`_isSolvable` de `level_generator.dart` — ver ADR del frontend
correspondiente). Portarlo a TypeScript para validar solvabilidad en el
servidor es factible (~230 líneas) pero no trivial, y duplica de nuevo un
algoritmo entre dos lenguajes (mismo problema que la ADR 0003 evita para el
generador).

## Decisión

**Solvabilidad verificada por demostración, no por servidor.** El editor
exige que el autor **resuelva su propio nivel antes de publicarlo**
(`POST /levels/:id/publish` — el flujo del cliente no permite llegar a este
endpoint sin haber completado una partida del nivel en el propio editor).
Esto:

1. Evita niveles basura sin que el backend necesite ejecutar el solver.
2. Le da al autor, gratis, el primer puesto de su propio ranking — igual que
   Super Mario Maker.

**Trade-off aceptado explícitamente:** un cliente modificado (API llamada
directamente, sin pasar por el editor) podría publicar un nivel imposible.
El backend no lo detecta. Se documenta como deuda conocida, no como bug.

## Consecuencias

- Si en el futuro esto se vuelve un problema real (niveles imposibles en
  producción), la solución principiada es portar `LevelSolver` a
  TypeScript y ejecutarlo server-side en `PublishLevelUseCase` antes de
  marcar `isPublished = true` — es un cambio acotado (un solo caso de uso)
  gracias a que la decisión de dónde vive la validación estructural
  (`LevelDefinition.validate()`) ya está separada de dónde vive la
  solvabilidad.
- Esta ADR depende de que el flujo del editor (frontend) efectivamente
  bloquee la publicación sin una resolución previa — es una invariante de
  UX, no de dominio; el backend no la puede hacer cumplir por sí solo.
