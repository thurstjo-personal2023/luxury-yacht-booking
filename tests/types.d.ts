/**
 * TypeScript declarations for test environment
 */

import { RulesTestEnvironment } from '@firebase/rules-unit-testing';

// Global declarations for Firebase test environment
declare global {
  // For Node.js environment
  var __FIREBASE_TEST_ENV__: RulesTestEnvironment;
  
  // For TypeScript in general
  namespace NodeJS {
    interface Global {
      __FIREBASE_TEST_ENV__: RulesTestEnvironment;
    }
  }
}