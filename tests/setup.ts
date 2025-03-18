/**
 * Common Jest setup file
 * This file runs before each test file
 */

// Global jest configuration
jest.setTimeout(30000); // Increase timeout for Firebase operations

// Global mocks that apply to all tests
global.console = {
  ...console,
  // Uncomment to suppress specific console methods during tests
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
};

// Cleanup function to run after tests
afterAll(async () => {
  // Global cleanup here
});