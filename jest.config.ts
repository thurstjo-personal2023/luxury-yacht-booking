import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  testMatch: [
    '**/__tests__/**/*.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)'
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'client/src/**/*.{ts,tsx}',
    'server/**/*.ts',
    'shared/**/*.ts',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  // Create separate test configurations
  projects: [
    {
      displayName: 'client',
      testMatch: ['<rootDir>/client/src/**/*.test.{ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-jsdom.ts'],
    },
    {
      displayName: 'server',
      testMatch: ['<rootDir>/server/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-node.ts'],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-integration.ts'],
    }
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};

export default config;