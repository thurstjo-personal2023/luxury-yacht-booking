# Etoile Yachts Testing Documentation

This document provides a comprehensive overview of the testing infrastructure for the Etoile Yachts platform.

## Testing Architecture

The testing architecture follows a comprehensive multi-level approach:

1. **Unit Tests**: Focused on individual components and functions
2. **Integration Tests**: Verify interactions between components
3. **API Tests**: Ensure backend endpoints work correctly
4. **E2E Tests**: End-to-end user journey tests

## Test Types and Technologies

### Unit and Integration Tests (Jest)

- **Test Runner**: Jest
- **File Pattern**: `tests/**/*.test.{ts,tsx}`
- **Coverage Reporting**: Enabled via Jest's coverage reporter

These tests focus on the following areas:
- URL validation and media validation services
- Firebase Firestore operations
- Authentication flows
- Security rules verification
- Stripe payment integration

### End-to-End Tests (Cypress)

- **Test Runner**: Cypress
- **File Pattern**: `cypress/e2e/**/*.cy.{ts,tsx}`
- **Configuration**: `cypress.config.ts`

Our E2E tests cover complete user journeys:
- Authentication flows (register, login, password reset)
- Yacht browsing and booking workflows
- Producer management features
- Partner add-on integration

## Running Tests

### Unit and Integration Tests

```bash
# Run all unit and integration tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/url-validator.test.ts
```

### End-to-End Tests

```bash
# Open Cypress Test Runner
npm run cypress:open

# Run all E2E tests headlessly
npm run cypress:run

# Run specific E2E test
npm run cypress:run -- --spec "cypress/e2e/authentication.cy.ts"
```

## Test Fixtures

Test fixtures are located in:
- `tests/__fixtures__/`: For Jest tests
- `cypress/fixtures/`: For Cypress tests

## Test Structure and Best Practices

### Core Testing Principles

1. **Isolation**: Tests should be independent and not rely on other tests
2. **Mocking**: External services should be mocked for deterministic results
3. **Coverage**: Aim for high coverage of critical functionality
4. **Documentation**: Tests should be well-documented for maintainability

### Jest Test Structure

```typescript
describe('Module or Component', () => {
  // Setup before tests
  beforeEach(() => {
    // Setup code
  });
  
  // Cleanup after tests
  afterEach(() => {
    // Cleanup code
  });
  
  // Individual test case
  it('should perform expected behavior', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Cypress Test Structure

```typescript
describe('User Journey', () => {
  beforeEach(() => {
    // Reset application state
    cy.clearCookies();
    cy.clearLocalStorage();
  });
  
  it('should complete an expected workflow', () => {
    // Visit page
    // Interact with elements
    // Verify results
  });
});
```

## Firebase Emulator Testing

For Firebase-related tests, we use the Firebase Emulator Suite:

1. Start the emulators:
```bash
firebase emulators:start
```

2. Run tests against the emulators:
```bash
npm run test:emulator
```

## Media Validation Testing

The media validation system has specialized tests:

1. URL Validator tests
2. Media Validation Service tests
3. Worker process tests
4. Admin Interface component tests

## Continuous Integration

Our CI pipeline includes:
- Running all Jest tests
- Executing Cypress E2E tests
- Generating coverage reports
- Validating Firebase security rules

## Key Test Files and Modules

### Unit and Integration Tests

- `tests/url-validator.test.ts`: Tests for URL validation functionality
- `tests/media-validation.test.ts`: Tests for media validation service
- `tests/worker.test.ts`: Tests for background worker processes
- `tests/auth.test.ts`: Authentication service tests
- `tests/firestore.test.ts`: Firestore operations tests
- `tests/security-rules.test.ts`: Firebase security rules tests
- `tests/stripe-payment.test.ts`: Stripe payment integration tests
- `tests/admin-routes.test.ts`: Admin API routes tests

### E2E Tests

- `cypress/e2e/authentication.cy.ts`: User authentication workflows
- `cypress/e2e/booking-flow.cy.ts`: Yacht browsing and booking processes
- `cypress/e2e/producer-journey.cy.ts`: Producer management features

## Custom Test Utilities

Several test utilities are provided to simplify testing:

- `tests/test-utils.ts`: Common test utilities
- `tests/react-test-utils.tsx`: React component testing utilities
- `tests/hook-test-utils.tsx`: React hook testing utilities
- `cypress/support/commands.ts`: Custom Cypress commands

## Adding New Tests

When adding new tests, follow these guidelines:

1. **Unit Tests**: Add to `tests/` directory with `.test.ts` extension
2. **E2E Tests**: Add to `cypress/e2e/` directory with `.cy.ts` extension
3. **Test Fixtures**: Add to appropriate fixtures directory
4. **Run Locally**: Verify tests pass locally before committing

## Troubleshooting Tests

Common issues and their solutions:

1. **Firebase Emulator Connection Issues**:
   - Ensure emulators are running
   - Check ports are not in use by other applications

2. **Authentication Test Failures**:
   - Reset Firebase emulator authentication state
   - Check test user credentials

3. **Cypress Timeout Issues**:
   - Increase timeout in `cypress.config.ts`
   - Use explicit waits for elements that take time to appear

4. **Jest Mock Failures**:
   - Verify mock functions are properly reset between tests
   - Check mock implementation matches actual behavior