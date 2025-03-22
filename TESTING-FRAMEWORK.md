# Etoile Yachts Testing Framework Documentation

This document outlines the comprehensive testing framework implemented for the Etoile Yachts platform, focusing on the modular, layered approach and test suite organization.

## Testing Architecture

Our testing framework follows the Clean Architecture principles, with tests organized according to the same layered approach as the application:

```
tests/
├── unit/                      # Unit tests for isolated components
│   ├── core/                  # Core domain and application layer tests
│   │   ├── domain/            # Domain entity and value object tests
│   │   ├── application/       # Use case and service tests
│   ├── adapters/              # Repository and service adapter tests
│   ├── infrastructure/        # API controllers and route tests
│   ├── client/                # Frontend component and hook tests
├── integration/               # Tests of component integrations
│   ├── cross-module/          # Tests of interaction between modules
│   ├── payment/               # Payment module integration tests
│   ├── booking/               # Booking module integration tests
│   ├── addon/                 # Add-on module integration tests
├── e2e/                       # End-to-end workflow tests
│   ├── payment/               # Payment flow end-to-end tests
│   ├── booking/               # Booking flow end-to-end tests
```

## Test Categories

### Unit Tests

**Purpose**: Verify individual components in isolation  
**Components Tested**:
- Domain entities (Addon, Booking, Payment, etc.)
- Value objects (BookingStatus, PaymentStatus, etc.)
- Use cases (Create/Update/Delete operations)
- Repository implementations
- API controllers
- React components and hooks

### Integration Tests

**Purpose**: Verify interactions between components  
**Tests Include**:
- Repository interactions with Firebase Emulator
- Cross-module interactions (e.g., Booking-Payment flows)
- Service adapter interactions with external services

### End-to-End Tests

**Purpose**: Verify complete business workflows  
**Tests Include**:
- Full payment flows from booking to completion
- Complete booking lifecycle (create, confirm, cancel)
- User journeys through the application

## Testing Tools

- **Jest**: Primary test runner and assertion library
- **Supertest**: HTTP assertion library for API testing
- **Testing Library**: Component testing for React
- **Firebase Emulator Suite**: Local Firebase services for testing
- **Mock Service Worker (MSW)**: API mocking

## Mock Implementation Strategy

We implement mocking at several levels:

1. **Repository Mocks**: For isolated testing of use cases
   - BaseMockRepository - foundation for repository mocks
   - Module-specific mock repositories (MockAddonRepository, MockBookingRepository, etc.)

2. **Service Mocks**: For external service dependencies
   - MockPaymentService - simulates payment provider interactions

3. **Firebase Emulator**: For repository integration tests
   - Provides realistic Firebase behavior without cloud dependencies

4. **API Mocks**: For frontend component testing
   - MSW for intercepting and mocking HTTP requests

## Running Tests

### Unit Tests
```
npm run test:unit
```

### Integration Tests
```
node run-integration-tests.js
```

### End-to-End Tests
```
npm run test:e2e
```

## Test Helper Utilities

1. **BaseUseCaseTest**: Facilitates testing use cases with standardized repository mock setup
2. **EmulatorSetup**: Manages Firebase emulator connections for testing
3. **RepositoryTestHelpers**: Common utilities for testing repositories
4. **React Test Utilities**: Helpers for testing React components and hooks
   - renderWithProviders - Rendering with all required providers
   - renderWithAuth - Authentication-specific rendering

## Test Data Strategy

Tests use realistic but controlled test data that matches production schemas:
- Test entities have predictable IDs (prefixed with 'test-')
- Dates are fixed to avoid time-dependent test failures
- Test data is isolated between test runs

## Continuous Integration

Tests are designed to run in CI environments with:
- Firebase emulators auto-started before test runs
- Sequential execution of test categories
- Cleanup procedures after each test

## Best Practices

1. **Test Independence**: Each test should be able to run independently
2. **Realistic Data**: Use realistic test data that matches production
3. **Comprehensive Coverage**: Test all layers of the application
4. **Clean Teardown**: Clean up resources between tests
5. **Mock External Dependencies**: Never depend on external services in tests
6. **Test Structure**: Follow AAA pattern (Arrange, Act, Assert)
7. **Focused Assertions**: Test one behavior per test case