import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID'
];

requiredEnvVars.forEach(varName => {
  if (!import.meta.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Connect to local emulators in development
if (import.meta.env.DEV) {
  const host = '127.0.0.1';

  try {
    // Connect Auth Emulator
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });

    // Connect Firestore Emulator
    connectFirestoreEmulator(db, host, 8080);

    // Connect Functions Emulator
    connectFunctionsEmulator(functions, host, 5001);

    // Connect Storage Emulator with error handling
    connectStorageEmulator(storage, host, 9199);

    console.log('\n🔥 Firebase Emulator Configuration:');
    console.log('--------------------------------');
    console.log('Connected to local Firebase emulators:');
    console.log('Auth:', `http://${host}:9099`);
    console.log('Firestore:', `http://${host}:8080`);
    console.log('Functions:', `http://${host}:5001`);
    console.log('Storage:', `http://${host}:9199`);
    console.log('Data Connect:', `http://${host}:9399`);
    console.log('Cloud Tasks:', `http://${host}:9499`);
    console.log('Emulator Hub:', `http://${host}:4400`);
    console.log('Emulator UI:', `http://${host}:4000`);
    console.log('--------------------------------\n');
  } catch (error) {
    console.error('Error connecting to Firebase emulators:', error);
  }
}