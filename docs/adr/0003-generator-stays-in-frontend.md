# ADR 0003 — El generador de niveles se queda en Dart; el backend solo sirve/valida

## Estado
Aceptada (F6).

## Contexto

El generador procedural de niveles (~2200 líneas Dart,
`level_generator.dart` + soporte) produce los 15 niveles de campaña y los
niveles infinitos del modo Supervivencia. `load_level_use_case.dart` lo usa
**en runtime** para generar niveles de Supervivencia bajo demanda — no es
solo una herramienta de build-time.

## Decisión

**Congelar, no portar.** Los 15 niveles de campaña se exportan una vez
(`tool/export_levels.dart` → `assets/levels/campaign_levels.json`) y se
siembran en el backend (`seed.ts` los lee byte-a-byte desde una copia de ese
mismo archivo). El backend nunca genera niveles — solo los persiste, los
sirve (`GET /levels`) y valida su *estructura* (`LevelDefinition.validate()`:
flechas dentro del tablero, ids únicos, segmentos ≥ 1).

Portar el generador a TypeScript dejaría dos implementaciones del mismo
algoritmo (PRNG, plantillas de patrones, heurísticas de complejidad) que
mantener sincronizadas para siempre, a cambio de nada: el modo Supervivencia
seguirá generando en el cliente indefinidamente (es su diseño), y los 15
niveles de campaña son constantes una vez congelados.

## Consecuencias

- El backend es la fuente de verdad para el *catálogo servido*
  (`GET /levels`), pero no para el *algoritmo* que lo produjo. Si se
  necesita cambiar un nivel de campaña, el flujo es: ajustar
  `level_definitions.dart` en el frontend → re-exportar → re-copiar a
  `seed-data/campaign-levels.json` → re-sembrar. No hay un endpoint que
  "regenere" nada.
- Verificación end-to-end (F6): `GET /levels` debe ser byte-idéntico al
  artefacto congelado del frontend — si diverge, alguien editó uno de los
  dos lados sin re-sincronizar.
