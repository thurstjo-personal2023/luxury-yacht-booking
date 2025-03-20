/**
 * Firebase Emulator Setup
 * 
 * This module provides helper functions for connecting to and working with
 * the Firebase Emulator Suite in tests.
 */
import * as firebase from 'firebase/app';
import { Auth, getAuth, connectAuthEmulator } from 'firebase/auth';
import { Firestore, getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { Storage, getStorage, connectStorageEmulator } from 'firebase/storage';

// Default emulator host
export const EMULATOR_HOST = 'localhost';

// Default emulator ports
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
  storage?: Storage;
}

/**
 * Default Firebase configuration for emulators
 */
export const defaultFirebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'localhost',
  projectId: 'etoile-yachts',
  storageBucket: 'etoile-yachts.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef123456'
};

/**
 * Initialize the Firebase emulators for testing
 */
export function initializeTestEnvironment(config: EmulatorConfig): EmulatorInstance {
  const host = config.host || EMULATOR_HOST;
  const ports = { ...EMULATOR_PORTS, ...config.ports };
  
  // Initialize Firebase with test configuration
  const app = firebase.initializeApp({
    ...defaultFirebaseConfig,
    projectId: config.projectId
  });
  
  const instance: EmulatorInstance = { app };
  
  // Connect Auth emulator
  if (config.useAuth !== false) {
    const auth = getAuth(app);
    connectAuthEmulator(
      auth, 
      `http://${host}:${ports.auth}`, 
      { disableWarnings: config.disableWarnings }
    );
    instance.auth = auth;
  }
  
  // Connect Firestore emulator
  if (config.useFirestore !== false) {
    const firestore = getFirestore(app);
    connectFirestoreEmulator(firestore, host, ports.firestore);
    instance.firestore = firestore;
  }
  
  // Connect Storage emulator
  if (config.useStorage) {
    const storage = getStorage(app);
    connectStorageEmulator(storage, host, ports.storage);
    instance.storage = storage;
  }
  
  return instance;
}

/**
 * Clean up the Firebase emulator instance
 */
export async function cleanupTestEnvironment(instance: EmulatorInstance): Promise<void> {
  await instance.app.delete();
}

/**
 * Generate a unique test ID
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Check if Firebase emulators are running
 */
export async function checkEmulators(config: EmulatorConfig): Promise<boolean> {
  try {
    const host = config.host || EMULATOR_HOST;
    const ports = { ...EMULATOR_PORTS, ...config.ports };
    
    // Check Firestore emulator
    const firestoreResponse = await fetch(`http://${host}:${ports.firestore}/`, {
      method: 'GET'
    });
    
    // Check Auth emulator
    const authResponse = await fetch(`http://${host}:${ports.auth}/`, {
      method: 'GET'
    });
    
    return firestoreResponse.status !== 0 && authResponse.status !== 0;
  } catch (error) {
    console.error('Error checking emulators:', error);
    return false;
  }
}