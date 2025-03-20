/**
 * Authentication Flow E2E Tests
 * 
 * These tests verify the complete authentication journey, including
 * registration, login, password reset, profile management, and role-based access.
 */
describe('Authentication User Journey', () => {
  beforeEach(() => {
    // Reset application state before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });
  
  it('should allow a new user to register', () => {
    // Generate unique email for test
    const uniqueEmail = `test-user-${Date.now()}@example.com`;
    const password = 'Password123!';
    const name = 'Test User';
    
    // Visit register page
    cy.visit('/register');
    
    // Fill registration form
    cy.get('[data-cy=register-name]').type(name);
    cy.get('[data-cy=register-email]').type(uniqueEmail);
    cy.get('[data-cy=register-password]').type(password);
    cy.get('[data-cy=register-confirm-password]').type(password);
    cy.get('[data-cy=register-phone]').type('1234567890');
    cy.get('[data-cy=register-role]').select('consumer');
    
    // Accept terms
    cy.get('[data-cy=register-terms]').check();
    
    // Submit form
    cy.get('[data-cy=register-submit]').click();
    
    // Verify successful registration (redirected to verify email page)
    cy.url().should('include', '/verify-email');
    cy.get('[data-cy=verification-message]').should('be.visible');
    
    // Simulate email verification (this would normally be done through a verification link)
    // For testing, we'll directly visit the verification confirmation page
    cy.visit('/verify-email/confirmation');
    
    // Verify successful verification
    cy.get('[data-cy=verification-success]').should('be.visible');
    cy.get('[data-cy=login-link]').should('be.visible').click();
    
    // Login with new credentials
    cy.url().should('include', '/login');
    cy.get('[data-cy=login-email]').type(uniqueEmail);
    cy.get('[data-cy=login-password]').type(password);
    cy.get('[data-cy=login-submit]').click();
    
    // Verify successful login
    cy.get('[data-cy=user-menu]').should('be.visible');
    cy.get('[data-cy=user-menu]').click();
    cy.get('[data-cy=username]').should('contain', name);
  });
  
  it('should handle invalid login attempts', () => {
    // Visit login page
    cy.visit('/login');
    
    // Try login with invalid email format
    cy.get('[data-cy=login-email]').type('invalid-email');
    cy.get('[data-cy=login-password]').type('password123');
    cy.get('[data-cy=login-submit]').click();
    
    // Verify validation error
    cy.get('[data-cy=email-error]').should('be.visible');
    
    // Try login with valid email but wrong password
    cy.get('[data-cy=login-email]').clear().type('test@example.com');
    cy.get('[data-cy=login-password]').clear().type('wrongpassword');
    cy.get('[data-cy=login-submit]').click();
    
    // Verify error message
    cy.get('[data-cy=login-error]').should('be.visible');
    cy.get('[data-cy=login-error]').should('contain', 'Invalid email or password');
    
    // Try login with non-existent user
    cy.get('[data-cy=login-email]').clear().type('nonexistent@example.com');
    cy.get('[data-cy=login-password]').clear().type('password123');
    cy.get('[data-cy=login-submit]').click();
    
    // Verify error message
    cy.get('[data-cy=login-error]').should('be.visible');
    cy.get('[data-cy=login-error]').should('contain', 'Invalid email or password');
  });
  
  it('should allow password reset', () => {
    // Visit login page
    cy.visit('/login');
    
    // Click forgot password link
    cy.get('[data-cy=forgot-password-link]').click();
    
    // Verify forgot password page
    cy.url().should('include', '/forgot-password');
    
    // Enter email for password reset
    cy.get('[data-cy=reset-email]').type('test@example.com');
    cy.get('[data-cy=send-reset-link]').click();
    
    // Verify confirmation message
    cy.get('[data-cy=reset-sent-message]').should('be.visible');
    
    // Simulate clicking on reset link (this would normally come through email)
    // For testing, we'll directly visit the reset password page with a token
    cy.visit('/reset-password?token=test-token');
    
    // Enter new password
    cy.get('[data-cy=new-password]').type('NewPassword123!');
    cy.get('[data-cy=confirm-new-password]').type('NewPassword123!');
    cy.get('[data-cy=reset-password-submit]').click();
    
    // Verify success message
    cy.get('[data-cy=reset-success-message]').should('be.visible');
    cy.get('[data-cy=login-link]').should('be.visible');
  });
  
  it('should allow user to update profile information', () => {
    // Load test user data
    cy.fixture('users').then((users) => {
      // Login as consumer
      cy.login(users.consumer.email, users.consumer.password);
      
      // Navigate to profile
      cy.visit('/');
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=profile-link]').click();
      
      // Verify profile page
      cy.url().should('include', '/profile');
      
      // Update profile information
      cy.get('[data-cy=edit-profile-button]').click();
      cy.get('[data-cy=profile-name]').clear().type('Updated Name');
      cy.get('[data-cy=profile-phone]').clear().type('9876543210');
      
      // Select preferences
      cy.get('[data-cy=preference-luxury]').check();
      cy.get('[data-cy=preference-fishing]').check();
      
      // Save changes
      cy.get('[data-cy=save-profile-button]').click();
      
      // Verify success message
      cy.get('[data-cy=profile-updated-message]').should('be.visible');
      
      // Verify changes persist
      cy.reload();
      cy.get('[data-cy=profile-name]').should('have.value', 'Updated Name');
      cy.get('[data-cy=profile-phone]').should('have.value', '9876543210');
      cy.get('[data-cy=preference-luxury]').should('be.checked');
      cy.get('[data-cy=preference-fishing]').should('be.checked');
    });
  });
  
  it('should logout user correctly', () => {
    // Load test user data
    cy.fixture('users').then((users) => {
      // Login as consumer
      cy.login(users.consumer.email, users.consumer.password);
      
      // Verify login
      cy.visit('/');
      cy.get('[data-cy=user-menu]').should('be.visible');
      
      // Logout
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Verify logout
      cy.get('[data-cy=user-menu]').should('not.exist');
      cy.get('[data-cy=login-button]').should('be.visible');
      
      // Verify protected routes redirect to login
      cy.visit('/profile');
      cy.url().should('include', '/login');
    });
  });
  
  it('should enforce role-based access control', () => {
    // Load test user data
    cy.fixture('users').then((users) => {
      // Test consumer access
      cy.login(users.consumer.email, users.consumer.password);
      
      // Try to access producer dashboard (should redirect)
      cy.visit('/producer/dashboard');
      cy.url().should('include', '/access-denied');
      
      // Try to access admin area (should redirect)
      cy.visit('/admin');
      cy.url().should('include', '/access-denied');
      
      // Logout
      cy.logout();
      
      // Test producer access
      cy.login(users.producer.email, users.producer.password);
      
      // Should access producer dashboard
      cy.visit('/producer/dashboard');
      cy.get('[data-cy=producer-dashboard]').should('exist');
      
      // Try to access admin area (should redirect)
      cy.visit('/admin');
      cy.url().should('include', '/access-denied');
      
      // Logout
      cy.logout();
      
      // Test admin access
      cy.login(users.admin.email, users.admin.password);
      
      // Should access admin area
      cy.visit('/admin');
      cy.get('[data-cy=admin-dashboard]').should('exist');
      
      // Should access producer dashboard
      cy.visit('/producer/dashboard');
      cy.get('[data-cy=producer-dashboard]').should('exist');
    });
  });
  
  it('should handle different user registration types', () => {
    // Visit register page
    cy.visit('/register');
    
    // Test consumer registration (partial)
    cy.get('[data-cy=register-role]').select('consumer');
    
    // Verify consumer-specific fields
    cy.get('[data-cy=consumer-preferences]').should('be.visible');
    cy.get('[data-cy=business-name]').should('not.exist');
    
    // Test producer registration
    cy.get('[data-cy=register-role]').select('producer');
    
    // Verify producer-specific fields
    cy.get('[data-cy=consumer-preferences]').should('not.exist');
    cy.get('[data-cy=business-name]').should('be.visible');
    cy.get('[data-cy=business-description]').should('be.visible');
    
    // Test partner registration
    cy.get('[data-cy=register-role]').select('partner');
    
    // Verify partner-specific fields
    cy.get('[data-cy=business-name]').should('be.visible');
    cy.get('[data-cy=service-types]').should('be.visible');
  });
  
  it('should enforce password complexity requirements', () => {
    // Visit register page
    cy.visit('/register');
    
    // Test weak password
    cy.get('[data-cy=register-name]').type('Test User');
    cy.get('[data-cy=register-email]').type('test@example.com');
    cy.get('[data-cy=register-password]').type('password');
    cy.get('[data-cy=register-confirm-password]').type('password');
    cy.get('[data-cy=register-submit]').click();
    
    // Verify password error
    cy.get('[data-cy=password-error]').should('be.visible');
    cy.get('[data-cy=password-error]').should('contain', 'Password must contain');
    
    // Test mismatched passwords
    cy.get('[data-cy=register-password]').clear().type('Password123!');
    cy.get('[data-cy=register-confirm-password]').clear().type('DifferentPassword123!');
    cy.get('[data-cy=register-submit]').click();
    
    // Verify password mismatch error
    cy.get('[data-cy=password-mismatch-error]').should('be.visible');
    cy.get('[data-cy=password-mismatch-error]').should('contain', 'Passwords do not match');
  });
});