/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@test/(.*)$': '<rootDir>/tests/$1',
  },
  testMatch: [
    "**/*.simplified.test.{ts,tsx}",
    "**/*.test.simplified.{ts,tsx}"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/"
  ],
  setupFiles: [
    "<rootDir>/tests/simple-setup.ts"
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};