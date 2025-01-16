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

function getEmulatorHost() {
  const host = window.location.hostname;
  return host.includes('.repl.co') ? host : 'localhost';
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  const host = getEmulatorHost();

  // Connect Auth Emulator
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });

  // Connect Firestore Emulator
  connectFirestoreEmulator(db, host, 8080);

  // Connect Functions Emulator
  connectFunctionsEmulator(functions, host, 5001);

  // Connect Storage Emulator
  connectStorageEmulator(storage, host, 9199);

  console.log('Firebase emulators connected:', {
    host,
    ports: {
      auth: 9099,
      firestore: 8080,
      functions: 5001,
      storage: 9199
    }
  });
}