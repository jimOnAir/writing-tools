const baseConfig = require('../../jest.config.js');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  displayName: 'renderer',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.{ts,tsx}', '<rootDir>/src/**/*.test.{ts,tsx}'],
  passWithNoTests: true,
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@writing-tools/shared$': '<rootDir>/../shared/src',
    '^@writing-tools/shared/(.*)$': '<rootDir>/../shared/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
    '^.+\\.m?js$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { modules: 'commonjs' }],
        ],
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(marked|dompurify)/)',
  ],
};
