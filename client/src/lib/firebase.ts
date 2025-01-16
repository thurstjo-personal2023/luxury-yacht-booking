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
    const isReplitDev = host.includes('.replit.dev');

    // For Replit dev URLs, we need to use HTTPS and the mapped ports
    if (isReplitDev) {
      // Use mapped ports from .replit configuration
      connectAuthEmulator(auth, `https://${host}:3003`, { disableWarnings: true });
      connectFirestoreEmulator(db, host, 8080);
      connectFunctionsEmulator(functions, host, 5000);
      connectStorageEmulator(storage, host, 9199);
    } else {
      // Local development
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, host, 8080);
      connectFunctionsEmulator(functions, host, 5001);
      connectStorageEmulator(storage, host, 9199);
    }

    console.log("Firebase emulator configuration:", {
      host,
      isReplitDev,
      ports: {
        auth: isReplitDev ? 3003 : 9099,
        firestore: 8080,
        functions: isReplitDev ? 5000 : 5001,
        storage: 9199
      }
    });
  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
}