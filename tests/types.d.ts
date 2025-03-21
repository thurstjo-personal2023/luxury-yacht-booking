/**
 * TypeScript declarations for test environment
 */

import { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseApp } from 'firebase/app';

// Custom Firebase test environment interface for admin tests
interface AdminTestEnv {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  cleanup: () => Promise<void>;
}

// Global declarations for Firebase test environment
declare global {
  // For Node.js environment
  var __FIREBASE_TEST_ENV__: RulesTestEnvironment | AdminTestEnv;
  
  // For TypeScript in general
  namespace NodeJS {
    interface Global {
      __FIREBASE_TEST_ENV__: RulesTestEnvironment | AdminTestEnv;
    }
  }
}