/**
 * Administrator Registration & Validation E2E Tests
 * 
 * This file contains Cypress tests for the Administrator Registration and Validation functionality.
 * Tests cover the scenarios specified in the Test Suite - Epics for the Administration Role.
 */

describe('1. Administrator Registration & Validation', () => {
  // Test data
  const testSuperAdminEmail = Cypress.env('SUPER_ADMIN_EMAIL') || 'super.admin@etoileyachts.com';
  const testSuperAdminPassword = Cypress.env('SUPER_ADMIN_PASSWORD') || 'SuperAdmin@123';
  const testAdminEmail = `test.admin.${Date.now()}@etoileyachts.com`;
  const testAdminPassword = 'TestAdmin@123';
  const testAdminName = 'Test Administrator';
  const testAdminPhone = '+971501234567';
  const testAdminDepartment = 'Technology';
  const testAdminPosition = 'Platform Tester';

  // Reusable function to log in as a super admin
  const loginAsSuperAdmin = () => {
    cy.visit('/admin-login');
    cy.get('[data-cy=email-input]').type(testSuperAdminEmail);
    cy.get('[data-cy=password-input]').type(testSuperAdminPassword);
    cy.get('[data-cy=login-button]').click();
    
    // Handle MFA if required (assuming it's already set up for super admin)
    cy.get('[data-cy=mfa-input]', { timeout: 10000 }).then(($mfaInput) => {
      if ($mfaInput.length) {
        // In a real implementation, you would need to use a test OTP provider
        // For testing, we'd typically use a fixed OTP or bypass in test environment
        cy.get('[data-cy=mfa-input]').type('123456');
        cy.get('[data-cy=verify-mfa-button]').click();
      }
    });
    
    // Verify we're on the admin dashboard
    cy.url().should('include', '/admin-dashboard');
  };

  /**
   * ARV-001: Super Admin can send an invite to an email address
   */
  it('ARV-001: Super Admin can send an invite to an email address', () => {
    // Log in as super admin
    loginAsSuperAdmin();
    
    // Navigate to the admin management section
    cy.get('[data-cy=admin-management-link]').click();
    
    // Click on "Invite Administrator" button
    cy.get('[data-cy=invite-admin-button]').click();
    
    // Fill out the invite form
    cy.get('[data-cy=invite-email-input]').type(testAdminEmail);
    cy.get('[data-cy=invite-role-select]').select('ADMIN');
    cy.get('[data-cy=invite-department-input]').type(testAdminDepartment);
    cy.get('[data-cy=invite-position-input]').type(testAdminPosition);
    
    // Send the invitation
    cy.get('[data-cy=send-invite-button]').click();
    
    // Verify success message
    cy.get('[data-cy=invite-success-message]')
      .should('be.visible')
      .and('contain', 'Invitation sent successfully');
      
    // Verify the invitation appears in the pending invitations list
    cy.get('[data-cy=pending-invitations-table]')
      .should('contain', testAdminEmail);
  });

  /**
   * ARV-002: Admin cannot register without an invite link
   */
  it('ARV-002: Admin cannot register without an invite link', () => {
    // Try to access the admin registration page directly without a token
    cy.visit('/admin-register');
    
    // Verify that access is denied
    cy.get('[data-cy=error-message]')
      .should('be.visible')
      .and('contain', 'No valid invite found');
      
    // Verify we cannot access the registration form
    cy.get('[data-cy=admin-registration-form]').should('not.exist');
  });

  /**
   * ARV-003: Admin registration requires email & phone OTP verification
   * 
   * Note: This test assumes we have a way to intercept and simulate OTP codes in the test environment
   */
  it('ARV-003: Admin registration requires email & phone OTP verification', () => {
    // For this test, we would normally:
    // 1. Create an invitation in the database directly or through the API
    // 2. Use a real invite link with token
    // 3. Intercept email/SMS APIs to get OTP codes
    
    // Since we're in a test environment, we'll simulate with a mock invitation
    // In a real test, you'd need to create this first via the API or database
    const inviteToken = 'test-invite-token-123456';
    
    // Visit the registration page with the invite token
    cy.visit(`/admin-register?token=${inviteToken}`);
    
    // Verify we're on the correct page
    cy.get('[data-cy=admin-registration-title]')
      .should('be.visible')
      .and('contain', 'Complete Your Administrator Registration');
    
    // Fill out registration form
    cy.get('[data-cy=admin-name-input]').type(testAdminName);
    cy.get('[data-cy=admin-email-input]').should('have.value', testAdminEmail); // Email should be pre-filled from invitation
    cy.get('[data-cy=admin-phone-input]').type(testAdminPhone);
    cy.get('[data-cy=admin-password-input]').type(testAdminPassword);
    cy.get('[data-cy=admin-confirm-password-input]').type(testAdminPassword);
    
    // Submit registration form
    cy.get('[data-cy=submit-registration-button]').click();
    
    // Verify we're taken to email verification step
    cy.get('[data-cy=email-verification-title]')
      .should('be.visible')
      .and('contain', 'Verify Your Email');
    
    // Enter email OTP code (in a real test, we'd intercept the email or use a test API)
    cy.get('[data-cy=email-otp-input]').type('123456');
    cy.get('[data-cy=verify-email-button]').click();
    
    // Verify we're taken to phone verification step
    cy.get('[data-cy=phone-verification-title]')
      .should('be.visible')
      .and('contain', 'Verify Your Phone');
    
    // Enter phone OTP code (in a real test, we'd intercept the SMS or use a test API)
    cy.get('[data-cy=phone-otp-input]').type('123456');
    cy.get('[data-cy=verify-phone-button]').click();
    
    // Verify we see the pending approval message
    cy.get('[data-cy=pending-approval-message]')
      .should('be.visible')
      .and('contain', 'Your registration is pending approval');
  });

  /**
   * ARV-004: Admin remains inactive until manually approved
   */
  it('ARV-004: Admin remains inactive until manually approved', () => {
    // Try to log in with the newly registered admin account (before approval)
    cy.visit('/admin-login');
    cy.get('[data-cy=email-input]').type(testAdminEmail);
    cy.get('[data-cy=password-input]').type(testAdminPassword);
    cy.get('[data-cy=login-button]').click();
    
    // Verify we see the pending approval message
    cy.get('[data-cy=login-error-message]')
      .should('be.visible')
      .and('contain', 'Your account is pending approval');
      
    // Verify we cannot access the admin dashboard
    cy.url().should('not.include', '/admin-dashboard');
  });

  /**
   * ARV-005: Super Admin can approve new Admins
   */
  it('ARV-005: Super Admin can approve new Admins', () => {
    // Log in as super admin
    loginAsSuperAdmin();
    
    // Navigate to admin management
    cy.get('[data-cy=admin-management-link]').click();
    
    // Go to pending approvals tab
    cy.get('[data-cy=pending-approvals-tab]').click();
    
    // Find and select the pending admin
    cy.get('[data-cy=pending-admin-table]')
      .should('contain', testAdminEmail)
      .within(() => {
        cy.get(`[data-cy=approve-admin-${testAdminEmail.replace('@', '-at-')}]`).click();
      });
    
    // Complete approval process
    cy.get('[data-cy=approval-notes-input]').type('Approved by automatic test');
    cy.get('[data-cy=confirm-approval-button]').click();
    
    // Verify success message
    cy.get('[data-cy=approval-success-message]')
      .should('be.visible')
      .and('contain', 'Administrator approved successfully');
      
    // Verify admin now appears in the active admins list
    cy.get('[data-cy=active-admins-tab]').click();
    cy.get('[data-cy=active-admins-table]')
      .should('contain', testAdminEmail);
  });

  /**
   * ARV-006: Expired invite token
   */
  it('ARV-006: Expired invite token is rejected', () => {
    // Simulate an expired token
    const expiredToken = 'expired-token-123456';
    
    // Try to use the expired token
    cy.visit(`/admin-register?token=${expiredToken}`);
    
    // Verify error message
    cy.get('[data-cy=error-message]')
      .should('be.visible')
      .and('contain', 'Invitation has expired');
  });

  /**
   * ARV-007: Incorrect OTP blocks after multiple failures
   */
  it('ARV-007: Incorrect OTP blocks after 3 failed attempts', () => {
    // For this test to be realistic, we'd need:
    // 1. A valid invitation
    // 2. To complete the registration form
    // 3. To reach the OTP verification steps
    
    // This is a simplified version focusing on the OTP failure
    const inviteToken = 'test-invite-token-789012';
    cy.visit(`/admin-register?token=${inviteToken}`);
    
    // Complete registration form (simplified)
    cy.get('[data-cy=admin-registration-form]').within(() => {
      // Fill out form fields
      cy.get('[data-cy=submit-registration-button]').click();
    });
    
    // At email verification screen, try incorrect OTP 3 times
    for (let i = 0; i < 3; i++) {
      cy.get('[data-cy=email-otp-input]').clear().type('000000'); // Incorrect OTP
      cy.get('[data-cy=verify-email-button]').click();
      
      // Verify error message 
      cy.get('[data-cy=otp-error-message]')
        .should('be.visible')
        .and('contain', 'Invalid verification code');
    }
    
    // After 3 failures, verify account is locked
    cy.get('[data-cy=account-locked-message]')
      .should('be.visible')
      .and('contain', 'Too many failed attempts');
  });

  /**
   * ARV-008: Password strength requirements
   */
  it('ARV-008: Password too weak is rejected', () => {
    // Use a valid invitation token
    const inviteToken = 'test-invite-token-345678';
    cy.visit(`/admin-register?token=${inviteToken}`);
    
    // Fill out registration form with a weak password
    cy.get('[data-cy=admin-name-input]').type(testAdminName);
    cy.get('[data-cy=admin-phone-input]').type(testAdminPhone);
    
    // Test different weak passwords
    const weakPasswords = [
      'short', // Too short
      'password123', // No uppercase or special chars
      'PASSWORD123', // No lowercase or special chars
      'Password', // No numbers or special chars
      'Pass123!!' // No lowercase
    ];
    
    // Try each weak password
    weakPasswords.forEach(password => {
      cy.get('[data-cy=admin-password-input]').clear().type(password);
      cy.get('[data-cy=admin-confirm-password-input]').clear().type(password);
      
      // Either validation occurs on blur or on submit
      cy.get('[data-cy=submit-registration-button]').click();
      
      // Check for the appropriate error message
      cy.get('[data-cy=password-error-message]')
        .should('be.visible');
    });
    
    // Try with a strong password to confirm the validation works
    const strongPassword = 'StrongP@ssw0rd123';
    cy.get('[data-cy=admin-password-input]').clear().type(strongPassword);
    cy.get('[data-cy=admin-confirm-password-input]').clear().type(strongPassword);
    
    // Form should proceed
    cy.get('[data-cy=submit-registration-button]').click();
    
    // We should no longer see the password error
    cy.get('[data-cy=password-error-message]').should('not.exist');
  });
});