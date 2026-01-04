const baseConfig = require('../../jest.config.js');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: 'main',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.ts', '<rootDir>/src/**/*.test.ts'],
  passWithNoTests: true,
  moduleNameMapper: {
    '^@writing-tools/shared$': '<rootDir>/../shared/src',
    '^@writing-tools/shared/(.*)$': '<rootDir>/../shared/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(better-sqlite3-multiple-ciphers)/)',
  ],
};
