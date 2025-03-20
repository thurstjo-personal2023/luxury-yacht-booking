/**
 * Producer Journey E2E Tests
 * 
 * These tests verify the producer-specific functionality, including
 * yacht creation, management, add-on bundling, and dashboard operations.
 */
describe('Producer User Journey', () => {
  beforeEach(() => {
    // Reset application state before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });
  
  it('should allow producers to create and manage yacht listings', () => {
    // Load test user data
    cy.fixture('users').then((users) => {
      // Login as producer
      cy.visit('/login');
      cy.get('[data-cy=login-email]').type(users.producer.email);
      cy.get('[data-cy=login-password]').type(users.producer.password);
      cy.get('[data-cy=login-submit]').click();
      
      // Navigate to producer dashboard
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=producer-dashboard-link]').click();
      cy.url().should('include', '/producer/dashboard');
      
      // Create new yacht
      cy.get('[data-cy=create-yacht-button]').click();
      cy.url().should('include', '/producer/yachts/create');
      
      // Fill yacht form
      const yachtName = `Test Yacht ${Date.now().toString().slice(-6)}`;
      cy.get('[data-cy=yacht-title]').type(yachtName);
      cy.get('[data-cy=yacht-description]').type('This is a test yacht listing created by Cypress.');
      cy.get('[data-cy=yacht-category]').select('luxury');
      cy.get('[data-cy=yacht-capacity]').type('10');
      cy.get('[data-cy=yacht-duration]').type('4');
      cy.get('[data-cy=yacht-pricing]').type('1500');
      
      // Select location
      cy.get('[data-cy=yacht-region]').select('dubai');
      cy.get('[data-cy=yacht-port-marina]').select('Dubai Marina');
      cy.get('[data-cy=yacht-address]').type('Dubai Marina, Berth 42');
      
      // Upload yacht image
      cy.get('[data-cy=yacht-image-upload]').selectFile('cypress/fixtures/yacht-image.jpg', { force: true });
      
      // Save yacht
      cy.get('[data-cy=save-yacht-button]').click();
      
      // Verify success message
      cy.get('[data-cy=yacht-created-success]', { timeout: 10000 }).should('be.visible');
      
      // Verify yacht appears in producer dashboard
      cy.visit('/producer/dashboard');
      cy.get('[data-cy=yacht-listings]').should('be.visible');
      cy.get('[data-cy=yacht-card]').contains(yachtName).should('be.visible');
      
      // Edit yacht
      cy.get('[data-cy=yacht-card]').contains(yachtName).parent().find('[data-cy=edit-yacht-button]').click();
      
      // Update yacht details
      const updatedPrice = '1600';
      cy.get('[data-cy=yacht-pricing]').clear().type(updatedPrice);
      
      // Save changes
      cy.get('[data-cy=save-yacht-button]').click();
      
      // Verify success message
      cy.get('[data-cy=yacht-updated-success]', { timeout: 10000 }).should('be.visible');
      
      // Verify changes were saved
      cy.visit('/producer/dashboard');
      cy.get('[data-cy=yacht-card]').contains(yachtName).parent().find('[data-cy=yacht-price]').should('contain', updatedPrice);
    });
  });
  
  it('should allow producers to manage yacht availability', () => {
    // Load test user data
    cy.fixture('users').then((users) => {
      // Login as producer
      cy.visit('/login');
      cy.get('[data-cy=login-email]').type(users.producer.email);
      cy.get('[data-cy=login-password]').type(users.producer.password);
      cy.get('[data-cy=login-submit]').click();
      
      // Navigate to producer dashboard
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=producer-dashboard-link]').click();
      cy.url().should('include', '/producer/dashboard');
      
      // Select the first yacht
      cy.get('[data-cy=yacht-card]').first().within(() => {
        // Get initial availability status
        cy.get('[data-cy=availability-toggle]').then(($toggle) => {
          const initialStatus = $toggle.attr('data-active') === 'true';
          
          // Toggle availability
          cy.get('[data-cy=availability-toggle]').click();
          
          // Verify status changed
          cy.get('[data-cy=availability-toggle]', { timeout: 5000 }).should('have.attr', 'data-active', (!initialStatus).toString());
          
          // Toggle back to original status
          cy.get('[data-cy=availability-toggle]').click();
          
          // Verify status returned to original
          cy.get('[data-cy=availability-toggle]', { timeout: 5000 }).should('have.attr', 'data-active', initialStatus.toString());
        });
      });
    });
  });
  
  it('should allow producers to create service add-ons', () => {
    // Load test user data
    cy.fixture('users').then((users) => {
      // Login as producer
      cy.visit('/login');
      cy.get('[data-cy=login-email]').type(users.producer.email);
      cy.get('[data-cy=login-password]').type(users.producer.password);
      cy.get('[data-cy=login-submit]').click();
      
      // Navigate to add-ons management
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=producer-dashboard-link]').click();
      cy.url().should('include', '/producer/dashboard');
      cy.get('[data-cy=manage-addons-link]').click();
      cy.url().should('include', '/producer/addons');
      
      // Create new add-on
      cy.get('[data-cy=create-addon-button]').click();
      
      // Fill add-on form
      const addonName = `Test Add-on ${Date.now().toString().slice(-6)}`;
      cy.get('[data-cy=addon-name]').type(addonName);
      cy.get('[data-cy=addon-description]').type('This is a test service add-on created by Cypress.');
      cy.get('[data-cy=addon-category]').select('catering');
      cy.get('[data-cy=addon-pricing]').type('250');
      
      // Upload add-on image
      cy.get('[data-cy=addon-image-upload]').selectFile('cypress/fixtures/yacht-image.jpg', { force: true });
      
      // Save add-on
      cy.get('[data-cy=save-addon-button]').click();
      
      // Verify success message
      cy.get('[data-cy=addon-created-success]', { timeout: 10000 }).should('be.visible');
      
      // Verify add-on appears in list
      cy.visit('/producer/addons');
      cy.get('[data-cy=addon-item]').contains(addonName).should('be.visible');
    });
  });
  
  it('should allow producers to bundle partner add-ons with yachts', () => {
    // Load test user data
    cy.fixture('users').then((users) => {
      // Login as producer
      cy.visit('/login');
      cy.get('[data-cy=login-email]').type(users.producer.email);
      cy.get('[data-cy=login-password]').type(users.producer.password);
      cy.get('[data-cy=login-submit]').click();
      
      // Navigate to producer dashboard
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=producer-dashboard-link]').click();
      cy.url().should('include', '/producer/dashboard');
      
      // Navigate to available partner add-ons
      cy.get('[data-cy=available-addons-link]').click();
      cy.url().should('include', '/producer/available-addons');
      
      // Verify partner add-ons are listed
      cy.get('[data-cy=partner-addon-section]').should('be.visible');
      cy.get('[data-cy=partner-addon-item]').should('have.length.at.least', 1);
      
      // Select an addon to bundle
      cy.get('[data-cy=partner-addon-item]').first().within(() => {
        cy.get('[data-cy=addon-name]').invoke('text').as('addonName');
        cy.get('[data-cy=bundle-addon-button]').click();
      });
      
      // Select yacht to bundle with
      cy.get('[data-cy=bundle-addon-modal]').should('be.visible');
      cy.get('[data-cy=yacht-selector]').click();
      cy.get('[data-cy=yacht-option]').first().click();
      
      // Set as required add-on
      cy.get('[data-cy=addon-required]').click();
      
      // Set pricing
      cy.get('[data-cy=addon-pricing]').clear().type('300');
      
      // Set commission rate
      cy.get('[data-cy=addon-commission]').clear().type('15');
      
      // Save bundling
      cy.get('[data-cy=save-bundling-button]').click();
      
      // Verify success message
      cy.get('[data-cy=bundling-success]', { timeout: 10000 }).should('be.visible');
      
      // Navigate to yacht details to verify add-on is bundled
      cy.visit('/producer/dashboard');
      cy.get('[data-cy=yacht-card]').first().click();
      
      // Check included add-ons section
      cy.get('[data-cy=yacht-included-addons]').should('be.visible');
      cy.get('@addonName').then((addonName) => {
        cy.get('[data-cy=included-addon-item]').contains(addonName).should('be.visible');
      });
    });
  });
  
  it('should allow producers to view booking analytics', () => {
    // Load test user data
    cy.fixture('users').then((users) => {
      // Login as producer
      cy.visit('/login');
      cy.get('[data-cy=login-email]').type(users.producer.email);
      cy.get('[data-cy=login-password]').type(users.producer.password);
      cy.get('[data-cy=login-submit]').click();
      
      // Navigate to producer dashboard
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=producer-dashboard-link]').click();
      cy.url().should('include', '/producer/dashboard');
      
      // Navigate to analytics
      cy.get('[data-cy=analytics-link]').click();
      cy.url().should('include', '/producer/analytics');
      
      // Verify analytics components
      cy.get('[data-cy=booking-chart]').should('be.visible');
      cy.get('[data-cy=revenue-summary]').should('be.visible');
      cy.get('[data-cy=popular-yachts]').should('be.visible');
      
      // Test date filter
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthString = lastMonth.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      const today = new Date().toISOString().split('T')[0];
      
      cy.get('[data-cy=date-range-start]').type(lastMonthString);
      cy.get('[data-cy=date-range-end]').type(today);
      cy.get('[data-cy=apply-date-filter]').click();
      
      // Verify filter applied
      cy.get('[data-cy=filter-applied-message]').should('be.visible');
      cy.get('[data-cy=booking-chart]').should('be.visible'); // Chart should update
    });
  });
});