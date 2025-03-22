/**
 * API Integration
 * 
 * This module provides functions to integrate the clean architecture API
 * with the existing Express application.
 */

import { Express } from 'express';
import { getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

import { registerApiRoutes } from './register-routes';
import { USE_FIREBASE_EMULATORS, FIREBASE_PROJECT_ID, EMULATOR_HOSTS } from '../../server/env-config';

/**
 * Initialize Firebase instance for API integration
 */
export function initializeFirebase() {
  // Initialize Firebase with the configuration from environment variables
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
  };
  
  // Initialize Firebase app
  const app = initializeApp(firebaseConfig, 'api-integration');
  
  // Get Firestore instance
  const firestore = getFirestore(app);
  
  // Connect to emulators if configured
  if (USE_FIREBASE_EMULATORS) {
    console.log('Using Firebase emulators for API integration');
    
    // Connect to Firestore emulator
    const { connectFirestoreEmulator } = require('firebase/firestore');
    connectFirestoreEmulator(
      firestore,
      EMULATOR_HOSTS.firestore || 'localhost',
      EMULATOR_HOSTS.firestorePort || 8080
    );
  }
  
  return { app, firestore };
}

/**
 * Integrate clean architecture API with Express app
 */
export function integrateCleanArchitectureApi(expressApp: Express) {
  // Initialize Firebase
  const { firestore } = initializeFirebase();
  
  // Register API routes with Express app
  registerApiRoutes(expressApp, firestore);
  
  console.log('Clean Architecture API integrated with Express app');
  
  return { firestore };
}