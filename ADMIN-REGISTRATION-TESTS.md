# Administrator Registration Test Suite Documentation

This document describes the detailed test cases for the Administrator Registration and Validation functionality in the Etoile Yachts platform.

## Test Case Specifications

### ARV-001: Super Admin can send an invite to an email address

**Description:**  
Tests that a Super Admin can generate an invitation for a new admin user.

**Preconditions:**
- Super Admin user is authenticated
- Super Admin authorization is verified

**Test Steps:**
1. Super Admin generates an invitation with:
   - Target email address
   - Admin role assignment
   - Department and position information
2. System generates a unique invitation token
3. System stores invitation record in Firestore
4. System sends invitation email with token link

**Expected Results:**
- Invitation record is created in Firestore
- Invitation has a valid expiration date
- Invitation token is valid and unique
- Response indicates successful invitation creation

**Assertions:**
- Verify invitation document exists in Firestore
- Verify invitation fields are correctly set
- Verify invitation token is valid
- Verify HTTP response status is successful

---

### ARV-002: Admin cannot register without an invite link

**Description:**  
Tests that non-invited users cannot register as administrators.

**Preconditions:**
- No valid invitation exists for test email

**Test Steps:**
1. Attempt to register a user as admin without invitation token
2. Attempt to register with an invalid/expired invitation token
3. Attempt to register with a fabricated token

**Expected Results:**
- All registration attempts are rejected
- Appropriate error messages are returned
- No admin user is created in the system

**Assertions:**
- Verify HTTP response status code indicates failure
- Verify error message indicates invitation requirement
- Verify no admin user record is created

---

### ARV-003: Admin registration requires email & phone OTP verification

**Description:**  
Tests that admin registration requires both email and phone verification.

**Preconditions:**
- Valid admin invitation exists
- User has started registration process

**Test Steps:**
1. Complete initial registration form
2. System sends email verification code
3. User provides valid email verification code
4. System sends phone verification code
5. User provides valid phone verification code

**Expected Results:**
- User cannot proceed without email verification
- User cannot proceed without phone verification
- Verification status is tracked correctly
- Full registration completes after both verifications

**Assertions:**
- Verify verification status updates correctly
- Verify system requires both verification steps
- Verify registration completion after verifications

---

### ARV-004: Admin remains inactive until manually approved

**Description:**  
Tests that new admin accounts remain inactive until approved by a Super Admin.

**Preconditions:**
- Admin user has completed registration
- Admin verification is complete

**Test Steps:**
1. Check admin account status after registration
2. Attempt to access admin features with new account
3. Verify account status shows as "pending approval"

**Expected Results:**
- Admin account is created but marked as "pending"
- Admin cannot access restricted features
- System shows appropriate "waiting for approval" messages

**Assertions:**
- Verify account status is "pending_approval"
- Verify admin access is restricted
- Verify proper notification to the user

---

### ARV-005: Super Admin can approve new Admins

**Description:**  
Tests that Super Admins can review and approve new administrator accounts.

**Preconditions:**
- Super Admin is authenticated
- New admin account is in "pending_approval" state

**Test Steps:**
1. Super Admin views list of pending admins
2. Super Admin reviews admin details
3. Super Admin approves the admin account
4. System updates admin status to "active"

**Expected Results:**
- Admin status changes to "active"
- Admin receives notification of approval
- Admin can now access appropriate features

**Assertions:**
- Verify admin status is updated correctly
- Verify approval timestamp is recorded
- Verify approving admin's ID is recorded

---

### ARV-006: Expired invite token is rejected

**Description:**  
Tests that expired invitation tokens are rejected during admin registration.

**Preconditions:**
- An invitation with an expired timestamp exists

**Test Steps:**
1. Attempt to register using expired invitation token
2. System validates token expiration timestamp
3. System rejects registration attempt

**Expected Results:**
- Registration is rejected
- Clear error message about expired invitation
- No admin account is created

**Assertions:**
- Verify HTTP response indicates failure
- Verify error message specifically mentions expiration
- Verify no admin account is created

---

### ARV-007: Incorrect OTP blocks after 3 failed attempts

**Description:**  
Tests that the system blocks further verification attempts after multiple failures.

**Preconditions:**
- Admin registration is in progress
- Verification process has started

**Test Steps:**
1. Submit incorrect OTP code first time
2. Submit incorrect OTP code second time
3. Submit incorrect OTP code third time
4. Attempt to submit a fourth incorrect code

**Expected Results:**
- First three attempts show error but allow retry
- Fourth attempt blocks verification for a time period
- User is notified of temporary blocking

**Assertions:**
- Verify failed attempt count is tracked
- Verify blocking occurs after three failures
- Verify error message indicates blocking duration

---

### ARV-008: Password too weak is rejected

**Description:**  
Tests that weak passwords are rejected during admin registration.

**Preconditions:**
- Valid invitation token exists
- Registration form is being completed

**Test Steps:**
1. Attempt to register with password "password"
2. Attempt to register with password "12345678"
3. Attempt to register with password without special characters
4. Attempt to register with password under minimum length

**Expected Results:**
- All weak password attempts are rejected
- Specific error messages indicate password requirements
- Registration doesn't proceed until password meets criteria

**Assertions:**
- Verify rejection of common passwords
- Verify rejection of short passwords
- Verify requirement for complexity (special chars, numbers, etc.)

---

### ARV-009: MFA setup is required before accessing admin features

**Description:**  
Tests that admins must complete MFA setup before accessing admin features.

**Preconditions:**
- Admin account is approved and activated
- Admin has not completed MFA setup

**Test Steps:**
1. Admin attempts to access admin dashboard
2. System checks MFA enrollment status
3. System redirects to MFA setup
4. Admin completes MFA setup
5. Admin attempts access again

**Expected Results:**
- Initial access attempt redirects to MFA setup
- MFA setup must be completed
- Access is granted after MFA setup

**Assertions:**
- Verify redirection to MFA setup
- Verify MFA enrollment status tracking
- Verify access after MFA enrollment

---

### ARV-010: Invitations can only be used once

**Description:**  
Tests that admin invitations cannot be reused after successful registration.

**Preconditions:**
- Valid invitation has been used for registration
- Registration process is complete

**Test Steps:**
1. Attempt to register another account with same invitation
2. System checks if invitation has been used
3. System rejects the registration attempt

**Expected Results:**
- Registration is rejected
- Clear error message about already-used invitation
- No additional admin account is created

**Assertions:**
- Verify HTTP response indicates failure
- Verify error message mentions already-used invitation
- Verify no additional admin account is created

## Test Implementation

Each test case is implemented in:

1. **Unit Tests**: `tests/unit/admin-registration-validation.test.ts`
   - Tests the core business logic
   - Uses mocked repositories

2. **Integration Tests**: `tests/integration/admin-registration.test.ts`
   - Tests the HTTP API endpoints
   - Uses Firebase emulator

3. **E2E Tests**: `cypress/e2e/admin-registration.cy.ts`
   - Tests the complete user interface flow
   - Uses Cypress for browser automation