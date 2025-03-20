/**
 * Jest setup file for Firebase Emulator tests
 * 
 * This file sets up the Firebase Emulator environment for testing
 * and provides global helper functions for tests that use Firebase.
 */
import { initializeTestEnvironment, checkEmulators, EmulatorInstance } from './emulator-setup';

// Check if emulators need to be started before tests
beforeAll(async () => {
  // Check if Firebase emulators are running
  const emulatorsRunning = await checkEmulators({
    projectId: 'etoile-yachts',
    useAuth: true,
    useFirestore: true
  });
  
  if (!emulatorsRunning) {
    console.warn(
      'Firebase emulators not detected! ' +
      'Please start the emulators before running tests:\n' +
      'firebase emulators:start'
    );
  }
  
  // Add global access to Firebase emulator environment
  // This will be available to all test files
  global.__FIREBASE_TEST_ENV__ = initializeTestEnvironment({
    projectId: 'etoile-yachts',
    useAuth: true,
    useFirestore: true,
    disableWarnings: true
  });
});

// Clean up after all tests
afterAll(async () => {
  try {
    // Clean up test environment
    await global.__FIREBASE_TEST_ENV__.app.delete();
  } catch (error) {
    console.error('Error cleaning up Firebase test environment:', error);
  }
});