# Administrator Registration Test Suite

## Overview
This document outlines the test cases for the Administrator Registration and Validation functionality for the Etoile Yachts platform. The Administrator Registration process includes invitation handling, multi-step verification, and approval workflows.

## Test IDs and Descriptions

### ARV-001: Admin Invitation Generation
**Objective**: Verify that Super Administrators can generate invitation links for new administrators.

**Test Steps**:
1. Login as a Super Administrator
2. Generate an invitation for a new administrator with a specific email address
3. Verify the invitation is stored correctly in Firestore
4. Verify the invitation has a valid token and expiration date

**Expected Results**:
- Invitation record is created in Firestore
- Email address is correctly associated with the invitation
- Token is generated and valid
- Expiration date is set for 7 days in the future
- Used status is set to false

### ARV-002: Registration Access Control
**Objective**: Verify that administrator registration requires a valid invitation token.

**Test Steps**:
1. Attempt to access the registration form without a token
2. Attempt to register with an invalid token
3. Attempt to register with an expired token
4. Attempt to register with a valid token

**Expected Results**:
- Registration is rejected for no token, invalid tokens, and expired tokens
- Registration proceeds only with a valid token

### ARV-003: Registration Verification Requirements
**Objective**: Verify that administrator registration requires proper verification steps.

**Test Steps**:
1. Access registration form with a valid token
2. Submit registration without email verification
3. Submit registration without phone verification
4. Submit registration with weak password
5. Submit complete registration with all verifications

**Expected Results**:
- Registration is rejected without email verification
- Registration is rejected without phone verification
- Registration is rejected with weak password
- Registration proceeds with all verifications
- Admin account is created in pending_approval state

### ARV-004: Admin Account Status Control
**Objective**: Verify that admin accounts remain inactive until approved.

**Test Steps**:
1. Create a pending admin account
2. Attempt to access admin features with the pending account
3. Verify middleware blocks access

**Expected Results**:
- Admin account is created in pending_approval state
- Access to admin features is blocked until approval
- Appropriate error messages are shown

### ARV-005: Admin Approval Process
**Objective**: Verify that Super Administrators can approve pending admin accounts.

**Test Steps**:
1. Create a pending admin account
2. Login as a Super Administrator
3. View and approve the pending admin account
4. Verify account status change

**Expected Results**:
- Super Admin can view pending accounts
- Super Admin can approve or reject accounts
- Account status changes to 'active' when approved
- Approved accounts gain access to admin features

### ARV-006: Expired Invitation Handling
**Objective**: Verify that expired invitations are properly handled.

**Test Steps**:
1. Create an expired invitation (expiration date in the past)
2. Attempt to use the expired invitation
3. Verify rejection with appropriate error message

**Expected Results**:
- Expired invitations are recognized as invalid
- Appropriate error message about expiration is displayed
- Registration does not proceed

### ARV-007: OTP Verification Attempts
**Objective**: Verify that OTP verification has appropriate attempt limits.

**Test Steps**:
1. Access registration with valid token
2. Submit incorrect OTP multiple times
3. Verify lockout after 3 failed attempts

**Expected Results**:
- OTP failures are tracked
- After 3 failed attempts, account is temporarily locked
- Appropriate error messages are shown

### ARV-008: Password Strength Requirements
**Objective**: Verify that administrator passwords must meet strong requirements.

**Test Steps**:
1. Attempt registration with short password
2. Attempt registration with password without uppercase
3. Attempt registration with password without lowercase
4. Attempt registration with password without numbers
5. Attempt registration with password without special characters
6. Attempt registration with strong password

**Expected Results**:
- All weak passwords are rejected with specific error messages
- Strong password is accepted

### ARV-009: MFA Requirement Enforcement
**Objective**: Verify that administrators must set up MFA before accessing admin features.

**Test Steps**:
1. Complete registration and approval process
2. Attempt to access admin features without MFA setup
3. Set up MFA
4. Access admin features after MFA setup

**Expected Results**:
- Admin cannot access admin features until MFA is set up
- MFA setup workflow is enforced
- Access is granted after MFA setup

### ARV-010: Invite Usage Restriction
**Objective**: Verify that invitations can only be used once.

**Test Steps**:
1. Use a valid invitation to register
2. Attempt to use the same invitation again

**Expected Results**:
- First registration succeeds
- Second attempt is rejected
- Invitation is marked as used after first registration

## Implementation Details

### Test Environment
- Tests run against Firebase Emulators (Auth, Firestore, Functions)
- Express app for API testing
- Mock implementations for external services

### Test Data
- Test admin users with various roles and statuses
- Test invitations with various states (valid, expired, used)
- Mock authentication tokens for API requests

### Test Helpers
- `createTestAdminUser()`: Creates admin users for testing
- `createTestInvitation()`: Creates invitations for testing
- Mock middleware for auth and admin role verification
- Mock cloud functions for invitation validation

## Technical Considerations

### Firebase Emulators
- Tests require Firebase Emulators running for Auth, Firestore, and Functions
- Test environment automatically checks if emulators are running
- Local data is reset between test runs

### Jest Configuration
- Tests run in Node.js environment
- TypeScript support via ts-jest
- Setup files handle emulator initialization

### Test Isolation
- Each test starts with a clean state
- Admin users and invitations are created per test
- Auth state is cleared between tests