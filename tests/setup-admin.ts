/**
 * Setup file for admin registration tests
 * 
 * This module initializes a testing environment for administrator
 * registration tests, including Firebase emulator connections.
 */
import * as firebase from 'firebase/app';
import { getAuth, signOut, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Initialize Firebase for tests
beforeAll(async () => {
  try {
    // Check if app already exists to avoid duplicate initialization
    firebase.getApp();
  } catch (error) {
    // Initialize Firebase with test config
    firebase.initializeApp({
      apiKey: 'fake-api-key',
      authDomain: 'localhost',
      projectId: 'etoile-yachts-test',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    });
  }
  
  // Get auth and Firestore instances
  const auth = getAuth();
  const db = getFirestore();
  
  // Connect to emulators
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  
  // Sign out any existing user to ensure a clean state
  await signOut(auth).catch(() => {
    // Ignore errors if no user is signed in
  });
  
  // Add to global scope for test access
  const globalAny = global as any;
  globalAny.__FIREBASE_TEST_ENV__ = {
    app: firebase.getApp(),
    auth,
    firestore: db,
    cleanup: async () => {
      await signOut(auth).catch(() => {});
    }
  };
});

// Clean up after all tests
afterAll(async () => {
  try {
    // Run cleanup function
    const globalAny = global as any;
    await globalAny.__FIREBASE_TEST_ENV__?.cleanup();
    
    // Firebase v9 doesn't support app.delete() in the same way as v8
    // We'll sign out and let garbage collection handle the app instance
    try {
      await signOut(getAuth());
    } catch (error) {
      // Ignore errors if already signed out
    }
  } catch (error) {
    console.error('Error cleaning up Firebase test environment:', error);
  }
});