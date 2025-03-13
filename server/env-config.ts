/**
 * Server Environment Configuration
 * 
 * This file contains environment-specific settings for the server.
 * Edit these values to switch between emulator and production modes.
 */

// Set this to false to use production Firebase services
// Set to true to use local Firebase emulators
export const USE_FIREBASE_EMULATORS = false;

// Firebase project ID for initialization
export const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'etoile-yachts';

// Default emulator hosts (for local development)
export const EMULATOR_HOSTS = {
  firestore: "localhost:8080",
  auth: "localhost:9099",
  storage: "localhost:9199"
};