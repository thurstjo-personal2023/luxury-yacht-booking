# Administrator MFA Testing Configuration

This document outlines the testing configuration for Multi-Factor Authentication (MFA) in the Etoile Yachts administrator portal.

## Testing Goals

1. Verify MFA is correctly enforced for administrator accounts
2. Test the MFA enrollment process works properly
3. Validate the sign-in flow with MFA verification
4. Handle error cases and edge scenarios

## Testing Strategy

Our MFA testing strategy combines three levels of testing:

### 1. Unit Tests
- Focus on logic and error handling
- Mock Firebase Auth interactions
- Test enrollment, verification, and error scenarios

### 2. Integration Tests
- Test with Firebase Emulator Suite
- Verify Firebase state transitions
- Test different MFA methods (SMS, TOTP)

### 3. End-to-End Tests
- Automated browser tests with Cypress
- Complete user journey verification
- UI element and accessibility testing

## Test Environment Setup

### Firebase Emulator Setup

```bash
# Start Firebase emulators for testing
firebase emulators:start
```

The Firebase Emulator configuration in `firebase.test.json` includes:
- Authentication emulator: Port 9099
- Firestore emulator: Port 8080
- Functions emulator: Port 5001

### Test Phone Numbers

For SMS-based verification testing, use these dedicated test phone numbers:
- +1 555-555-5555 (always succeeds)
- +1 555-555-0000 (simulates verification failure)

### TOTP Test Configuration

For Time-based One-Time Password testing:
- Use fixed test secret keys
- Test with simulated time drift scenarios
- Verify across multiple authenticator apps

## MFA Test Cases

### MFA Enrollment Test Cases

1. **Successful TOTP Enrollment**
   - Administrator can generate and scan a TOTP secret
   - Verify the setup with a valid TOTP code
   - Confirm enrollment status in Firebase

2. **Successful SMS Enrollment**
   - Administrator can register a phone number
   - Receive and verify an SMS code
   - Confirm enrollment status in Firebase

3. **Failed TOTP Verification**
   - Test with invalid TOTP codes
   - Verify error messages
   - Confirm enrollment not completed

4. **Backup Codes Generation**
   - Generate backup codes during MFA setup
   - Store backup codes securely
   - Use backup code for authentication

### MFA Sign-In Test Cases

1. **Successful Sign-In with TOTP**
   - Sign in with email/password
   - Be prompted for second factor
   - Enter valid TOTP code
   - Complete sign-in successfully

2. **Successful Sign-In with SMS**
   - Sign in with email/password
   - Be prompted for SMS code
   - Enter valid code
   - Complete sign-in successfully

3. **Failed Sign-In with Invalid MFA**
   - Sign in with email/password
   - Enter invalid TOTP/SMS code
   - Verify error message
   - Confirm authentication blocked

4. **Recovery with Backup Codes**
   - Sign in with email/password
   - Select backup code recovery option
   - Enter valid backup code
   - Complete sign-in successfully

### MFA Enforcement Test Cases

1. **MFA Requirement for Admin Access**
   - Verify admins without MFA cannot access protected routes
   - Redirect to MFA setup for non-enrolled admins
   - Block access until MFA setup is complete

2. **MFA Session Handling**
   - Verify MFA verification is required after session timeout
   - Test "remember this device" functionality
   - Validate session expiration behavior

## Error Handling Test Cases

1. **Network Errors During MFA**
   - Simulate network failures during MFA verification
   - Test application recovery
   - Verify user-friendly error messages

2. **Rate Limiting**
   - Test behavior after multiple failed verification attempts
   - Verify account lockout policies
   - Test recovery procedures

3. **TOTP Time Drift**
   - Test with simulated clock skew
   - Verify tolerance for small time differences
   - Test error handling for large time differences

## Test Automation

The MFA tests are automated using:
1. Jest for unit and integration tests
2. Cypress for end-to-end testing

To run the MFA test suite:

```bash
./run-admin-tests.sh
```

## Manual Testing Checklist

For aspects that are difficult to automate, follow this manual testing checklist:

- [ ] Test MFA enrollment on mobile devices
- [ ] Verify QR code scanning with physical devices
- [ ] Test with actual SMS delivery to real phone numbers (in development environment)
- [ ] Verify accessibility of MFA screens with screen readers

## Troubleshooting

If MFA tests fail:
1. Verify Firebase emulators are running
2. Check for simulated time drift issues
3. Reset test environment between runs
4. Verify network connectivity for API calls