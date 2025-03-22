/**
 * Jest configuration for media domain tests
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/unit/core/domain/media/**/*.simplified.test.cjs'
  ],
  verbose: true,
  testTimeout: 10000
};