/**
 * Admin Testing Support - Custom Cypress Commands
 * 
 * This file provides custom Cypress commands for testing
 * administrator functionality in the Etoile Yachts platform.
 */

/// <reference types="cypress" />

// Add TypeScript definitions for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login as admin user
       * @param email Admin email
       * @param password Admin password
       * @example
       * cy.loginAsAdmin('admin@example.com', 'password123')
       */
      loginAsAdmin(email: string, password: string): Chainable<Element>;

      /**
       * Login with MFA
       * @param email Admin email
       * @param password Admin password
       * @param mfaCode MFA verification code
       * @example
       * cy.loginWithMFA('admin@example.com', 'password123', '123456')
       */
      loginWithMFA(email: string, password: string, mfaCode: string): Chainable<Element>;

      /**
       * Create admin invitation via API
       * @param targetEmail Email to invite
       * @param role Admin role
       * @param department Department
       * @param position Position
       * @example
       * cy.createAdminInvitation('new-admin@example.com', 'ADMIN', 'Technology', 'Developer')
       */
      createAdminInvitation(
        targetEmail: string, 
        role: string, 
        department: string, 
        position: string
      ): Chainable<{invitationId: string, token: string}>;

      /**
       * Complete admin approval via API
       * @param adminUid Admin user ID
       * @param approved Approval status
       * @param notes Approval notes
       * @example
       * cy.approveAdmin('admin-user-id', true, 'Approved by test')
       */
      approveAdmin(
        adminUid: string, 
        approved: boolean, 
        notes?: string
      ): Chainable<{success: boolean}>;

      /**
       * Setup admin MFA via API
       * @param adminUid Admin user ID
       * @param mfaType MFA type ('phone' or 'totp')
       * @example
       * cy.setupAdminMFA('admin-user-id', 'totp')
       */
      setupAdminMFA(
        adminUid: string, 
        mfaType: 'phone' | 'totp'
      ): Chainable<{success: boolean, secretKey?: string, backupCodes?: string[]}>;
    }
  }
}

// Login as admin user
Cypress.Commands.add('loginAsAdmin', (email: string, password: string) => {
  cy.visit('/admin-login');
  cy.get('[data-cy=email-input]').type(email);
  cy.get('[data-cy=password-input]').type(password);
  cy.get('[data-cy=login-button]').click();
});

// Login with MFA
Cypress.Commands.add('loginWithMFA', (email: string, password: string, mfaCode: string) => {
  cy.loginAsAdmin(email, password);
  
  // Check if MFA verification screen appears
  cy.get('[data-cy=mfa-verification-title]', { timeout: 10000 }).then(($title) => {
    if ($title.length) {
      cy.get('[data-cy=mfa-code-input]').type(mfaCode);
      cy.get('[data-cy=verify-mfa-button]').click();
    }
  });
  
  // Verify we're logged in
  cy.url().should('include', '/admin-dashboard');
});

// Create admin invitation via API
Cypress.Commands.add('createAdminInvitation', (
  targetEmail: string, 
  role: string = 'ADMIN', 
  department: string = 'Technology', 
  position: string = 'Tester'
) => {
  // Get current auth token
  cy.window().then((win) => {
    const token = localStorage.getItem('authToken') || '';
    
    // Create invitation via API
    return cy.request({
      method: 'POST',
      url: '/api/admin/create-invitation',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: {
        email: targetEmail,
        role,
        department,
        position
      }
    }).then((response) => {
      // Return invitation data
      return {
        invitationId: response.body.invitationId,
        token: response.body.token
      };
    });
  });
});

// Approve admin via API
Cypress.Commands.add('approveAdmin', (
  adminUid: string, 
  approved: boolean = true, 
  notes: string = 'Approved by Cypress test'
) => {
  // Get current auth token
  cy.window().then((win) => {
    const token = localStorage.getItem('authToken') || '';
    
    // Approve admin via API
    return cy.request({
      method: 'POST',
      url: '/api/admin/process-approval',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: {
        adminUid,
        status: approved ? 'active' : 'rejected',
        notes
      }
    }).then((response) => {
      return {
        success: response.body.success
      };
    });
  });
});

// Setup admin MFA via API
Cypress.Commands.add('setupAdminMFA', (
  adminUid: string, 
  mfaType: 'phone' | 'totp' = 'totp'
) => {
  // Get current auth token
  cy.window().then((win) => {
    const token = localStorage.getItem('authToken') || '';
    
    // Setup MFA via API
    return cy.request({
      method: 'POST',
      url: '/api/admin/setup-mfa',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: {
        adminUid,
        mfaType
      }
    }).then((response) => {
      return {
        success: response.body.success,
        secretKey: response.body.secretKey,
        backupCodes: response.body.backupCodes
      };
    });
  });
});

// Add more admin testing commands as needed