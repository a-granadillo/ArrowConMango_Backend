# Guía de contribución

Flujo de trabajo del backend **Arrow con Mango**. El objetivo es que cada cambio
entre a `master` ya validado por Integración Continua (CI), de forma reproducible.

## Flujo de trabajo (branch → PR → CI → merge)

1. **Crea una rama** desde `master` con un nombre descriptivo según el tipo de cambio:
   - `feat/...` — nueva funcionalidad (p. ej. `feat/refresh-tokens`)
   - `fix/...` — corrección de bug
   - `test/...` — pruebas
   - `docs/...` — documentación
   - `chore/...` / `refactor/...` — mantenimiento sin cambio de comportamiento

   ```bash
   git checkout master && git pull
   git checkout -b feat/mi-cambio
   ```

2. **Trabaja y commitea** siguiendo [Conventional Commits](https://www.conventionalcommits.org/):
   `tipo(scope): descripción` — p. ej. `feat(auth): add refresh token endpoint`.

3. **Valida en local** antes de subir (es exactamente lo que correrá el CI):

   ```bash
   npm run format:check
   npm run lint
   npm run build
   npm run test:coverage
   ```

   Atajos útiles: `npm run format` y `npm run lint:fix` corrigen automáticamente.

4. **Abre un Pull Request** hacia `master`. El workflow **CI** se ejecutará y debe
   quedar en verde (lint · build · 86 tests) para poder hacer merge.

5. **Merge** una vez aprobado y con el CI en verde. `master` está protegido: no se
   permite push directo.

## Integración Continua

El workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) corre en cada push
a `master` y en cada PR. Pasos: instalar (`npm ci --legacy-peer-deps`), `format:check`,
`lint`, `build` y `test:coverage`. No requiere secretos: los tests usan SQLite `:memory:`.

## Requisitos de entorno

- **Node.js >= 20** (ver `.nvmrc`).
- Instalación: `npm install --legacy-peer-deps` (conflicto de peer deps de NestJS 10).
