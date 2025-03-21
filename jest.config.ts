import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@components/(.*)$': '<rootDir>/client/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/client/src/hooks/$1',
    '^@lib/(.*)$': '<rootDir>/client/src/lib/$1',
    '^@ui/(.*)$': '<rootDir>/client/src/components/ui/$1',
    // Handle CSS imports (if needed)
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.js',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: true,
    }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testMatch: [
    '**/__tests__/**/*.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)'
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'client/src/**/*.{ts,tsx}',
    'server/**/*.ts',
    'shared/**/*.ts',
    'functions/**/*.{js,ts}',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/dist/**',
    '!**/*.d.ts'
  ],
  // Increase test timeout for slower operations
  testTimeout: 30000,
  // Create separate test configurations
  projects: [
    {
      displayName: 'client',
      testMatch: [
        '<rootDir>/client/src/**/*.test.{ts,tsx}',
        '<rootDir>/tests/*.test.{ts,tsx}'  // Include tests in tests directory
      ],
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
    },
    {
      displayName: 'functions',
      testMatch: ['<rootDir>/functions/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-node.ts'],
    },
    {
      displayName: 'emulator',
      testMatch: [
        '<rootDir>/tests/auth.test.ts',
        '<rootDir>/tests/firestore.test.ts'
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-emulator.ts'],
    },
    {
      displayName: 'admin',
      testMatch: [
        '<rootDir>/tests/admin-registration.test.ts',
        '<rootDir>/tests/admin-routes.test.ts'
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-admin.ts'],
    },
    {
      displayName: 'admin-ui',
      testMatch: [
        '<rootDir>/tests/use-admin-auth.test.tsx',
        '<rootDir>/tests/admin-login-flow.test.tsx',
        '<rootDir>/tests/admin-session.test.tsx',
        '<rootDir>/tests/admin-mfa.test.tsx'
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-jsdom.ts', '<rootDir>/tests/setup-admin.ts'],
    }
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true,
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx'
      }
    }
  }
};

export default config;