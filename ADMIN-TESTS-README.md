# Administrator Registration & MFA Tests

This document describes the test suite for Administrator Registration and Multi-Factor Authentication functionality.

## Overview

The test suite covers the following areas:

1. **Administrator Registration & Validation** - Tests for user registration, email/phone verification, and approval processes
2. **Multi-Factor Authentication (MFA)** - Tests for MFA setup, verification, and enforcement

## Test Files

The test suite includes both unit tests and end-to-end tests:

### Unit Tests
- `tests/unit/admin-registration-validation.test.ts` - Tests for admin registration and validation functions
- `tests/unit/admin-mfa.test.ts` - Tests for MFA functionality using Firebase Auth

### End-to-End Tests
- `cypress/e2e/admin-registration.cy.ts` - Tests admin registration workflow through the UI

## Running Tests

### Prerequisites
- Firebase emulators must be running (`firebase emulators:start`)
- For E2E tests, Cypress must be installed

### Running Admin Tests

To run the admin tests, use the provided script:

```bash
./run-admin-tests.sh
```

This script performs the following:
1. Checks if Firebase emulators are running
2. Runs the unit tests for admin registration and MFA
3. If Cypress is installed, runs the E2E tests for admin registration

## Test Cases

The test cases are based on the requirements in "Test Suite - Epics for the Administration Role" document. The key test scenarios include:

### Registration & Validation Tests
- ARV-001: Super Admin can send an invite to an email address
- ARV-002: Admin cannot register without an invite link
- ARV-003: Admin registration requires email & phone OTP verification
- ARV-004: Admin remains inactive until manually approved
- ARV-005: Super Admin can approve new Admins
- ARV-006: Expired invite token is rejected
- ARV-007: Incorrect OTP blocks after 3 failed attempts
- ARV-008: Password too weak is rejected
- ARV-009: MFA setup is required before accessing admin features
- ARV-010: Invitations can only be used once

### MFA Tests
- Admin can enroll in TOTP-based MFA
- Admin with MFA must verify second factor during login
- Admin cannot bypass MFA requirement

## Firebase Configuration

The tests use the Firebase emulators with the following configuration:
- Auth emulator: Port 9099
- Firestore emulator: Port 8080

## Troubleshooting

If you encounter issues:

1. **Firebase emulator connection errors**: Ensure Firebase emulators are running on the expected ports
2. **Authentication issues**: The tests create temporary users. If you see auth errors, try resetting the Auth emulator
3. **Test data issues**: Check Firestore emulator data for consistency