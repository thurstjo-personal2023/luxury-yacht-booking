/**
 * Cypress Custom Commands
 * 
 * This file contains custom commands that extend Cypress functionality
 * for the Etoile Yachts testing suite.
 */

// Declare the Cypress namespace to add custom commands
declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to log in a user with email and password
     * @param email - User's email
     * @param password - User's password
     * @example cy.login('user@example.com', 'password123')
     */
    login(email: string, password: string): Chainable<Element>;
    
    /**
     * Custom command to log out the current user
     * @example cy.logout()
     */
    logout(): Chainable<Element>;
    
    /**
     * Custom command to select a date in the date picker
     * @param selector - CSS selector for the date input
     * @param date - Date to select (YYYY-MM-DD format)
     * @example cy.selectDate('[data-cy=booking-date]', '2025-04-15')
     */
    selectDate(selector: string, date: string): Chainable<Element>;
    
    /**
     * Custom command to verify a yacht card exists with the given name
     * @param name - Name of the yacht to find
     * @example cy.findYachtByName('Luxury Yacht 1')
     */
    findYachtByName(name: string): Chainable<Element>;
    
    /**
     * Custom command to complete a booking process for a yacht
     * @param yachtName - Name of the yacht to book
     * @param startDate - Start date for the booking (YYYY-MM-DD format)
     * @param paymentMethod - Payment method to use ('credit_card' or 'digital_wallet')
     * @example cy.completeBooking('Luxury Yacht 1', '2025-04-15', 'credit_card')
     */
    completeBooking(yachtName: string, startDate: string, paymentMethod: 'credit_card' | 'digital_wallet'): Chainable<Element>;
    
    /**
     * Custom command to create a new yacht listing (for producer tests)
     * @param yachtData - Yacht data object with required fields
     * @example cy.createYacht({ name: 'New Yacht', capacity: 10, price: 1000 })
     */
    createYacht(yachtData: object): Chainable<Element>;
  }
}

// Login command implementation
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('[data-cy=login-email]').type(email);
  cy.get('[data-cy=login-password]').type(password);
  cy.get('[data-cy=login-submit]').click();
  cy.get('[data-cy=user-menu]', { timeout: 10000 }).should('be.visible');
});

// Logout command implementation
Cypress.Commands.add('logout', () => {
  cy.get('[data-cy=user-menu]').click();
  cy.get('[data-cy=logout-button]').click();
  cy.get('[data-cy=login-button]', { timeout: 5000 }).should('be.visible');
});

// Select date in date picker
Cypress.Commands.add('selectDate', (selector, dateString) => {
  // Click on the date input to open the date picker
  cy.get(selector).click();
  
  // Parse the date string
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.toLocaleString('default', { month: 'long' });
  const day = date.getDate();
  
  // Navigate to the correct month and year
  cy.get('[data-cy=date-picker-month-dropdown]').select(month);
  cy.get('[data-cy=date-picker-year-dropdown]').select(year.toString());
  
  // Click on the day
  cy.get(`[data-cy=date-picker-day-${day}]`).click();
});

// Find yacht by name
Cypress.Commands.add('findYachtByName', (name) => {
  cy.get('[data-cy=yacht-card]').contains(name).closest('[data-cy=yacht-card]');
});

// Complete a booking process
Cypress.Commands.add('completeBooking', (yachtName, startDate, paymentMethod) => {
  // Find yacht and click on it
  cy.findYachtByName(yachtName).click();
  
  // On yacht details page, click book now
  cy.get('[data-cy=book-now-button]').click();
  
  // Set booking date
  cy.selectDate('[data-cy=booking-date-input]', startDate);
  
  // Select payment method
  cy.get(`[data-cy=payment-method-${paymentMethod}]`).click();
  
  // If credit card, fill in details
  if (paymentMethod === 'credit_card') {
    cy.get('[data-cy=card-number]').type('4242424242424242');
    cy.get('[data-cy=card-expiry]').type('1230');
    cy.get('[data-cy=card-cvc]').type('123');
    cy.get('[data-cy=card-name]').type('Test User');
  }
  
  // Complete booking
  cy.get('[data-cy=complete-booking-button]').click();
  
  // Verify booking confirmation
  cy.get('[data-cy=booking-confirmation]', { timeout: 10000 }).should('be.visible');
});

// Create a yacht listing (for producer tests)
Cypress.Commands.add('createYacht', (yachtData) => {
  // Navigate to producer dashboard
  cy.visit('/producer/dashboard');
  
  // Click create yacht button
  cy.get('[data-cy=create-yacht-button]').click();
  
  // Fill yacht form with the provided data
  if (yachtData.title) {
    cy.get('[data-cy=yacht-title]').type(yachtData.title);
  }
  
  if (yachtData.description) {
    cy.get('[data-cy=yacht-description]').type(yachtData.description);
  }
  
  if (yachtData.category) {
    cy.get('[data-cy=yacht-category]').select(yachtData.category);
  }
  
  if (yachtData.capacity) {
    cy.get('[data-cy=yacht-capacity]').type(yachtData.capacity.toString());
  }
  
  if (yachtData.duration) {
    cy.get('[data-cy=yacht-duration]').type(yachtData.duration.toString());
  }
  
  if (yachtData.pricing) {
    cy.get('[data-cy=yacht-pricing]').type(yachtData.pricing.toString());
  }
  
  if (yachtData.location) {
    if (yachtData.location.region) {
      cy.get('[data-cy=yacht-region]').select(yachtData.location.region);
    }
    if (yachtData.location.portMarina) {
      cy.get('[data-cy=yacht-port-marina]').select(yachtData.location.portMarina);
    }
    if (yachtData.location.address) {
      cy.get('[data-cy=yacht-address]').type(yachtData.location.address);
    }
  }
  
  // Upload yacht image if provided
  if (yachtData.imageFile) {
    cy.get('[data-cy=yacht-image-upload]').attachFile(yachtData.imageFile);
  }
  
  // Submit the form
  cy.get('[data-cy=save-yacht-button]').click();
  
  // Verify success message
  cy.get('[data-cy=yacht-created-success]', { timeout: 10000 }).should('be.visible');
});

// Add these commands to the global Cypress object
export {};