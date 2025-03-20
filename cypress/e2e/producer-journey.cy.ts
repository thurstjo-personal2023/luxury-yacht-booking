/**
 * Producer Journey E2E Tests
 * 
 * These tests verify the complete producer journey, including
 * yacht management, booking management, and analytics.
 */
describe('Producer Dashboard User Journey', () => {
  beforeEach(() => {
    // Reset application state before each test
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Load test user data
    cy.fixture('users').then((users) => {
      // Login as producer
      cy.login(users.producer.email, users.producer.password);
    });
  });
  
  it('should navigate to producer dashboard after login', () => {
    // Visit home page
    cy.visit('/');
    
    // Click on dashboard button in user menu
    cy.get('[data-cy=user-menu]').click();
    cy.get('[data-cy=dashboard-link]').click();
    
    // Verify redirect to producer dashboard
    cy.url().should('include', '/producer/dashboard');
    cy.get('[data-cy=producer-dashboard]').should('exist');
    
    // Verify dashboard components
    cy.get('[data-cy=yacht-listings]').should('exist');
    cy.get('[data-cy=bookings-panel]').should('exist');
    cy.get('[data-cy=revenue-stats]').should('exist');
  });
  
  it('should create and publish a new yacht listing', () => {
    // Navigate to dashboard
    cy.visit('/producer/dashboard');
    
    // Click create yacht button
    cy.get('[data-cy=create-yacht-button]').click();
    
    // Fill yacht details
    cy.get('[data-cy=yacht-title]').type('Test Luxury Yacht');
    cy.get('[data-cy=yacht-description]').type('This is a test luxury yacht for e2e testing');
    cy.get('[data-cy=yacht-category]').select('Luxury');
    cy.get('[data-cy=yacht-location-address]').type('Dubai Marina');
    cy.get('[data-cy=yacht-price]').type('5000');
    cy.get('[data-cy=yacht-capacity]').type('10');
    cy.get('[data-cy=yacht-duration]').type('8');
    
    // Upload yacht image
    cy.get('[data-cy=upload-image-button]').click();
    cy.get('input[type=file]').selectFile('cypress/fixtures/yacht-image.jpg', { force: true });
    cy.get('[data-cy=confirm-upload]').click();
    
    // Save as draft
    cy.get('[data-cy=save-draft-button]').click();
    
    // Verify success message
    cy.get('[data-cy=success-toast]').should('be.visible');
    
    // Navigate to yacht listings
    cy.get('[data-cy=yacht-listings-tab]').click();
    
    // Verify new yacht appears in the list
    cy.get('[data-cy=yacht-list]').should('contain', 'Test Luxury Yacht');
    
    // Edit the yacht
    cy.contains('Test Luxury Yacht').parents('[data-cy=yacht-item]').find('[data-cy=edit-yacht-button]').click();
    
    // Update description
    cy.get('[data-cy=yacht-description]').clear().type('Updated description for e2e test');
    
    // Publish the yacht
    cy.get('[data-cy=publish-yacht-button]').click();
    
    // Confirm publish
    cy.get('[data-cy=confirm-publish]').click();
    
    // Verify success message
    cy.get('[data-cy=success-toast]').should('be.visible');
    
    // Navigate to yacht listings
    cy.get('[data-cy=yacht-listings-tab]').click();
    
    // Verify yacht is published
    cy.contains('Test Luxury Yacht').parents('[data-cy=yacht-item]').find('[data-cy=status-badge]').should('contain', 'Published');
  });
  
  it('should view and manage bookings', () => {
    // Navigate to dashboard
    cy.visit('/producer/dashboard');
    
    // Click on bookings tab
    cy.get('[data-cy=bookings-tab]').click();
    
    // Verify bookings list is displayed
    cy.get('[data-cy=bookings-list]').should('exist');
    
    // Filter by status
    cy.get('[data-cy=booking-status-filter]').select('Pending');
    cy.get('[data-cy=apply-filter-button]').click();
    
    // Verify filtered results
    cy.get('[data-cy=booking-item]').each(($booking) => {
      cy.wrap($booking).find('[data-cy=booking-status]').should('contain', 'Pending');
    });
    
    // View booking details for first booking
    cy.get('[data-cy=booking-item]').first().click();
    
    // Verify booking details
    cy.get('[data-cy=booking-details]').should('exist');
    cy.get('[data-cy=customer-info]').should('exist');
    cy.get('[data-cy=yacht-info]').should('exist');
    cy.get('[data-cy=booking-date]').should('exist');
    
    // Approve booking
    cy.get('[data-cy=approve-booking-button]').click();
    cy.get('[data-cy=confirm-approve]').click();
    
    // Verify status updated
    cy.get('[data-cy=booking-status]').should('contain', 'Confirmed');
    
    // Navigate back to bookings list
    cy.get('[data-cy=back-to-bookings]').click();
    
    // Verify booking is now in Confirmed status
    cy.get('[data-cy=booking-status-filter]').select('Confirmed');
    cy.get('[data-cy=apply-filter-button]').click();
    cy.get('[data-cy=booking-item]').should('exist');
  });
  
  it('should add and manage partner add-ons', () => {
    // Navigate to dashboard
    cy.visit('/producer/dashboard');
    
    // Go to add-ons tab
    cy.get('[data-cy=addons-tab]').click();
    
    // Verify available partner add-ons
    cy.get('[data-cy=partner-addons]').should('exist');
    
    // Browse available add-ons
    cy.get('[data-cy=browse-addons-button]').click();
    
    // Select an add-on
    cy.get('[data-cy=addon-item]').first().find('[data-cy=select-addon-button]').click();
    
    // Configure add-on inclusion
    cy.get('[data-cy=addon-price]').clear().type('250');
    cy.get('[data-cy=addon-required]').check();
    cy.get('[data-cy=addon-commission]').type('15');
    
    // Save add-on selection
    cy.get('[data-cy=save-addon-button]').click();
    
    // Verify add-on is added
    cy.get('[data-cy=success-toast]').should('be.visible');
    
    // Associate add-on with a yacht
    cy.get('[data-cy=yacht-listings-tab]').click();
    cy.get('[data-cy=yacht-item]').first().find('[data-cy=edit-yacht-button]').click();
    
    // Navigate to add-ons section
    cy.get('[data-cy=addons-section-tab]').click();
    
    // Add selected add-on to yacht
    cy.get('[data-cy=add-addon-button]').click();
    cy.get('[data-cy=addon-list]').contains('td', 'Partner Add-on').click();
    cy.get('[data-cy=confirm-addon-selection]').click();
    
    // Save yacht changes
    cy.get('[data-cy=save-yacht-button]').click();
    
    // Verify success
    cy.get('[data-cy=success-toast]').should('be.visible');
  });
  
  it('should view analytics and revenue stats', () => {
    // Navigate to dashboard
    cy.visit('/producer/dashboard');
    
    // Click on analytics tab
    cy.get('[data-cy=analytics-tab]').click();
    
    // Verify analytics components
    cy.get('[data-cy=revenue-chart]').should('exist');
    cy.get('[data-cy=bookings-chart]').should('exist');
    cy.get('[data-cy=top-yachts]').should('exist');
    
    // Filter analytics by date range
    cy.get('[data-cy=date-range-picker]').click();
    cy.get('[data-cy=date-range-30d]').click();
    
    // Verify charts update
    cy.get('[data-cy=loading-indicator]').should('not.exist');
    cy.get('[data-cy=revenue-chart]').should('exist');
    
    // Check detailed revenue breakdown
    cy.get('[data-cy=revenue-breakdown-button]').click();
    
    // Verify revenue table
    cy.get('[data-cy=revenue-table]').should('exist');
    cy.get('[data-cy=revenue-total]').should('exist');
  });
});