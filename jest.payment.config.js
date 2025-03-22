/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/adapters/payment/**/*.test.ts',
    '**/tests/unit/infrastructure/api/**/*payment*.test.ts',
    '**/tests/unit/core/domain/booking/**/*.test.ts',
    '**/tests/unit/core/application/use-cases/payment/**/*.test.ts',
    '**/tests/unit/client/**/*payment*.test.tsx',
    '**/tests/integration/**/*payment*.test.ts',
    '**/tests/e2e/**/*payment*.test.ts',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  projects: [
    {
      displayName: 'payment-domain',
      testMatch: ['<rootDir>/tests/unit/core/domain/booking/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'payment-application',
      testMatch: ['<rootDir>/tests/unit/core/application/use-cases/payment/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'payment-adapters',
      testMatch: ['<rootDir>/tests/unit/adapters/payment/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'payment-infrastructure',
      testMatch: ['<rootDir>/tests/unit/infrastructure/api/**/*payment*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'payment-client',
      testMatch: ['<rootDir>/tests/unit/client/**/*payment*.test.tsx'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-jsdom.ts'],
    },
    {
      displayName: 'payment-integration',
      testMatch: [
        '<rootDir>/tests/integration/**/*payment*.test.ts',
        '<rootDir>/tests/integration/**/*stripe*.test.ts'
      ],
      testEnvironment: 'node',
    },
    {
      displayName: 'payment-e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*payment*.test.ts'],
      testEnvironment: 'node',
    }
  ]
};