# TypeScript Testing Configuration Guide

## Problem Description

We encountered issues running TypeScript tests in our mixed ESM/CommonJS environment. The main problems were:

1. Jest configuration files needed to use the `.cjs` extension to support CommonJS module format
2. Test timeouts occurred when trying to load TypeScript modules directly
3. Firebase dependencies caused additional complications

## Solution

### Basic Testing Approach

For basic tests that don't require complex module imports:
1. Use `.cjs` extension for test files
2. Create corresponding Jest configuration files with `.cjs` extension
3. Use `testEnvironment: 'node'` in the Jest configuration
4. Run tests with `npx jest --config jest.*.config.cjs`

### TypeScript Module Testing

For tests involving TypeScript modules:
1. Create CommonJS versions of critical domain models (`*.cjs`)
2. Export the models using `module.exports`
3. Import in tests using `require()`
4. Configure Jest with `verbose: true` and appropriate `testTimeout`

### Example Implementation

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

## Running Tests

Use the provided shell scripts:
- `./run-simple-test.sh` - Run basic tests
- `./run-payment-tests.sh` - Run payment domain tests

## Known Limitations

1. This approach requires maintaining dual versions of critical domain models
2. TypeScript type checking is not available in the CommonJS versions
3. Tests requiring Firebase emulators still need additional configuration

## Future Improvements

1. Implement automatic conversion of TypeScript modules to CommonJS format
2. Create a unified testing framework that handles both ESM and CommonJS modules
3. Add CI/CD integration with proper test environment setup