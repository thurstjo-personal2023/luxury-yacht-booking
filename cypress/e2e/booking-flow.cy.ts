/**
 * Yacht Booking Flow E2E Tests
 * 
 * These tests verify the complete user journey for booking a yacht,
 * from browsing available yachts to completing the payment.
 */
describe('Yacht Booking User Journey', () => {
  beforeEach(() => {
    // Reset application state before each test
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/');
  });
  
  it('should allow guests to browse yachts without logging in', () => {
    // Verify homepage loads with featured yachts
    cy.get('[data-cy=featured-yachts]').should('exist');
    cy.get('[data-cy=yacht-card]').should('have.length.at.least', 1);
    
    // Search for yachts
    cy.searchYachts({
      location: 'Dubai',
      guests: 4
    });
    
    // Verify search results appear
    cy.get('[data-cy=search-results]').should('exist');
    cy.get('[data-cy=yacht-card]').should('have.length.at.least', 1);
    
    // View yacht details
    cy.get('[data-cy=yacht-card]').first().click();
    
    // Verify details page loads
    cy.get('[data-cy=yacht-details]').should('exist');
    cy.get('[data-cy=yacht-title]').should('exist');
    cy.get('[data-cy=yacht-price]').should('exist');
    
    // Try to book (should redirect to login)
    cy.get('[data-cy=book-now-button]').click();
    
    // Verify redirect to login
    cy.url().should('include', '/login');
  });
  
  it('should allow registered users to complete the booking process', () => {
    // Load test user data
    cy.fixture('users').then((users) => {
      // Login as consumer
      cy.login(users.consumer.email, users.consumer.password);
      
      // Verify login success
      cy.get('[data-cy=user-menu]').should('exist');
      
      // Search for yachts
      cy.searchYachts({
        location: 'Dubai',
        guests: 2
      });
      
      // Select first yacht from results
      cy.get('[data-cy=yacht-card]').first().click();
      
      // Verify details page and book button
      cy.get('[data-cy=yacht-details]').should('exist');
      cy.get('[data-cy=book-now-button]').should('exist').click();
      
      // Select booking date and guests
      cy.get('[data-cy=date-picker]').click();
      cy.get('.day:not(.disabled)').first().click();
      cy.get('[data-cy=guest-select]').select('2');
      
      // Proceed to checkout
      cy.get('[data-cy=proceed-to-checkout]').click();
      
      // Fill payment details (using test credit card)
      cy.getStripeElement('cardNumber').type('4242424242424242');
      cy.getStripeElement('cardExpiry').type('1230');
      cy.getStripeElement('cardCvc').type('123');
      cy.get('[data-cy=name-on-card]').type(users.consumer.name);
      
      // Complete payment
      cy.get('[data-cy=complete-payment-button]').click();
      
      // Verify booking confirmation
      cy.get('[data-cy=booking-confirmation]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-cy=booking-reference]').should('exist');
      
      // Check booking appears in user's bookings
      cy.visit('/user/bookings');
      cy.get('[data-cy=booking-list]').should('exist');
      cy.get('[data-cy=booking-item]').should('have.length.at.least', 1);
    });
  });
  
  it('should handle validation for booking form', () => {
    // Load test user data
    cy.fixture('users').then((users) => {
      // Login as consumer
      cy.login(users.consumer.email, users.consumer.password);
      
      // Navigate to a yacht details page
      cy.visit('/yacht/yacht-123');
      
      // Try to book without selecting date
      cy.get('[data-cy=book-now-button]').click();
      cy.get('[data-cy=proceed-to-checkout]').click();
      
      // Verify validation errors
      cy.get('[data-cy=date-error]').should('be.visible');
      
      // Fix the date and proceed
      cy.get('[data-cy=date-picker]').click();
      cy.get('.day:not(.disabled)').first().click();
      
      // Try to proceed with invalid guest count
      cy.get('[data-cy=guest-select]').select('0');
      cy.get('[data-cy=proceed-to-checkout]').click();
      
      // Verify validation error for guests
      cy.get('[data-cy=guests-error]').should('be.visible');
    });
  });
  
  it('should display unavailable dates correctly', () => {
    cy.visit('/yacht/yacht-with-bookings');
    
    // Open date picker
    cy.get('[data-cy=date-picker]').click();
    
    // Verify some dates are marked as unavailable
    cy.get('.day.disabled').should('exist');
    
    // Verify tooltip shows "Unavailable" on disabled dates
    cy.get('.day.disabled').first().trigger('mouseover');
    cy.get('.tooltip').should('contain', 'Unavailable');
  });
  
  it('should filter search results based on applied filters', () => {
    // Search with specific filters
    cy.searchYachts({
      location: 'Abu Dhabi',
      guests: 6
    });
    
    // Apply additional filter: price range
    cy.get('[data-cy=price-filter]').click();
    cy.get('[data-cy=price-slider]').invoke('val', 50).trigger('change');
    cy.get('[data-cy=apply-filters]').click();
    
    // Verify filtered results
    cy.get('[data-cy=yacht-card]').should('exist');
    cy.get('[data-cy=yacht-price]').each(($price) => {
      // Convert price text to number and verify it's in range
      const price = parseInt($price.text().replace(/[^0-9]/g, ''));
      expect(price).to.be.at.most(5000); // Assuming max value is 5000
    });
    
    // Apply yacht type filter
    cy.get('[data-cy=yacht-type-filter]').click();
    cy.get('[data-cy=yacht-type-option]').contains('Luxury').click();
    cy.get('[data-cy=apply-filters]').click();
    
    // Verify filtered results contain luxury yachts
    cy.get('[data-cy=yacht-card]').should('exist');
    cy.get('[data-cy=yacht-type]').each(($type) => {
      expect($type.text()).to.include('Luxury');
    });
  });
});