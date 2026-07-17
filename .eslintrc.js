/**
 * ESLint (config clásica, estilo NestJS 10).
 *
 * Sin `parserOptions.project` a propósito: el linting con información de tipos
 * exigiría que cada archivo esté incluido en `tsconfig.json`, pero ese tsconfig
 * excluye `test/`. Las reglas `recommended` no necesitan tipos, así que evitamos
 * ese acoplamiento y podemos lintar `src/` y `test/` con la misma config.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'coverage/', 'node_modules/'],
  rules: {
    // NestJS usa decoradores y DI: estas reglas generan ruido sin aportar valor.
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  overrides: [
    {
      // Enforces the Clean Architecture dependency rule: domain/ and
      // application/ must stay framework-agnostic and never import outward
      // into adapters/ or infrastructure/. This turns a one-off grep audit
      // into a build-breaking guarantee.
      files: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@nestjs/*',
                  'typeorm',
                  'bcrypt',
                  'jsonwebtoken',
                  'express',
                  '**/adapters/*',
                  '**/infrastructure/*',
                ],
                message:
                  'domain/ and application/ must not depend on adapters/, infrastructure/, or any framework — they are inner layers per the dependency rule.',
              },
            ],
          },
        ],
      },
    },
  ],
};
