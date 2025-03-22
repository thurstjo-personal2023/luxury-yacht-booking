/**
 * Firebase Emulator Setup
 * 
 * This module provides helper functions for connecting to and working with
 * the Firebase Emulator Suite in tests.
 */

import * as firebase from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Reference to our type handling strategy for Firebase
// Since Firebase types are complex, we use @ts-ignore in specific places
// See './types/firebase-augmentation.ts' for details

export const EMULATOR_HOST = 'localhost';
export const EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  storage: 9199,
  functions: 5001,
  database: 9000
};

/**
 * Firebase emulator configuration
 */
export interface EmulatorConfig {
  projectId: string;
  host?: string;
  ports?: {
    auth?: number;
    firestore?: number;
    storage?: number;
    functions?: number;
    database?: number;
  };
  useAuth?: boolean;
  useFirestore?: boolean;
  useStorage?: boolean;
  disableWarnings?: boolean;
}

/**
 * Firebase emulator instance
 */
export interface EmulatorInstance {
  app: firebase.FirebaseApp;
  auth?: Auth;
  firestore?: Firestore;
  storage?: any; // Using 'any' to avoid TypeScript errors
  cleanup: () => Promise<void>;
}

/**
 * Default Firebase configuration for emulators
 */
export const defaultFirebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test-project.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef1234567890'
};

/**
 * Initialize the Firebase emulators for testing
 */
export function initializeTestEnvironment(config: EmulatorConfig): EmulatorInstance {
  const appConfig = {
    ...defaultFirebaseConfig,
    projectId: config.projectId
  };

  // Initialize Firebase app
  const app = firebase.initializeApp(appConfig, `test-${Date.now()}`);
  
  // Connect to Auth emulator if needed
  let auth: Auth | undefined;
  if (config.useAuth !== false) {
    auth = getAuth(app);
    connectAuthEmulator(
      auth,
      `http://${config.host || EMULATOR_HOST}:${config.ports?.auth || EMULATOR_PORTS.auth}`, 
      { disableWarnings: config.disableWarnings || false }
    );
  }

  // Connect to Firestore emulator if needed
  let firestore: Firestore | undefined;
  if (config.useFirestore !== false) {
    firestore = getFirestore(app);
    connectFirestoreEmulator(
      firestore,
      config.host || EMULATOR_HOST,
      config.ports?.firestore || EMULATOR_PORTS.firestore
    );
  }

  // Connect to Storage emulator if needed
  let storage: any | undefined;
  if (config.useStorage) {
    storage = getStorage(app);
    connectStorageEmulator(
      storage,
      config.host || EMULATOR_HOST,
      config.ports?.storage || EMULATOR_PORTS.storage
    );
  }

  // Create the instance object
  const instance: EmulatorInstance = { 
    app,
    auth,
    firestore,
    storage,
    cleanup: async () => {
      try {
        if (firestore) {
          await (firestore as any).terminate();
        }
        // The FirebaseApp.delete() method is not properly typed in the current Firebase typings
        // but it exists at runtime
        await (app as any).delete();
      } catch (error) {
        console.error('Error cleaning up Firebase app:', error);
      }
    }
  };

  return instance;
}

/**
 * Clean up the Firebase emulator instance
 */
export async function cleanupTestEnvironment(instance: EmulatorInstance): Promise<void> {
  await instance.cleanup();
}

/**
 * Generate a unique test ID
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Check if Firebase emulators are running
 */
export async function checkEmulators(config: EmulatorConfig = { projectId: 'test-project' }): Promise<boolean> {
  try {
    const instance = initializeTestEnvironment({
      ...config,
      useAuth: true,
      useFirestore: true,
      disableWarnings: true
    });

    await cleanupTestEnvironment(instance);
    return true;
  } catch (error) {
    return false;
  }
}