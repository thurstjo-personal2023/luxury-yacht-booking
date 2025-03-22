/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: [
    "**/tests/integration/**/*.test.ts",
    "**/tests/e2e/**/*.test.ts"
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: './tsconfig.json',
    }]
  },
  setupFilesAfterEnv: [
    './tests/setup-emulator.ts'
  ],
  testTimeout: 30000, // Longer timeout for integration tests
  silent: false,
  verbose: true,
  collectCoverage: true,
  coverageDirectory: './coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  reporters: ['default', 'jest-junit'],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};