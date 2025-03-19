/**
 * Jest setup file for integration testing
 * This handles Firebase emulator connections and cleanup
 */

import * as admin from 'firebase-admin';
import { RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Use the Firebase emulator configuration from our setup script
const emulatorConfig = require('../scripts/setup-test-emulators').config;

// Initialize test environment
let testEnv: RulesTestEnvironment;

// Increase Jest timeout for Firebase operations
jest.setTimeout(30000);

// Set up the test environment before all tests
beforeAll(async () => {
  // Initialize the test environment with the emulator configuration
  testEnv = await initializeTestEnvironment({
    projectId: 'etoile-yachts-test',
    firestore: {
      host: emulatorConfig.firestore.host,
      port: emulatorConfig.firestore.port,
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
    },
    storage: {
      host: emulatorConfig.storage.host,
      port: emulatorConfig.storage.port,
      rules: `service firebase.storage {
        match /b/{bucket}/o {
          match /{allPaths=**} {
            allow read, write: if request.auth != null;
          }
        }
      }`
    }
  });
  
  // Make the test environment available globally
  global.__FIREBASE_TEST_ENV__ = testEnv;

  // Initialize Firebase Admin SDK
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'etoile-yachts-test',
    });
  }

  // Connect to emulators
  process.env.FIRESTORE_EMULATOR_HOST = `${emulatorConfig.firestore.host}:${emulatorConfig.firestore.port}`;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorConfig.auth.host}:${emulatorConfig.auth.port}`;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = `${emulatorConfig.storage.host}:${emulatorConfig.storage.port}`;
});

// Clear Firestore data between tests
beforeEach(async () => {
  await testEnv.clearFirestore();
});

// Clean up after all tests are done
afterAll(async () => {
  // Clean up all apps
  await Promise.all(admin.apps.map(app => app?.delete()));
  
  // Clean up test environment
  await testEnv.cleanup();
});

// Export the test environment for use in tests
export { testEnv };