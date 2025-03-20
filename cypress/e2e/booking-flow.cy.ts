/**
 * Booking Flow E2E Tests
 * 
 * These tests verify the complete booking journey from browsing yachts to
 * completing a booking with payment.
 */
describe('Booking Flow User Journey', () => {
  beforeEach(() => {
    // Reset application state before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });
  
  it('should allow yacht browsing without authentication', () => {
    // Visit homepage
    cy.visit('/');
    
    // Verify featured yachts visible
    cy.get('[data-cy=featured-yachts]').should('be.visible');
    cy.get('[data-cy=yacht-card]').should('have.length.greaterThan', 0);
    
    // Search for yachts
    cy.get('[data-cy=search-region]').select('dubai');
    cy.get('[data-cy=search-button]').click();
    
    // Verify search results
    cy.get('[data-cy=search-results]').should('be.visible');
    cy.get('[data-cy=yacht-card]').should('have.length.greaterThan', 0);
    
    // View yacht details
    cy.get('[data-cy=yacht-card]').first().click();
    
    // Verify yacht detail page
    cy.get('[data-cy=yacht-title]').should('be.visible');
    cy.get('[data-cy=yacht-description]').should('be.visible');
    cy.get('[data-cy=yacht-gallery]').should('be.visible');
    cy.get('[data-cy=booking-section]').should('be.visible');
    
    // Verify booking button prompts login for unauthenticated users
    cy.get('[data-cy=book-now-button]').click();
    cy.url().should('include', '/login');
  });
  
  it('should allow complete booking flow for authenticated consumer', () => {
    // Load test user data
    cy.fixture('users').then((users) => {
      // Login as consumer
      cy.visit('/login');
      cy.get('[data-cy=login-email]').type(users.consumer.email);
      cy.get('[data-cy=login-password]').type(users.consumer.password);
      cy.get('[data-cy=login-submit]').click();
      
      // Verify login success
      cy.get('[data-cy=user-menu]').should('be.visible');
      
      // Search for yachts
      cy.visit('/');
      cy.get('[data-cy=search-region]').select('dubai');
      cy.get('[data-cy=search-button]').click();
      
      // Select first yacht
      cy.get('[data-cy=yacht-card]').first().click();
      
      // Book now
      cy.get('[data-cy=book-now-button]').click();
      
      // Select booking date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      cy.get('[data-cy=booking-date-input]').click();
      cy.get('[data-cy=date-picker]').should('be.visible');
      
      // Find and click on tomorrow's date in the calendar
      cy.get(`[data-cy=calendar-day][data-date="${dateString}"]`).click();
      
      // Select payment method
      cy.get('[data-cy=payment-method-credit_card]').click();
      
      // Fill credit card details in Stripe Elements
      cy.get('[data-cy=card-element]').within(() => {
        cy.get('iframe[title="Secure card payment input frame"]').then($iframe => {
          const body = $iframe.contents().find('body');
          cy.wrap(body).find('[name="cardnumber"]').type('4242424242424242');
          cy.wrap(body).find('[name="exp-date"]').type('1230');
          cy.wrap(body).find('[name="cvc"]').type('123');
        });
      });
      
      // Complete booking
      cy.get('[data-cy=complete-booking-button]').click();
      
      // Verify successful booking
      cy.get('[data-cy=booking-confirmation]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-cy=booking-reference]').should('be.visible');
      cy.get('[data-cy=confirmation-message]').should('contain', 'Booking confirmed');
      
      // Verify booking appears in user's bookings
      cy.get('[data-cy=view-bookings-button]').click();
      cy.url().should('include', '/bookings');
      cy.get('[data-cy=booking-item]').should('have.length.at.least', 1);
    });
  });
  
  it('should show appropriate errors for invalid payment information', () => {
    // Load test user data
    cy.fixture('users').then((users) => {
      // Login as consumer
      cy.visit('/login');
      cy.get('[data-cy=login-email]').type(users.consumer.email);
      cy.get('[data-cy=login-password]').type(users.consumer.password);
      cy.get('[data-cy=login-submit]').click();
      
      // Search and select a yacht
      cy.visit('/');
      cy.get('[data-cy=featured-yachts]').should('be.visible');
      cy.get('[data-cy=yacht-card]').first().click();
      
      // Book now
      cy.get('[data-cy=book-now-button]').click();
      
      // Select booking date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      cy.get('[data-cy=booking-date-input]').click();
      cy.get('[data-cy=date-picker]').should('be.visible');
      
      // Find and click on tomorrow's date in the calendar
      cy.get(`[data-cy=calendar-day][data-date="${dateString}"]`).click();
      
      // Select payment method
      cy.get('[data-cy=payment-method-credit_card]').click();
      
      // Enter invalid card (declined card)
      cy.get('[data-cy=card-element]').within(() => {
        cy.get('iframe[title="Secure card payment input frame"]').then($iframe => {
          const body = $iframe.contents().find('body');
          cy.wrap(body).find('[name="cardnumber"]').type('4000000000000002'); // Declined card
          cy.wrap(body).find('[name="exp-date"]').type('1230');
          cy.wrap(body).find('[name="cvc"]').type('123');
        });
      });
      
      // Complete booking
      cy.get('[data-cy=complete-booking-button]').click();
      
      // Verify payment error is shown
      cy.get('[data-cy=payment-error]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-cy=payment-error]').should('contain', 'Your card was declined');
    });
  });
  
  it('should allow add-ons to be selected during booking', () => {
    // Load test user data
    cy.fixture('users').then((users) => {
      // Login as consumer
      cy.visit('/login');
      cy.get('[data-cy=login-email]').type(users.consumer.email);
      cy.get('[data-cy=login-password]').type(users.consumer.password);
      cy.get('[data-cy=login-submit]').click();
      
      // Search and select a yacht with add-ons
      cy.visit('/');
      cy.get('[data-cy=search-region]').select('dubai');
      cy.get('[data-cy=search-button]').click();
      
      // Find a yacht with add-ons (look for the add-ons badge)
      cy.get('[data-cy=yacht-card]').find('[data-cy=addon-badge]').first().parent().click();
      
      // Book now
      cy.get('[data-cy=book-now-button]').click();
      
      // Select booking date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      cy.get('[data-cy=booking-date-input]').click();
      cy.get('[data-cy=date-picker]').should('be.visible');
      cy.get(`[data-cy=calendar-day][data-date="${dateString}"]`).click();
      
      // Verify mandatory add-ons are shown
      cy.get('[data-cy=included-addons]').should('be.visible');
      
      // Select optional add-ons
      cy.get('[data-cy=optional-addons]').should('be.visible');
      cy.get('[data-cy=addon-checkbox]').first().check();
      
      // Verify price updated to include add-ons
      const basePrice = cy.get('[data-cy=base-price]').invoke('text').then(parseFloat);
      const addonPrice = cy.get('[data-cy=addon-price]').invoke('text').then(parseFloat);
      const totalPrice = cy.get('[data-cy=total-price]').invoke('text').then(parseFloat);
      
      cy.wrap(basePrice).then(base => {
        cy.wrap(addonPrice).then(addon => {
          cy.wrap(totalPrice).then(total => {
            expect(total).to.be.closeTo(base + addon, 0.01);
          });
        });
      });
      
      // Continue with payment
      cy.get('[data-cy=payment-method-credit_card]').click();
      
      // Fill credit card details
      cy.get('[data-cy=card-element]').within(() => {
        cy.get('iframe[title="Secure card payment input frame"]').then($iframe => {
          const body = $iframe.contents().find('body');
          cy.wrap(body).find('[name="cardnumber"]').type('4242424242424242');
          cy.wrap(body).find('[name="exp-date"]').type('1230');
          cy.wrap(body).find('[name="cvc"]').type('123');
        });
      });
      
      // Complete booking
      cy.get('[data-cy=complete-booking-button]').click();
      
      // Verify successful booking with add-ons
      cy.get('[data-cy=booking-confirmation]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-cy=addon-summary]').should('be.visible');
      cy.get('[data-cy=addon-item]').should('have.length.at.least', 1);
    });
  });
});