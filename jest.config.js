/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/*.test.ts', '**/*.test.tsx'],
  passWithNoTests: true,
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx}',
    '!packages/**/*.d.ts',
    '!packages/**/dist/**',
    '!packages/**/node_modules/**',
    '!packages/**/__tests__/**',
    '!packages/**/*.test.{ts,tsx}',
  ],
  coverageDirectory: '<rootDir>/coverage',
  moduleNameMapper: {
    '^@writing-tools/shared$': '<rootDir>/packages/shared/src',
    '^@writing-tools/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10000,
};
