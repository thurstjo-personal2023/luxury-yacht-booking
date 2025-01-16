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
  return '127.0.0.1';
}

export function getEmulatorUIUrl() {
  const host = getEmulatorHost();
  return `http://${host}:${EMULATOR_CONFIG.ui.port}`;
}

export function connectToEmulators(services: FirebaseServices) {
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

    console.log('✅ Connected to Firebase emulators successfully');

  } catch (error) {
    console.error('Error connecting to Firebase emulators:', error);
    throw error;
  }
}