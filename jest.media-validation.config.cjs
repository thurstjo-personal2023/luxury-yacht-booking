/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  testMatch: [
    '**/tests/url-resolver.test.js',
    '**/tests/media-type-detector.test.js',
    '**/tests/media-type-detector.simplified.test.js',
    '**/tests/media-repair-service.test.js'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  }
};