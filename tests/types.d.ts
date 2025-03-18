/**
 * TypeScript declarations for test environment
 */

import { RulesTestEnvironment } from '@firebase/rules-unit-testing';

declare global {
  // Add the Firebase test environment to global namespace
  var __FIREBASE_TEST_ENV__: RulesTestEnvironment;
  
  // Add any other global types needed for testing
  namespace NodeJS {
    interface Global {
      __FIREBASE_TEST_ENV__: RulesTestEnvironment;
    }
  }
}