# Administrator Test Configuration Guide

## Overview
This guide outlines the steps needed to configure the testing environment for the Administrator Registration Test Suite. 

## Current Setup Issues
The test suite currently faces the following configuration issues:

1. **Module Import Syntax**: The `setup-emulator.ts` file uses ES module import syntax, but Jest is not properly configured to handle this.
2. **Test Project Configuration**: The test is included in the 'emulator' project in Jest, but it might need a separate project configuration.
3. **Module Resolution**: There may be issues with path aliases and module resolution.

## Resolution Steps

### 1. Configure Jest for ESM Support
There are two approaches to resolve the module import issue:

#### Option A: Convert Import/Export Statements to CommonJS
Update `tests/setup-emulator.ts` to use CommonJS module syntax:
```typescript
// From:
import { initializeTestEnvironment, checkEmulators, EmulatorInstance } from './emulator-setup';

// To:
const { initializeTestEnvironment, checkEmulators, EmulatorInstance } = require('./emulator-setup');
```

Also update `emulator-setup.ts` to use CommonJS exports:
```typescript
// From:
export function initializeTestEnvironment(config: EmulatorConfig): EmulatorInstance {
  // ...
}

// To:
function initializeTestEnvironment(config: EmulatorConfig): EmulatorInstance {
  // ...
}

module.exports = {
  initializeTestEnvironment,
  checkEmulators,
  EmulatorInstance,
  // ...other exports
};
```

#### Option B: Enable ESM Support in Jest
Update the Jest configuration to support ESM:

1. Add the following to package.json:
```json
{
  "jest": {
    "extensionsToTreatAsEsm": [".ts", ".tsx"],
    "globals": {
      "ts-jest": {
        "useESM": true
      }
    },
    "moduleNameMapper": {
      "^(\\.{1,2}/.*)\\.js$": "$1"
    }
  }
}
```

2. Add "type": "module" to package.json (note this might affect other parts of the app).

### 2. Create a Dedicated Test Project
Update `jest.config.ts` to include a dedicated project for admin tests:

```typescript
// Add or modify the existing admin project:
{
  displayName: 'admin',
  testMatch: [
    '<rootDir>/tests/admin-registration.test.ts'
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup-admin.ts'], // New setup file
}
```

Then create a new setup file specifically for admin tests:

```typescript
// tests/setup-admin.ts
import * as firebase from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Initialize Firebase for tests
beforeAll(async () => {
  // Initialize Firebase with test config
  const app = firebase.initializeApp({
    apiKey: 'fake-api-key',
    authDomain: 'localhost',
    projectId: 'etoile-yachts',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });
  
  // Connect to emulators
  const auth = getAuth(app);
  const db = getFirestore(app);
  
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  
  // Add to global scope for test access
  global.testApp = app;
  global.testAuth = auth;
  global.testFirestore = db;
});

// Clean up after all tests
afterAll(async () => {
  try {
    // Clean up test environment
    await global.testApp?.delete();
  } catch (error) {
    console.error('Error cleaning up Firebase test environment:', error);
  }
});
```

### 3. Modify the Test File
Update the test file to use the global test objects:

```typescript
// In tests/admin-registration.test.ts
describe('Administrator Registration & Validation', () => {
  // Use global test objects instead of creating new ones
  let app: firebase.FirebaseApp;
  let auth: Auth;
  let db: Firestore;
  let expressApp: Express;
  
  beforeAll(() => {
    app = global.testApp;
    auth = global.testAuth;
    db = global.testFirestore;
    
    // Setup Express app and routes...
  });
});
```

### 4. Run Individual Tests
While debugging, run specific test files with options to bypass the current configuration:

```bash
npx jest tests/admin-registration.test.ts --no-cache --detectOpenHandles --testTimeout=60000
```

## Firebase Emulator Requirements
Ensure Firebase emulators are running before executing tests:

```bash
firebase emulators:start
```

The tests require the following emulators:
- Auth: Port 9099
- Firestore: Port 8080

## Testing Approach
Until the environment setup issues are resolved, consider the following approach:

1. Document test cases in detail (`ADMIN-REGISTRATION-TESTS.md`)
2. Create simplified test file as a reference (`admin-registration.test.simplified.ts`)
3. Implement the actual test logic piece by piece as the environment is configured

## Next Steps

1. Choose either Option A or Option B for the module import resolution
2. Create a dedicated setup file for admin tests
3. Update the test file to use the appropriate setup
4. Run individual tests to verify configuration
5. Gradually add more test cases as outlined in the test plan document