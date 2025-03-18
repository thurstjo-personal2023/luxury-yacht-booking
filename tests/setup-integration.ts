/**
 * Jest setup file for integration testing
 * This handles Firebase emulator connections and cleanup
 */

import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';

// Global variable to hold test environment
let testEnv: RulesTestEnvironment;

// Setup Firebase test environment before tests
beforeAll(async () => {
  // Initialize the Firebase test environment
  testEnv = await initializeTestEnvironment({
    projectId: 'etoile-yachts-test',
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8'),
    },
  });

  // Clear any existing data
  await testEnv.clearFirestore();
  
  // Make testEnv available globally
  (global as any).__FIREBASE_TEST_ENV__ = testEnv;
});

// Cleanup after all tests
afterAll(async () => {
  // Cleanup Firebase test environment
  if (testEnv) {
    await testEnv.cleanup();
  }
});