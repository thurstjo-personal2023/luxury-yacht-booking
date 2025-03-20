/**
 * Cypress e2e Support File
 * 
 * This file is loaded automatically before your test files run.
 * This is a great place to put global configuration and behavior that
 * modifies Cypress.
 */

// Import commands.js using ES2015 syntax:
import './commands';

// Firebase configuration for tests
const firebaseConfig = {
  apiKey: Cypress.env('FIREBASE_API_KEY') || 'test-api-key',
  authDomain: Cypress.env('FIREBASE_AUTH_DOMAIN') || 'example.firebaseapp.com',
  projectId: Cypress.env('FIREBASE_PROJECT_ID') || 'etoile-yachts',
  storageBucket: Cypress.env('FIREBASE_STORAGE_BUCKET') || 'example.appspot.com',
  messagingSenderId: Cypress.env('FIREBASE_MESSAGING_SENDER_ID') || '123456789',
  appId: Cypress.env('FIREBASE_APP_ID') || '1:123456789:web:abcdef123456789',
};

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false prevents Cypress from failing the test
  return false;
});

// Log Cypress session info
Cypress.on('session:created', (session) => {
  console.log('A new session was created', session);
});

// Add custom assertions
// Use contains instead of toBe or toContain to check inclusion
// Use eq instead of toBe for equality checks
// Use exist instead of toBeDefined

// Cypress already has built-in assertions that are different from Jest
// The TypeScript warnings can be ignored for the e2e tests