import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore, 
  connectFirestoreEmulator
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

// Initialize Firestore
export const db = getFirestore(app);

// Initialize other services
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const rtdb = getDatabase(app);

// Initialize auth state listener to manage tokens
console.log('Setting up auth state listener for Firebase...');

auth.onAuthStateChanged(async (user) => {
  console.log('Firebase Auth state changed:', user ? `User ${user.uid} signed in` : 'User signed out');
  
  if (user) {
    try {
      console.log('Auth state change: User authenticated', {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        provider: user.providerId
      });
      
      // Get fresh token when auth state changes
      console.log('Requesting fresh token on auth state change...');
      const token = await user.getIdToken(true);
      
      if (token) {
        localStorage.setItem('authToken', token);
        const tokenPreview = token.length > 10 ? 
          `${token.substring(0, 10)}...${token.substring(token.length - 5)}` : 
          '[invalid token]';
        console.log(`Auth token refreshed and stored in localStorage: ${tokenPreview}`);
        
        // Force a reload of the user in auth state to ensure all claims are loaded
        try {
          console.log('Refreshing user claims...');
          await user.getIdTokenResult(true);
          console.log('User claims refreshed successfully');
        } catch (claimsError) {
          console.error('Error refreshing user claims:', claimsError);
        }
        
        // Set up a token refresh interval (every 10 minutes)
        // Shorter interval for testing purposes
        const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
        console.log(`Setting up token refresh interval: ${TOKEN_REFRESH_INTERVAL/1000/60} minutes`);
        
        const tokenRefreshInterval = setInterval(async () => {
          try {
            if (auth.currentUser) {
              console.log('Performing scheduled token refresh...');
              const refreshedToken = await auth.currentUser.getIdToken(true);
              localStorage.setItem('authToken', refreshedToken);
              console.log('Auth token refreshed on schedule');
            } else {
              // Clear interval if user is no longer signed in
              console.log('User no longer authenticated, clearing token refresh interval');
              clearInterval(tokenRefreshInterval);
            }
          } catch (refreshError) {
            console.error('Error during periodic token refresh:', refreshError);
          }
        }, TOKEN_REFRESH_INTERVAL);
        
        // Store the interval ID so it can be cleared on logout
        // @ts-ignore - Adding custom property to window
        window.__tokenRefreshInterval = tokenRefreshInterval;
        console.log('Token refresh interval set up and stored');
      } else {
        console.error('Failed to obtain token after auth state change');
      }
    } catch (error) {
      console.error('Error refreshing auth token on auth state change:', error);
    }
  } else {
    // User is signed out
    console.log('Auth state change: User signed out');
    
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

// Function to connect to emulators with specified hosts
const connectToEmulators = (hosts: { 
  firestore: string, 
  auth: string, 
  storage: string, 
  functions: string, 
  rtdb: string 
}) => {
  try {
    // Parse host and port from each setting
    const parseHostPort = (hostString: string) => {
      const [host, portStr] = hostString.split(':');
      return { host, port: parseInt(portStr, 10) };
    };
    
    const firestore = parseHostPort(hosts.firestore);
    const authEmulator = parseHostPort(hosts.auth);
    const storageEmulator = parseHostPort(hosts.storage);
    const functionsEmulator = parseHostPort(hosts.functions);
    const rtdbEmulator = parseHostPort(hosts.rtdb);

    // Connect to each emulator
    // Auth Emulator
    connectAuthEmulator(auth, `http://${authEmulator.host}:${authEmulator.port}`, { disableWarnings: true });
    console.log(`✓ Auth emulator connected at: http://${authEmulator.host}:${authEmulator.port}`);

    // Firestore Emulator
    connectFirestoreEmulator(db, firestore.host, firestore.port);
    console.log(`✓ Firestore emulator connected at: http://${firestore.host}:${firestore.port}`);

    // Storage Emulator
    connectStorageEmulator(storage, storageEmulator.host, storageEmulator.port);
    console.log(`✓ Storage emulator connected at: http://${storageEmulator.host}:${storageEmulator.port}`);

    // Functions Emulator
    connectFunctionsEmulator(functions, functionsEmulator.host, functionsEmulator.port);
    console.log(`✓ Functions emulator connected at: http://${functionsEmulator.host}:${functionsEmulator.port}`);

    // Realtime Database Emulator
    connectDatabaseEmulator(rtdb, rtdbEmulator.host, rtdbEmulator.port);
    console.log(`✓ Realtime Database emulator connected at: http://${rtdbEmulator.host}:${rtdbEmulator.port}`);

    console.log("All Firebase emulators connected successfully!");
    return true;
  } catch (error) {
    console.error("Error connecting to emulators:", error);
    return false;
  }
};

// Default localhost settings
const defaultHosts = {
  firestore: "localhost:8080",
  auth: "localhost:9099",
  storage: "localhost:9199",
  functions: "localhost:5001",
  rtdb: "localhost:9001"
};

// Try to get emulator config from server API
const getEmulatorConfig = async () => {
  try {
    console.log("Fetching emulator configuration from server...");
    const response = await fetch('/api/emulator-config');
    if (response.ok) {
      const config = await response.json();
      console.log("Retrieved emulator configuration:", config);
      return config.hosts;
    } else {
      console.warn("Failed to get emulator config from server, status:", response.status);
      return null;
    }
  } catch (error) {
    console.error("Error fetching emulator config:", error);
    return null;
  }
};

// First try to connect with host from URL parameter
const localhostRunParam = new URLSearchParams(window.location.search).get('emulatorHost');
if (localhostRunParam) {
  console.log(`Using emulator host from URL param: ${localhostRunParam}`);
  const hosts = {
    firestore: `${localhostRunParam}:8080`,
    auth: `${localhostRunParam}:9099`,
    storage: `${localhostRunParam}:9199`,
    functions: `${localhostRunParam}:5001`,
    rtdb: `${localhostRunParam}:9001`
  };
  
  connectToEmulators(hosts);
} else {
  // Otherwise try to get config from server, then fall back to localhost
  getEmulatorConfig().then(hosts => {
    if (hosts) {
      connectToEmulators(hosts);
    } else {
      console.log("Falling back to default localhost emulator config");
      connectToEmulators(defaultHosts);
    }
  }).catch(error => {
    console.error("Error in emulator configuration:", error);
    console.log("Falling back to default localhost emulator config");
    connectToEmulators(defaultHosts);
  });
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
    console.log(`Attempting to login user with email: ${email} using Firebase emulator...`);
    
    // Set persistence to LOCAL to ensure the session is maintained across page reloads
    // This is especially important for testing with the emulator
    try {
      // Import the persistence type
      const { browserLocalPersistence, setPersistence } = await import('firebase/auth');
      
      // Set persistence before login
      await setPersistence(auth, browserLocalPersistence);
      console.log("Firebase auth persistence set to LOCAL");
    } catch (persistenceError) {
      console.warn("Failed to set persistence:", persistenceError);
    }
    
    // Login with retry logic
    const userCredential = await retry(() => signInWithEmailAndPassword(auth, email, password));
    
    console.log("Login successful, user:", userCredential.user.uid);
    console.log("Email verified:", userCredential.user.emailVerified);
    console.log("Auth provider:", userCredential.user.providerId);
    
    // Get auth token and store in localStorage for API requests
    // Force a refresh of the token to ensure it has all required claims
    console.log("Requesting fresh token with force refresh...");
    const token = await userCredential.user.getIdToken(true);
    
    if (token) {
      localStorage.setItem('authToken', token);
      console.log("Fresh token stored in localStorage, token preview:", 
        `${token.substring(0, 10)}...${token.substring(token.length - 5)}`);
      
      // Add a custom refresh check to verify token is working immediately after login
      setTimeout(async () => {
        if (auth.currentUser) {
          console.log("Performing post-login token check...");
          const refreshedToken = await auth.currentUser.getIdToken(true);
          console.log("Post-login token refresh successful:", !!refreshedToken);
        }
      }, 1000);
    } else {
      console.error("Failed to get token after login");
    }
    
    return userCredential;
  } catch (error: any) {
    console.error("Login error:", error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const registerWithEmail = async (email: string, password: string) => {
  try {
    console.log(`Attempting to register user with email: ${email} using Firebase emulator...`);
    
    // Set persistence to LOCAL to ensure the session is maintained across page reloads
    // This is especially important for testing with the emulator
    try {
      // Import the persistence type
      const { browserLocalPersistence, setPersistence } = await import('firebase/auth');
      
      // Set persistence before registration
      await setPersistence(auth, browserLocalPersistence);
      console.log("Firebase auth persistence set to LOCAL for registration");
    } catch (persistenceError) {
      console.warn("Failed to set persistence for registration:", persistenceError);
    }
    
    // Registration with retry logic
    const userCredential = await retry(() => createUserWithEmailAndPassword(auth, email, password));
    
    console.log("Registration successful, user:", userCredential.user.uid);
    console.log("Email verified:", userCredential.user.emailVerified);
    console.log("Auth provider:", userCredential.user.providerId);
    
    // Get auth token and store in localStorage for API requests
    // Force a refresh of the token to ensure it has all required claims
    console.log("Requesting fresh token after registration with force refresh...");
    const token = await userCredential.user.getIdToken(true);
    
    if (token) {
      localStorage.setItem('authToken', token);
      console.log("Fresh token stored in localStorage, token preview:", 
        `${token.substring(0, 10)}...${token.substring(token.length - 5)}`);
      
      // Add a custom refresh check to verify token is working immediately after registration
      setTimeout(async () => {
        if (auth.currentUser) {
          console.log("Performing post-registration token check...");
          const refreshedToken = await auth.currentUser.getIdToken(true);
          console.log("Post-registration token refresh successful:", !!refreshedToken);
        }
      }, 1000);
    } else {
      console.error("Failed to get token after registration");
    }
    
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
export const getCurrentToken = async (): Promise<string | null> => {
  console.log('getCurrentToken called, checking auth state...');
  
  // Get token directly from Firebase Auth current user
  if (auth.currentUser) {
    console.log('Firebase auth.currentUser exists:', auth.currentUser.uid);
    try {
      // Force a refresh to ensure we get a valid token with all required claims
      console.log('Requesting fresh ID token with force refresh...');
      const token = await auth.currentUser.getIdToken(true);
      
      // Verify token looks valid (check basic structure)
      if (token && typeof token === 'string' && token.split('.').length === 3) {
        console.log('Retrieved valid ID token (JWT format confirmed)');
        // Store for convenience but always get fresh one when needed
        localStorage.setItem('authToken', token);
        return token;
      } else {
        console.error('Retrieved token is not in valid JWT format');
        return null;
      }
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  } else {
    console.log('No current user in auth - cannot get fresh token');
    
    // Try to get token from localStorage as fallback
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      console.log('Found token in localStorage, verifying format...');
      
      // Basic verification that it's a JWT token (3 parts separated by dots)
      if (storedToken.split('.').length === 3) {
        console.log('Using stored token from localStorage (JWT format confirmed)');
        return storedToken;
      } else {
        console.warn('Stored token is not in valid JWT format, removing it');
        localStorage.removeItem('authToken');
      }
    } else {
      console.log('No token found in localStorage');
    }
    
    return null;
  }
};

// Check if user is authenticated by verifying auth.currentUser exists
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser || !!localStorage.getItem('authToken');
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