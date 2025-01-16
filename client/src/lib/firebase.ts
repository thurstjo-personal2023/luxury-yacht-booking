import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { connectToEmulators } from './emulators';

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

let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let functions: ReturnType<typeof getFunctions> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

async function initializeFirebase() {
  try {
    if (!app) {
      // Initialize Firebase
      app = initializeApp(firebaseConfig);

      // Initialize services
      auth = getAuth(app);
      db = getFirestore(app);
      functions = getFunctions(app);
      storage = getStorage(app);

      // Connect to emulators in development
      if (import.meta.env.DEV) {
        await connectToEmulators({ 
          app, 
          auth: auth!, 
          db: db!, 
          functions: functions!, 
          storage: storage! 
        });
        console.log('Firebase emulator suite initialized successfully');
      }
    }

    return {
      app: app!,
      auth: auth!,
      db: db!,
      functions: functions!,
      storage: storage!
    };
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

// Initialize services and export them
const firebaseInstance = await initializeFirebase();
export const {
  app: firebaseApp,
  auth: firebaseAuth,
  db: firebaseDb,
  functions: firebaseFunctions,
  storage: firebaseStorage
} = firebaseInstance;