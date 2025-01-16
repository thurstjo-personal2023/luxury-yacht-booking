import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { connectFunctionsEmulator } from "firebase/functions";
import { connectStorageEmulator } from "firebase/storage";
import type { FirebaseApp } from 'firebase/app';

export const EMULATOR_CONFIG = {
  auth: { port: 9099 },
  firestore: { port: 8080 },
  functions: { port: 5001 },
  storage: { port: 9199 },
  ui: { port: 4000 },
  hub: { port: 4400 }
};

interface FirebaseServices {
  app: FirebaseApp;
  auth: any;
  db: any;
  functions: any;
  storage: any;
}

export function getEmulatorHost() {
  // Get the full Replit URL if available
  if (window.location.hostname.includes('.repl.co')) {
    return window.location.hostname;
  }
  return 'localhost';
}

export function getEmulatorUIUrl() {
  const host = getEmulatorHost();
  const protocol = host === 'localhost' ? 'http' : 'https';
  const url = `${protocol}://${host}:${EMULATOR_CONFIG.ui.port}`;
  return url;
}

export async function connectToEmulators(services: FirebaseServices) {
  if (!import.meta.env.DEV) {
    console.log('Skipping emulator connection in production');
    return;
  }

  try {
    const host = getEmulatorHost();
    const uiUrl = getEmulatorUIUrl();

    console.log('\n🔥 Firebase Emulator Configuration:');
    console.log('--------------------------------');
    console.log(`Host: ${host}`);
    console.log(`Emulator UI: ${uiUrl}`);
    console.log('--------------------------------\n');

    const { auth, db, functions, storage } = services;

    // Connect to Auth emulator
    connectAuthEmulator(auth, `http://${host}:${EMULATOR_CONFIG.auth.port}`, { disableWarnings: true });

    // Connect to Firestore emulator
    connectFirestoreEmulator(db, host, EMULATOR_CONFIG.firestore.port);

    // Connect to Functions emulator
    connectFunctionsEmulator(functions, host, EMULATOR_CONFIG.functions.port);

    // Connect to Storage emulator
    connectStorageEmulator(storage, host, EMULATOR_CONFIG.storage.port);

    console.log('✅ All Firebase emulators connected successfully');
    console.log('\n📝 Note: You may need to accept the self-signed certificate warning in your browser');
    console.log('   when accessing the Emulator UI for the first time.\n');

  } catch (error) {
    console.error('Error connecting to Firebase emulators:', error);
    throw error;
  }
}

async function testEmulatorConnections(services: Omit<FirebaseServices, 'app'>) {
  try {
    const { auth, db, functions, storage } = services;
    const results = [];

    // Test Auth connection
    console.log('Testing Auth emulator connection...');
    try {
      await auth.signInAnonymously();
      await auth.signOut();
      results.push('✅ Auth emulator connection verified');
    } catch (error: any) {
      // Ignore admin-restricted-operation error as it still indicates the emulator is working
      if (error.code !== 'auth/admin-restricted-operation') {
        throw error;
      }
      results.push('✅ Auth emulator connection verified (with expected restriction)');
    }

    // Test Firestore connection
    console.log('Testing Firestore emulator connection...');
    try {
      const testRef = db.collection('_test_').doc('_test_');
      await testRef.get();
      results.push('✅ Firestore emulator connection verified');
    } catch (error: any) {
      if (!error.message?.includes('permission-denied')) {
        throw error;
      }
      results.push('✅ Firestore emulator connection verified (with expected permission denial)');
    }

    // Test Functions connection
    console.log('Testing Functions emulator connection...');
    try {
      const host = getEmulatorHost();
      const functionUrl = `http://${host}:${EMULATOR_CONFIG.functions.port}`;
      const response = await fetch(functionUrl);
      // Functions emulator returns 404 when no functions are deployed
      if (response.status === 404) {
        results.push('✅ Functions emulator connection verified');
      } else {
        throw new Error(`Unexpected response from Functions emulator: ${response.status}`);
      }
    } catch (error: any) {
      if (!error.message?.includes('404')) {
        throw error;
      }
      results.push('✅ Functions emulator connection verified (with expected 404)');
    }

    // Test Storage connection
    console.log('Testing Storage emulator connection...');
    try {
      await storage.ref().root.child('_test_').listAll();
      results.push('✅ Storage emulator connection verified');
    } catch (error: any) {
      if (!error.message?.includes('not-found')) {
        throw error;
      }
      results.push('✅ Storage emulator connection verified (with expected not-found)');
    }

    // Log all results
    results.forEach(result => console.log(result));
    console.log('All emulator connections verified successfully');
  } catch (error) {
    console.error('Failed to verify emulator connections:', error);
    throw error;
  }
}