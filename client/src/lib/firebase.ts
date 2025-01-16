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
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  try {
    const host = window.location.hostname;
    console.log('Connecting to Firebase emulators on host:', host);

    // Connect to Auth emulator on port 3003
    connectAuthEmulator(auth, `http://${host}:3003`, { disableWarnings: true });

    // Connect to Firestore emulator on port 8080
    connectFirestoreEmulator(db, host, 8080);

    // Connect to Functions emulator on port 5001
    connectFunctionsEmulator(functions, host, 5001);

    // Connect to Storage emulator on port 9199
    connectStorageEmulator(storage, host, 9199);

    console.log('Firebase emulators connected successfully:', {
      host,
      ports: {
        auth: 3003,
        firestore: 8080,
        functions: 5001,
        storage: 9199
      }
    });
  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
}