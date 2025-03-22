/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/payment-status-test.cjs'
  ],
  verbose: true,
  // Add a timeout of 10 seconds
  testTimeout: 10000
};