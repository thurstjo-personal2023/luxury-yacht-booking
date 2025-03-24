# Administrator Registration Testing Guide

This guide explains how to test the Administrator Registration functionality in the Etoile Yachts platform.

## Overview

The Administrator Registration process has several stages:
1. Super Administrator creates an invitation for a new admin
2. Prospective administrator receives the invitation link
3. Administrator completes registration with email and phone verification
4. Super Administrator reviews and approves the new account
5. New administrator sets up Multi-Factor Authentication (MFA)
6. Administrator can now access the admin portal

## Setup Testing Environment

To test the full Administrator Registration flow, you first need to create a Super Administrator account:

### Creating a Super Admin Account

1. Start the application using the workflow:
   ```
   npm run dev
   ```

2. Create a Super Admin account using the provided script:
   ```bash
   ./run-create-super-admin.sh
   ```

   The script will prompt you for:
   - Email address
   - Password
   - First Name
   - Last Name

   You can also provide these as command-line arguments:
   ```bash
   ./run-create-super-admin.sh "email@example.com" "password123" "John" "Smith"
   ```

3. Upon successful creation, the script will display the Super Admin's credentials.

### Testing the Administrator Registration Flow

Once you have created a Super Admin account, you can test the entire registration flow:

1. **Login as Super Admin**:
   - Navigate to `/admin/login`
   - Enter the Super Admin credentials

2. **Create an Admin Invitation**:
   - From the Admin Portal, go to the "User Management" section
   - Click "Create Admin Invitation"
   - Enter email, role, department, and position for the new admin
   - Submit the invitation

3. **Accept Invitation**:
   - Normally, an email would be sent with the invitation link
   - For testing, the link will be displayed in the console logs
   - The invitation link format is: `/admin/register?token=INVITATION_TOKEN`
   - Navigate to this URL to begin the registration process

4. **Complete Registration**:
   - Fill out the registration form with personal details
   - Verify email using the OTP code (in testing mode, the code is 123456)
   - Verify phone number using the OTP code (in testing mode, the code is 123456)
   - Create a strong password

5. **Approval Process**:
   - Log back in as Super Admin
   - Go to "Admin Approvals" section
   - Review the new admin account
   - Approve or reject the application

6. **MFA Setup**:
   - The new admin can now log in
   - They will be prompted to set up MFA before accessing the admin portal
   - Choose between TOTP (authenticator app) or phone number verification
   - Complete MFA setup

7. **Admin Portal Access**:
   - After MFA setup, the admin can access the full admin portal

## Testing Notes

- In development mode, the verification codes (OTP) for both email and phone are hard-coded to `123456` for testing purposes
- MFA verification in testing mode also accepts simplified codes
- The `ADMIN-TEST-CONFIGURATION.md` file contains more technical details about the testing configuration
- For programmatic testing, refer to `admin-registration.test.simplified.ts` and `admin-mfa.test.simplified.ts`

## Important Collections in Firestore

The administrator registration system uses these Firestore collections:

- `admin_invitations`: Stores invitation tokens and metadata
- `admin_profiles`: Contains approved administrator accounts and their details
- `admin_verifications`: Tracks verification status for admin accounts
- `admin_approval_requests`: Stores pending approval requests
- `admin_login_history`: Audit log of administrator login attempts
- `admin_mfa_enrollments`: Stores MFA configuration for administrators

## Security Considerations

- The Super Admin creation endpoint (`/api/init-super-admin`) is disabled in production environments
- All admin routes require proper authentication and role verification
- MFA is enforced for all administrator accounts
- Admin sessions have automatic timeout after inactivity
- IP restrictions can be configured for additional security