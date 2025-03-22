/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
    }],
  },
  // Only test our simplified test file
  testMatch: [
    '<rootDir>/tests/unit/core/domain/payment/payment-status.simplified.test.cjs'
  ],
  // Add a timeout of 10 seconds
  testTimeout: 10000,
  // Enable verbose output
  verbose: true
};