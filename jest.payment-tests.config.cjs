/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\.tsx?$': ['ts-jest', {
      useESM: false,
    }],
  },
  testMatch: [
    '<rootDir>/tests/payment-status-test.cjs',
    
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup-node.ts'],
  globals: {
    'ts-jest': {
      useESM: false,
    },
    jest: true
  }
};