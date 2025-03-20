/**
 * Stripe Payment Integration Test Suite
 * 
 * This file contains tests for the Stripe payment integration.
 * It verifies that payment intents are created correctly and that
 * webhooks handle payment events properly.
 */
import { Express, Request, Response } from 'express';
import express from 'express';
import request from 'supertest';
import { Stripe } from 'stripe';

// Mock Stripe
jest.mock('stripe', () => {
  const mockStripeInstance = {
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test123456',
        client_secret: 'pi_test123456_secret_987654',
        amount: 5000,
        currency: 'usd',
        status: 'requires_payment_method'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test123456',
        amount: 5000,
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          bookingId: 'booking123',
          userId: 'user123',
          yachtId: 'yacht123'
        }
      })
    },
    webhooks: {
      constructEvent: jest.fn().mockImplementation((body, signature, secret) => {
        if (signature === 'invalid_signature') {
          throw new Error('Invalid signature');
        }
        
        return {
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test123456',
              amount: 5000,
              currency: 'usd',
              status: 'succeeded',
              metadata: {
                bookingId: 'booking123',
                userId: 'user123',
                yachtId: 'yacht123'
              }
            }
          }
        };
      })
    }
  };
  
  return jest.fn(() => mockStripeInstance);
});

// Mock Firebase Admin
jest.mock('../server/firebase-admin', () => {
  return {
    getFirestore: jest.fn(() => ({})),
    verifyAuth: jest.fn((req, res, next) => {
      req.user = { uid: 'test-user-id', role: 'consumer' };
      next();
    })
  };
});

// Mock Firestore
jest.mock('firebase/firestore', () => {
  return {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ 
            id: 'booking123',
            yachtId: 'yacht123',
            userId: 'user123',
            totalPrice: 50.00,
            status: 'pending'
          })
        }),
        update: jest.fn().mockResolvedValue({})
      })),
      where: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: 'booking123',
              data: () => ({ 
                id: 'booking123',
                yachtId: 'yacht123',
                userId: 'user123',
                totalPrice: 50.00,
                status: 'pending'
              })
            }
          ]
        })
      }))
    })),
    doc: jest.fn(() => ({
      set: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ id: 'test-doc' })
      })
    })),
    setDoc: jest.fn().mockResolvedValue({}),
    getDoc: jest.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({ id: 'test-doc' })
    }),
    addDoc: jest.fn().mockResolvedValue({ id: 'new-payment-id' }),
    updateDoc: jest.fn().mockResolvedValue({}),
    serverTimestamp: jest.fn(() => new Date())
  };
});

// Create Express App with Stripe Routes
function createApp() {
  const app = express();
  app.use(express.json());
  
  // Import stripe routes module
  const { registerStripeRoutes } = require('../server/stripe');
  
  // Register stripe routes
  registerStripeRoutes(app);
  
  return app;
}

describe('Stripe Payment Integration', () => {
  let app: Express;
  let stripeInstance;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create Express app with stripe routes
    app = createApp();
    
    // Get the mocked Stripe instance
    stripeInstance = new Stripe('test_key', { apiVersion: '2022-11-15' });
  });
  
  describe('POST /api/create-payment-intent', () => {
    it('should create a payment intent for a valid booking', async () => {
      const bookingData = {
        bookingId: 'booking123',
        yachtId: 'yacht123',
        totalAmount: 50.00,
        currency: 'usd'
      };
      
      const response = await request(app)
        .post('/api/create-payment-intent')
        .send(bookingData)
        .expect(200);
      
      // Verify response contains expected data
      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body.clientSecret).toBe('pi_test123456_secret_987654');
      
      // Verify Stripe was called with correct parameters
      expect(stripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000, // $50.00 converted to cents
          currency: 'usd',
          metadata: expect.objectContaining({
            bookingId: 'booking123',
            yachtId: 'yacht123'
          })
        })
      );
    });
    
    it('should return 400 if required booking data is missing', async () => {
      const invalidData = {
        // Missing bookingId and yachtId
        totalAmount: 50.00,
        currency: 'usd'
      };
      
      const response = await request(app)
        .post('/api/create-payment-intent')
        .send(invalidData)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(stripeInstance.paymentIntents.create).not.toHaveBeenCalled();
    });
    
    it('should return 400 if amount is invalid', async () => {
      const invalidData = {
        bookingId: 'booking123',
        yachtId: 'yacht123',
        totalAmount: -50.00, // Negative amount
        currency: 'usd'
      };
      
      const response = await request(app)
        .post('/api/create-payment-intent')
        .send(invalidData)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(stripeInstance.paymentIntents.create).not.toHaveBeenCalled();
    });
  });
  
  describe('POST /api/webhook', () => {
    it('should process a valid payment_intent.succeeded event', async () => {
      const webhookBody = JSON.stringify({
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123456',
            amount: 5000,
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              bookingId: 'booking123',
              userId: 'user123',
              yachtId: 'yacht123'
            }
          }
        }
      });
      
      const response = await request(app)
        .post('/api/webhook')
        .set('stripe-signature', 'valid_signature')
        .send(webhookBody)
        .expect(200);
      
      expect(response.text).toBe('Webhook received');
      expect(stripeInstance.webhooks.constructEvent).toHaveBeenCalled();
    });
    
    it('should return 400 for invalid signature', async () => {
      const webhookBody = JSON.stringify({
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123456'
          }
        }
      });
      
      // Mock constructEvent to throw on invalid signature
      stripeInstance.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });
      
      const response = await request(app)
        .post('/api/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send(webhookBody)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('should return 200 but not process unhandled event types', async () => {
      // Mock constructEvent to return a different event type
      stripeInstance.webhooks.constructEvent.mockImplementationOnce(() => ({
        type: 'payment_intent.created',
        data: {
          object: {
            id: 'pi_test123456'
          }
        }
      }));
      
      const webhookBody = JSON.stringify({
        id: 'evt_test123',
        type: 'payment_intent.created',
        data: {
          object: {
            id: 'pi_test123456'
          }
        }
      });
      
      const response = await request(app)
        .post('/api/webhook')
        .set('stripe-signature', 'valid_signature')
        .send(webhookBody)
        .expect(200);
      
      expect(response.text).toBe('Webhook received');
    });
  });
  
  describe('Payment Workflow Integration', () => {
    it('should handle the complete payment workflow', async () => {
      // 1. Create payment intent
      const bookingData = {
        bookingId: 'booking123',
        yachtId: 'yacht123',
        totalAmount: 50.00,
        currency: 'usd'
      };
      
      const createResponse = await request(app)
        .post('/api/create-payment-intent')
        .send(bookingData)
        .expect(200);
      
      expect(createResponse.body).toHaveProperty('clientSecret');
      
      // 2. Simulate webhook for successful payment
      const webhookBody = JSON.stringify({
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123456',
            amount: 5000,
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              bookingId: 'booking123',
              userId: 'user123',
              yachtId: 'yacht123'
            }
          }
        }
      });
      
      const webhookResponse = await request(app)
        .post('/api/webhook')
        .set('stripe-signature', 'valid_signature')
        .send(webhookBody)
        .expect(200);
      
      expect(webhookResponse.text).toBe('Webhook received');
      
      // Verify the flow handles the payment properly
      // Note: In a real implementation, we would verify that:
      // 1. The booking status is updated
      // 2. A payment record is created
      // 3. A confirmation email is sent
    });
  });
});