/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/admin-registration.test.ts',
    '**/tests/use-admin-auth.test.tsx',
    '**/tests/admin-login-flow.test.tsx',
    '**/tests/admin-session.test.tsx',
    '**/tests/admin-mfa.test.tsx'
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
  setupFilesAfterEnv: ['<rootDir>/tests/setup-admin.ts'],
  projects: [
    {
      displayName: 'admin-api',
      testMatch: ['<rootDir>/tests/admin-registration.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-admin.ts'],
    },
    {
      displayName: 'admin-auth',
      testMatch: ['<rootDir>/tests/use-admin-auth.test.tsx'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-jsdom.ts'],
    },
    {
      displayName: 'admin-login-flow',
      testMatch: ['<rootDir>/tests/admin-login-flow.test.tsx'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-jsdom.ts'],
    },
    {
      displayName: 'admin-session',
      testMatch: ['<rootDir>/tests/admin-session.test.tsx'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-jsdom.ts'],
    },
    {
      displayName: 'admin-mfa',
      testMatch: ['<rootDir>/tests/admin-mfa.test.tsx'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup-jsdom.ts'],
    }
  ]
};