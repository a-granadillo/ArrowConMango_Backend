/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@adapters/(.*)$': '<rootDir>/src/adapters/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
  },
  collectCoverageFrom: [
    'src/domain/**/*.ts',
    'src/application/**/*.ts',
    'src/adapters/**/*.ts',
    'src/infrastructure/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  testTimeout: 30000,
};
