import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
  persistentLocalCache,
  persistentSingleTabManager
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Firebase configuration with real values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase and export the app instance
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings for better offline support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    tabManager: persistentSingleTabManager({ forceOwnership: true })
  })
});

// Initialize other services
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const rtdb = getDatabase(app);

// Initialize auth state listener to manage tokens
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      // Get fresh token when auth state changes
      const token = await user.getIdToken(true);
      localStorage.setItem('authToken', token);
      console.log('Auth token refreshed and stored in localStorage');
      
      // Set up a token refresh interval (every 30 minutes)
      // This ensures the token stays valid for API requests
      const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds
      const tokenRefreshInterval = setInterval(async () => {
        try {
          if (auth.currentUser) {
            const refreshedToken = await auth.currentUser.getIdToken(true);
            localStorage.setItem('authToken', refreshedToken);
            console.log('Auth token refreshed periodically');
          } else {
            // Clear interval if user is no longer signed in
            clearInterval(tokenRefreshInterval);
          }
        } catch (refreshError) {
          console.error('Error during periodic token refresh:', refreshError);
        }
      }, TOKEN_REFRESH_INTERVAL);
      
      // Store the interval ID so it can be cleared on logout
      // @ts-ignore - Adding custom property to window
      window.__tokenRefreshInterval = tokenRefreshInterval;
      
    } catch (error) {
      console.error('Error refreshing auth token:', error);
    }
  } else {
    // Clear token when user signs out
    localStorage.removeItem('authToken');
    console.log('Auth token removed from localStorage');
    
    // Clear token refresh interval if it exists
    // @ts-ignore - Accessing custom property from window
    if (window.__tokenRefreshInterval) {
      // @ts-ignore - Accessing custom property from window
      clearInterval(window.__tokenRefreshInterval);
      // @ts-ignore - Cleaning up custom property
      window.__tokenRefreshInterval = null;
      console.log('Token refresh interval cleared');
    }
  }
});

// Always connect to emulators in development
console.log("Connecting to Firebase emulators...");

try {
  // Auth Emulator
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  console.log("✓ Auth emulator connected at: http://127.0.0.1:9099");

  // Firestore Emulator - Force connection regardless of environment
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  console.log("✓ Firestore emulator connected at: http://127.0.0.1:8080");

  // Storage Emulator
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  console.log("✓ Storage emulator connected at: http://127.0.0.1:9199");

  // Functions Emulator
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  console.log("✓ Functions emulator connected at: http://127.0.0.1:5001");

  // Realtime Database Emulator
  connectDatabaseEmulator(rtdb, "127.0.0.1", 9001);
  console.log("✓ Realtime Database emulator connected at: http://127.0.0.1:9001");

  console.log("All Firebase emulators connected successfully!");
} catch (error) {
  console.error("Error connecting to emulators:", error);
}

// Auth helpers with improved error handling and retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const retry = async (fn: () => Promise<any>, retries = MAX_RETRIES, delay = RETRY_DELAY) => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && error.code?.includes('network')) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await retry(() => signInWithEmailAndPassword(auth, email, password));
    
    // Get auth token and store in localStorage for API requests
    const token = await userCredential.user.getIdToken();
    localStorage.setItem('authToken', token);
    
    console.log("User logged in successfully, token stored in localStorage");
    return userCredential;
  } catch (error: any) {
    console.error("Login error:", error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const registerWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await retry(() => createUserWithEmailAndPassword(auth, email, password));
    
    // Get auth token and store in localStorage for API requests
    const token = await userCredential.user.getIdToken();
    localStorage.setItem('authToken', token);
    
    console.log("Successfully created Firebase Auth user, token stored in localStorage");
    return userCredential;
  } catch (error: any) {
    console.error("Registration error:", error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

// Sign out user and clear token
export const signOutUser = async () => {
  try {
    // First, explicitly clear token from localStorage
    localStorage.removeItem('authToken');
    
    // Then sign out from Firebase Auth (this will also trigger the auth state listener)
    await auth.signOut();
    
    // Clear token refresh interval if it exists
    // @ts-ignore - Accessing custom property from window
    if (window.__tokenRefreshInterval) {
      // @ts-ignore - Accessing custom property from window
      clearInterval(window.__tokenRefreshInterval);
      // @ts-ignore - Cleaning up custom property
      window.__tokenRefreshInterval = null;
    }
    
    console.log("User signed out successfully, token removed from localStorage");
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
};

// Get current auth token from localStorage
export const getCurrentToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Check if user is authenticated by verifying token exists
export const isAuthenticated = (): boolean => {
  return !!getCurrentToken();
};

// Helper to get user-friendly error messages
const getAuthErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email';
    case 'auth/operation-not-allowed':
      return 'Operation not allowed';
    case 'auth/weak-password':
      return 'Password is too weak';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'An error occurred during authentication';
  }
};