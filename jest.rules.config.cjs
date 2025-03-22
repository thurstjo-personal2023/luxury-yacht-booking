/**
 * Jest configuration for Firebase security rules tests
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/security-rules.test.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }]
  },
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup-integration.ts'
  ]
};