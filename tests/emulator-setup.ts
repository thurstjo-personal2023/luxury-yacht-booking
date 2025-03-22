/**
 * Firebase Emulator Setup
 * 
 * This module provides helper functions for connecting to and working with
 * the Firebase Emulator Suite in tests.
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import axios from 'axios';

// Emulator hosts and ports
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
  app: firebase.app.App;
  auth?: Auth;
  firestore?: Firestore;
  storage?: any; // Using 'any' to avoid TypeScript errors
}

/**
 * Default Firebase configuration for emulators
 */
export const defaultFirebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'localhost',
  projectId: 'test-project',
  storageBucket: 'test-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef1234567890'
};

/**
 * Initialize the Firebase emulators for testing
 */
export function initializeTestEnvironment(config: EmulatorConfig): EmulatorInstance {
  // Set up Firebase app
  const firebaseConfig = {
    ...defaultFirebaseConfig,
    projectId: config.projectId
  };
  
  const host = config.host || EMULATOR_HOST;
  const ports = {
    auth: config.ports?.auth || EMULATOR_PORTS.auth,
    firestore: config.ports?.firestore || EMULATOR_PORTS.firestore,
    storage: config.ports?.storage || EMULATOR_PORTS.storage
  };
  
  // Initialize the app if no apps exist or get the existing one
  const app = !firebase.apps.length
    ? firebase.initializeApp(firebaseConfig)
    : firebase.app();
  
  // Set up emulators
  if (config.useAuth !== false) {
    app.auth().useEmulator(`http://${host}:${ports.auth}`);
    console.log(`Using Auth emulator at http://${host}:${ports.auth}`);
  }
  
  if (config.useFirestore !== false) {
    app.firestore().useEmulator(host, ports.firestore);
    app.firestore().settings({
      experimentalForceLongPolling: true,
      merge: true
    });
    console.log(`Using Firestore emulator at http://${host}:${ports.firestore}`);
  }
  
  if (config.useStorage !== false) {
    app.storage().useEmulator(host, ports.storage);
    console.log(`Using Storage emulator at http://${host}:${ports.storage}`);
  }
  
  const instance: EmulatorInstance = { app };
  
  // Create ready-to-use instances
  if (config.useAuth !== false) {
    instance.auth = app.auth() as unknown as Auth;
  }
  
  if (config.useFirestore !== false) {
    instance.firestore = app.firestore() as unknown as Firestore;
  }
  
  if (config.useStorage !== false) {
    instance.storage = app.storage();
  }
  
  return instance;
}

/**
 * Clean up the Firebase emulator instance
 */
export async function cleanupTestEnvironment(instance: EmulatorInstance): Promise<void> {
  if (instance.auth) {
    await instance.auth.signOut();
  }
  
  await instance.app.delete();
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
export async function checkEmulators(config: EmulatorConfig): Promise<boolean> {
  const host = config.host || EMULATOR_HOST;
  const ports = {
    firestore: config.ports?.firestore || EMULATOR_PORTS.firestore
  };
  
  try {
    // Try to connect to the Firestore emulator
    await axios.get(`http://${host}:${ports.firestore}/`, { timeout: 2000 });
    return true;
  } catch (error) {
    console.error('Failed to connect to Firebase emulators:', error);
    return false;
  }
}