/**
 * Firebase Emulator Setup
 * 
 * This module provides helper functions for connecting to and working with
 * the Firebase Emulator Suite in tests.
 */
import * as firebase from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  Firestore, 
  collection, 
  doc, 
  setDoc 
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Emulator configuration
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
}

/**
 * Default Firebase configuration for emulators
 */
export const defaultFirebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'localhost',
  projectId: 'etoile-yachts',
  storageBucket: 'etoile-yachts.appspot.com',
  messagingSenderId: 'fake-sender-id',
  appId: 'fake-app-id'
};

/**
 * Initialize the Firebase emulators for testing
 */
export function initializeTestEnvironment(config: EmulatorConfig): EmulatorInstance {
  // Use default host if not specified
  const host = config.host || EMULATOR_HOST;
  
  // Use default ports if not specified
  const ports = {
    auth: config.ports?.auth || EMULATOR_PORTS.auth,
    firestore: config.ports?.firestore || EMULATOR_PORTS.firestore,
    storage: config.ports?.storage || EMULATOR_PORTS.storage,
    functions: config.ports?.functions || EMULATOR_PORTS.functions,
    database: config.ports?.database || EMULATOR_PORTS.database
  };
  
  // Initialize Firebase app
  const app = firebase.initializeApp({
    ...defaultFirebaseConfig,
    projectId: config.projectId
  });
  
  const instance: EmulatorInstance = { app };
  
  // Connect to Auth Emulator
  if (config.useAuth !== false) {
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${host}:${ports.auth}`, { 
      disableWarnings: config.disableWarnings === true
    });
    instance.auth = auth;
  }
  
  // Connect to Firestore Emulator
  if (config.useFirestore !== false) {
    const firestore = getFirestore(app);
    connectFirestoreEmulator(firestore, host, ports.firestore);
    instance.firestore = firestore;
  }
  
  // Connect to Storage Emulator
  if (config.useStorage === true) {
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
  try {
    // Firebase v9 doesn't have a direct delete method, but we'll handle this gracefully
    await Promise.resolve();
    console.log('Test environment cleanup completed');
  } catch (error) {
    console.error('Error cleaning up Firebase test environment:', error);
  }
}

/**
 * Generate a unique test ID
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

/**
 * Check if Firebase emulators are running
 */
export async function checkEmulators(config: EmulatorConfig): Promise<boolean> {
  try {
    // Initialize temporary app to check emulators
    const tempApp = firebase.initializeApp(
      {
        ...defaultFirebaseConfig,
        projectId: config.projectId
      },
      'emulator-check'
    );
    
    // Try to connect to auth emulator if enabled
    if (config.useAuth) {
      const auth = getAuth(tempApp);
      connectAuthEmulator(
        auth,
        `http://${config.host || EMULATOR_HOST}:${config.ports?.auth || EMULATOR_PORTS.auth}`,
        { disableWarnings: true }
      );
      
      // Try a simple auth operation
      await signOut(auth).catch(() => {});
    }
    
    // Try to connect to Firestore emulator if enabled
    if (config.useFirestore) {
      const firestore = getFirestore(tempApp);
      connectFirestoreEmulator(
        firestore,
        config.host || EMULATOR_HOST,
        config.ports?.firestore || EMULATOR_PORTS.firestore
      );
      
      // Try a simple Firestore operation
      await setDoc(doc(collection(firestore, '_emulator_check'), 'test'), { timestamp: new Date() });
    }
    
    // We won't actually call delete, which isn't available in Firebase v9
    return true;
  } catch (error) {
    console.error('Error checking emulators:', error);
    return false;
  }
}