const baseConfig = require('../../jest.config.js');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: 'shared',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.ts', '<rootDir>/src/**/*.test.ts'],
  passWithNoTests: true,
  moduleNameMapper: {
    '^@writing-tools/shared$': '<rootDir>/src',
    '^@writing-tools/shared/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
};
