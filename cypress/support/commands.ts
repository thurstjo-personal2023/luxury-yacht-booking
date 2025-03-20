/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { UserRoleType } from '../../shared/user-schema';

// Initialize Firebase app for testing
let firebaseApp: firebase.app.App;

// Authentication commands
Cypress.Commands.add('initializeFirebase', () => {
  if (!firebaseApp) {
    const config = Cypress.env('firebase');
    
    if (!config) {
      throw new Error('Firebase config is missing in Cypress environment');
    }
    
    firebaseApp = firebase.initializeApp(config);
  }
  
  return firebaseApp;
});

Cypress.Commands.add('login', (email: string, password: string) => {
  const app = cy.initializeFirebase();
  
  return firebase
    .auth()
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      return userCredential.user?.getIdToken(true).then((token) => {
        window.localStorage.setItem('authToken', token);
        return userCredential;
      });
    });
});

Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('authToken');
  });
  
  return firebase.auth().signOut();
});

Cypress.Commands.add('createTestUser', (options: {
  email: string;
  password: string;
  role: UserRoleType;
  name: string;
  phone?: string;
}) => {
  // This would typically interact with a test API endpoint to create a user
  // For testing purposes, we'll use a custom endpoint
  return cy.request({
    method: 'POST',
    url: '/api/test/create-user',
    body: {
      email: options.email,
      password: options.password,
      name: options.name,
      role: options.role,
      phone: options.phone || '1234567890'
    }
  });
});

// Yacht booking flow commands
Cypress.Commands.add('searchYachts', (filters: {
  location?: string;
  date?: string;
  guests?: number;
}) => {
  cy.visit('/');
  
  if (filters.location) {
    cy.get('[data-cy=location-filter]').type(filters.location);
  }
  
  if (filters.date) {
    cy.get('[data-cy=date-filter]').type(filters.date);
  }
  
  if (filters.guests) {
    cy.get('[data-cy=guests-filter]').clear().type(filters.guests.toString());
  }
  
  cy.get('[data-cy=search-button]').click();
});

Cypress.Commands.add('selectYacht', (yachtId: string) => {
  cy.get(`[data-cy=yacht-card-${yachtId}]`).click();
});

Cypress.Commands.add('completeBooking', (paymentInfo: {
  cardNumber: string;
  expiry: string;
  cvc: string;
  name: string;
}) => {
  // Select date and time
  cy.get('[data-cy=date-picker]').click();
  cy.get('.day:not(.disabled)').first().click();
  
  // Select guests
  cy.get('[data-cy=guest-select]').click();
  cy.get('[data-cy=guest-option-2]').click();
  
  // Click Book Now button
  cy.get('[data-cy=book-now-button]').click();
  
  // Fill payment information (assuming Stripe Elements are used)
  cy.getStripeElement('cardNumber').type(paymentInfo.cardNumber);
  cy.getStripeElement('cardExpiry').type(paymentInfo.expiry);
  cy.getStripeElement('cardCvc').type(paymentInfo.cvc);
  cy.get('[data-cy=name-on-card]').type(paymentInfo.name);
  
  // Complete payment
  cy.get('[data-cy=complete-payment-button]').click();
  
  // Wait for confirmation
  cy.get('[data-cy=booking-confirmation]', { timeout: 10000 }).should('be.visible');
});

// Custom command to interact with Stripe Elements in iframes
Cypress.Commands.add('getStripeElement', (fieldName: string) => {
  cy.get(`[data-cy=${fieldName}] iframe`).then($iframe => {
    const body = $iframe.contents().find('body');
    cy.wrap(body).find('.InputElement').as('stripeInput');
    cy.get('@stripeInput');
  });
});

// Custom command for admin actions
Cypress.Commands.add('adminLogin', () => {
  return cy.login('admin@example.com', 'adminPassword');
});

Cypress.Commands.add('navigateToAdminPanel', () => {
  cy.visit('/admin');
});

// Producer dashboard commands
Cypress.Commands.add('producerLogin', () => {
  return cy.login('producer@example.com', 'producerPassword');
});

Cypress.Commands.add('navigateToProducerDashboard', () => {
  cy.visit('/producer/dashboard');
});

Cypress.Commands.add('createYachtListing', (yachtData: any) => {
  cy.navigateToProducerDashboard();
  cy.get('[data-cy=create-yacht-button]').click();
  
  // Fill in yacht details
  cy.get('[data-cy=yacht-title]').type(yachtData.title);
  cy.get('[data-cy=yacht-description]').type(yachtData.description);
  cy.get('[data-cy=yacht-price]').type(yachtData.price.toString());
  cy.get('[data-cy=yacht-capacity]').type(yachtData.capacity.toString());
  
  // Upload image (if needed)
  if (yachtData.image) {
    cy.get('[data-cy=upload-image]').attachFile(yachtData.image);
  }
  
  // Submit form
  cy.get('[data-cy=submit-yacht-button]').click();
});

// Declare global Cypress namespace to add custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      initializeFirebase(): Chainable<firebase.app.App>;
      login(email: string, password: string): Chainable<firebase.auth.UserCredential>;
      logout(): Chainable<void>;
      createTestUser(options: { email: string; password: string; role: UserRoleType; name: string; phone?: string }): Chainable<any>;
      searchYachts(filters: { location?: string; date?: string; guests?: number }): Chainable<void>;
      selectYacht(yachtId: string): Chainable<void>;
      completeBooking(paymentInfo: { cardNumber: string; expiry: string; cvc: string; name: string }): Chainable<void>;
      getStripeElement(fieldName: string): Chainable<JQuery<HTMLElement>>;
      adminLogin(): Chainable<firebase.auth.UserCredential>;
      navigateToAdminPanel(): Chainable<void>;
      producerLogin(): Chainable<firebase.auth.UserCredential>;
      navigateToProducerDashboard(): Chainable<void>;
      createYachtListing(yachtData: any): Chainable<void>;
    }
  }
}