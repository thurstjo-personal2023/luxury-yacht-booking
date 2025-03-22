# TypeScript Testing Configuration Guide

## Problem Description

We encountered issues running TypeScript tests in our mixed ESM/CommonJS environment. The main problems were:

1. Jest configuration files needed to use the `.cjs` extension to support CommonJS module format
2. Test timeouts occurred when trying to load TypeScript modules directly
3. Firebase dependencies caused additional complications

## Solution

Our testing approach has two main strategies:

1. **Domain Model Testing**: Using CommonJS for isolated testing of domain models
2. **Integration Testing**: Using Firebase Emulators for testing integrations

### Domain Model Testing

For basic tests that don't require Firebase dependencies:
1. Use `.cjs` extension for test files
2. Create corresponding Jest configuration files with `.cjs` extension
3. Use `testEnvironment: 'node'` in the Jest configuration
4. Run tests with `npx jest --config jest.*.config.cjs`

### Integration Testing with Firebase Emulators

For tests that require Firebase services:
1. Set up Firebase Emulators
2. Configure authentication with service account credentials
3. Set environment variables for emulator connections
4. Run the tests with proper timeout configurations

## Implementation Examples

### Domain Model Testing

**Domain Model (CommonJS version):**
```javascript
// core/domain/payment/payment-status.cjs
const PaymentStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  // ... other values
  
  fromStripeStatus: function(stripeStatus) {
    // Implementation
  }
};

function isValidPaymentStatus(status) {
  // Implementation
}

module.exports = {
  PaymentStatus,
  isValidPaymentStatus
};
```

**Test File:**
```javascript
// tests/payment-status-test.cjs
const { PaymentStatus, isValidPaymentStatus } = require('../core/domain/payment/payment-status.cjs');

describe('PaymentStatus', () => {
  // Test cases
});
```

**Jest Configuration:**
```javascript
// jest.payment-tests.config.cjs
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/payment-status-test.cjs'
  ],
  verbose: true,
  testTimeout: 10000
};
```

### Firebase Emulator Testing

**Environment Setup:**
```bash
# Set up environment for testing
export NODE_ENV=test
export FIRESTORE_EMULATOR_HOST="localhost:8080"
export FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"
export FIREBASE_STORAGE_EMULATOR_HOST="localhost:9199"

# Set the Google Application Credentials for authentication
export GOOGLE_APPLICATION_CREDENTIALS="./etoile-yachts-9322f3c69d91.json"
```

**Jest Configuration:**
```javascript
// jest.integration.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { /* options */ }]
  },
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup-integration.ts'
  ],
  testTimeout: 30000
};
```

## Running Tests

Use the provided shell scripts:
- `./run-all-tests.sh` - Run all domain model tests
- `./run-emulator-tests.sh` - Run tests requiring Firebase emulators

## Automated Testing Tools

We've created a tool to automatically convert TypeScript domain models to CommonJS for testing:

```bash
node create-test-modules.js core/domain/your-model.ts tests/unit/core/domain/your-folder
```

This will:
- Create a CommonJS version of your domain model
- Generate a basic test file
- Update the Jest configuration

## Known Limitations

1. This approach requires maintaining dual versions of critical domain models
2. TypeScript type checking is not available in the CommonJS versions
3. Integration tests require the Firebase Emulator Suite to be running

## Best Practices

1. Use the CommonJS approach for testing pure domain logic
2. Use the Firebase Emulator approach for testing integrations
3. Keep the CommonJS versions in sync with TypeScript using the automation tool
4. Run domain tests frequently (they're fast), and integration tests less frequently