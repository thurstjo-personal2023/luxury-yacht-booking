# Admin Authentication Tests

This directory contains tests for the admin authentication system, including login, MFA setup/verification, and session management.

## Test Suite Overview

The test suite is divided into several categories:

1. **Unit Tests for Authentication Logic**: Tests for the `useAdminAuth` hook and its functionality.
2. **Integration Tests for Login Flow**: Tests for the complete login → MFA verification → dashboard flow.
3. **Security Tests for Session Management**: Tests for session timeout and refreshing functionality.
4. **MFA Setup and Verification Tests**: Tests for MFA enrollment and verification processes.

## Running the Tests

You can run all admin tests with the following command:

```bash
./run-admin-tests.sh
```

Or run specific test categories:

```bash
npx jest --config=jest.config.js -i tests/use-admin-auth.test.tsx
npx jest --config=jest.config.js -i tests/admin-login-flow.test.tsx
npx jest --config=jest.config.js -i tests/admin-session.test.tsx
npx jest --config=jest.config.js -i tests/admin-mfa.test.tsx
```

## Test Files

- **use-admin-auth.test.tsx**: Unit tests for the authentication hook, covering login, logout, MFA setup/verification, and session refresh.
- **admin-login-flow.test.tsx**: Integration tests for the complete login flow, testing navigation between components.
- **admin-session.test.tsx**: Tests for session management, including timeout and refresh functionality.
- **admin-mfa.test.tsx**: Tests for MFA setup and verification components.
- **admin-registration.test.ts**: Tests for the administrator registration and approval process.

## Test Coverage

These tests cover the following aspects of the admin authentication system:

### Authentication Logic
- Admin sign in validation
- Non-admin user detection and rejection
- Sign out functionality
- Auth state management

### MFA Functionality
- Phone number validation and verification
- OTP (one-time password) verification
- MFA setup and enrollment process
- MFA requirement enforcement

### Session Management
- Session timeout after inactivity
- Session refreshing on user activity
- Secure session termination

### Login Flow
- Login form submission and validation
- Navigation between auth components
- Protected route enforcement
- Error handling and user feedback

## Firebase Emulator Requirements

The tests utilize Firebase emulators for auth and Firestore functionality. Make sure the emulators are running before executing the tests:

```bash
firebase emulators:start
```

## Adding New Tests

When adding new tests, follow these guidelines:

1. Use the appropriate testing utilities from `hook-test-utils.tsx` or `react-test-utils.tsx`
2. Mock external dependencies (Firebase, APIs, etc.)
3. Use `act()` for asynchronous operations
4. Add the new test file to `jest.config.js`

## Configuration

The test configuration is defined in `jest.config.js`, with separate projects for different test categories. Each project has its own environment (node or jsdom) and setup files.

## LSP Warning

Note that you may see some LSP errors in the test files related to imports. These are expected and can be ignored, as the test runtime correctly resolves these imports through the Jest configuration.