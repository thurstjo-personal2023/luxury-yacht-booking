# Etoile Yachts Testing Framework

This document outlines the testing framework for the Etoile Yachts platform. It provides guidelines, best practices, and examples for writing tests.

## Table of Contents

1. [Overview](#overview)
2. [Testing Levels](#testing-levels)
3. [Testing Tools](#testing-tools)
4. [Directory Structure](#directory-structure)
5. [Writing Tests](#writing-tests)
6. [Running Tests](#running-tests)
7. [Mock Data and Test Utilities](#mock-data-and-test-utilities)
8. [Best Practices](#best-practices)

## Overview

The testing framework is designed to ensure the quality, reliability, and performance of the Etoile Yachts platform. It follows a layered approach with unit, integration, and end-to-end tests to provide comprehensive test coverage.

### Key Principles

1. **Test Pyramids**: Follow the test pyramid approach with more unit tests than integration tests, and more integration tests than end-to-end tests.
2. **Isolation**: Tests should be isolated and not depend on external services or each other.
3. **Determinism**: Tests should produce the same results regardless of when or where they are run.
4. **Clean Setup/Teardown**: Each test should clean up after itself to avoid affecting other tests.
5. **Clean Architecture**: Tests should follow the same architectural principles as the application code.

## Testing Levels

### Unit Tests

Unit tests verify that individual units of code work as expected in isolation. They are fast, focused, and highly reliable.

- **Target**: Individual functions, classes, and modules
- **Directory**: `tests/unit`
- **Tools**: Jest, Mock repositories

### Integration Tests

Integration tests verify that multiple units work correctly together. They test the interfaces between components and modules.

- **Target**: Interactions between components, repositories, and services
- **Directory**: `tests/integration`
- **Tools**: Jest, Firebase Emulators

### End-to-End Tests

End-to-End tests verify that the entire application works correctly from a user's perspective. They simulate real user interactions.

- **Target**: Complete user flows and scenarios
- **Directory**: `tests/e2e`
- **Tools**: Jest, Firebase Emulators, Mock Express app

### Cross-Module Integration Tests

Cross-module integration tests verify that modules can work together correctly. They test the interactions between different modules of the application.

- **Target**: Interactions between modules (e.g., booking and payment)
- **Directory**: `tests/integration/cross-module`
- **Tools**: Jest, Mock repositories

## Testing Tools

### Jest

Jest is our primary testing framework. It's used for all levels of testing.

### Firebase Emulators

Firebase Emulators provide local versions of Firebase services for testing. This includes Firestore, Authentication, Storage, and Functions.

### Mock Express App

For testing API endpoints, we use a mock Express app that simulates HTTP requests and responses.

### Mock Repositories

We use mock repositories to isolate units of code from their dependencies during testing.

## Directory Structure

```
tests/
├── common/              # Common test utilities and types
├── setup/               # Test setup helpers
├── unit/                # Unit tests
│   ├── core/            # Core domain tests
│   │   ├── domain/      # Domain entities and value objects
│   │   ├── application/ # Use cases and services
│   │   └── ...
│   ├── infrastructure/  # Infrastructure layer tests
│   └── ...
├── integration/         # Integration tests
│   ├── booking/         # Booking module integration tests
│   ├── payment/         # Payment module integration tests
│   ├── cross-module/    # Cross-module integration tests
│   └── ...
├── e2e/                 # End-to-end tests
│   ├── booking/         # Booking flow e2e tests
│   ├── payment/         # Payment flow e2e tests
│   └── ...
├── emulator-setup.ts    # Firebase emulator setup
└── ...
```

## Writing Tests

### Unit Tests

Unit tests should test a single unit of code in isolation. They should not depend on external services or other parts of the application.

```typescript
// Example unit test for a domain entity
describe('Booking', () => {
  it('should calculate total amount based on yacht price and duration', () => {
    const booking = new Booking({
      yachtId: 'yacht-1',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-01-03'),
      yachtPrice: 1000
    });
    
    expect(booking.getTotalAmount()).toBe(2000); // 2 days * 1000 per day
  });
});
```

### Integration Tests

Integration tests verify that multiple units work correctly together. They often use mock repositories and services.

```typescript
// Example integration test for a use case with repositories
describe('CreateBookingUseCase Integration', () => {
  it('should create a booking when yacht is available', async () => {
    // Setup
    const { bookingRepository, yachtRepository } = createTestEnvironment();
    const useCase = new CreateBookingUseCase(bookingRepository, yachtRepository);
    
    // Execute
    const result = await useCase.execute({
      userId: 'user-1',
      yachtId: 'yacht-1',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-01-03')
    });
    
    // Verify
    expect(result.success).toBe(true);
    expect(result.booking).toBeDefined();
    expect(result.booking?.yachtId).toBe('yacht-1');
  });
});
```

### End-to-End Tests

End-to-end tests verify complete user flows. They simulate real user interactions with the system.

```typescript
// Example e2e test for booking flow
describe('Booking Flow (E2E)', () => {
  it('should create and confirm a booking', async () => {
    // Search for a yacht
    const searchResponse = await app.executeRequest('get', '/api/yachts/search', {
      location: 'Test Marina',
      startDate: '2023-01-01',
      endDate: '2023-01-03'
    });
    
    // Create a booking
    const createBookingResponse = await app.executeRequest('post', '/api/bookings', {
      yachtId: searchResponse.body.yachts[0].id,
      startDate: '2023-01-01',
      endDate: '2023-01-03'
    });
    
    // Verify booking creation
    expect(createBookingResponse.status).toBe(200);
    expect(createBookingResponse.body.booking).toBeDefined();
  });
});
```

## Running Tests

You can run tests using the following commands:

```bash
# Run all tests
./run-tests.sh --all

# Run unit tests only
./run-tests.sh --unit

# Run integration tests only
./run-tests.sh --integration

# Run end-to-end tests only
./run-tests.sh --e2e
```

For integration and end-to-end tests, make sure Firebase emulators are running:

```bash
firebase emulators:start
```

## Mock Data and Test Utilities

We provide various utilities to help with testing:

### Test Environment

```typescript
// Create a test environment with mock repositories
const env = createTestEnvironment();
const { bookingRepository, yachtRepository, paymentRepository } = env;
```

### Test Factories

```typescript
// Create a test booking
const booking = createTestBooking({
  userId: 'user-1',
  yachtId: 'yacht-1'
});

// Create a test yacht
const yacht = createTestYacht({
  name: 'Test Yacht',
  pricePerDay: 1000
});
```

### Mock Repositories

```typescript
// Create mock repositories with initial data
const bookingRepository = new MockBookingRepository([booking1, booking2]);
const yachtRepository = new MockYachtRepository([yacht1, yacht2]);
```

## Best Practices

1. **Keep Tests Simple**: Tests should be easy to understand and maintain.
2. **Test Only One Thing**: Each test should verify a single behavior or scenario.
3. **Use Descriptive Names**: Test names should describe what they're testing and the expected outcome.
4. **Don't Test Implementation Details**: Test behavior, not implementation details.
5. **Avoid Test Duplication**: Don't repeat the same tests at different levels.
6. **Use Test Data Factories**: Create test data using factories to avoid duplication.
7. **Clean Up After Tests**: Each test should clean up any resources it creates.
8. **Use Mocks Sparingly**: Prefer real implementations when possible, use mocks only when necessary.
9. **Test Error Cases**: Don't just test the happy path, also test error cases and edge cases.
10. **Keep Tests Fast**: Tests should run quickly to provide fast feedback.