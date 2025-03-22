/**
 * Payment Flow End-to-End Tests
 * 
 * This file contains end-to-end tests for the payment flow through all layers
 * of the application's clean architecture.
 */

import express, { Express } from 'express';
import request from 'supertest';
import { StripePaymentService } from '../../adapters/payment/stripe-payment-service';
import { PaymentController } from '../../infrastructure/api/controllers/payment-controller';
import { registerPaymentRoutes } from '../../infrastructure/api/routes/payment-routes';
import { CreatePaymentIntentUseCase } from '../../core/application/use-cases/payment/create-payment-intent-use-case';
import { ProcessPaymentUseCase } from '../../core/application/use-cases/payment/process-payment-use-case';
import { CancelPaymentUseCase } from '../../core/application/use-cases/payment/cancel-payment-use-case';
import { IPaymentService } from '../../core/domain/services/payment-service';
import { PaymentStatus } from '../../core/domain/booking/payment-status';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      cancel: jest.fn(),
      update: jest.fn(),
      confirm: jest.fn()
    },
    webhooks: {
      constructEvent: jest.fn()
    }
  }));
});

describe('Payment Flow End-to-End', () => {
  let app: Express;
  let mockStripe: any;
  let paymentService: IPaymentService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked Stripe instance
    const Stripe = require('stripe');
    mockStripe = new Stripe();
    
    // Create the Express app
    app = express();
    app.use(express.json());
    
    // Set up middleware to simulate auth
    app.use((req, res, next) => {
      req.user = { uid: 'user-123', role: 'consumer' };
      next();
    });
    
    // Create the payment service with mocked Stripe
    paymentService = new StripePaymentService('test_key');
    (paymentService as any).stripe = mockStripe;
    
    // Create use cases
    const createPaymentIntentUseCase = new CreatePaymentIntentUseCase(paymentService);
    const processPaymentUseCase = new ProcessPaymentUseCase(paymentService);
    const cancelPaymentUseCase = new CancelPaymentUseCase(paymentService);
    
    // Create controller
    const paymentController = new PaymentController(
      createPaymentIntentUseCase,
      processPaymentUseCase,
      cancelPaymentUseCase
    );
    
    // Register routes
    registerPaymentRoutes(app, paymentController);
  });
  
  describe('Full payment flow', () => {
    it('should process a complete payment flow from creation to completion', async () => {
      // Arrange - Step 1: Mock payment intent creation
      const bookingData = {
        bookingId: 'booking-123',
        amount: 150.00,
        currency: 'USD',
        description: 'Luxury Yacht Booking'
      };
      
      const mockPaymentIntent = {
        id: 'pi_123456789',
        client_secret: 'pi_123456789_secret_987654321',
        amount: 15000, // Stripe uses cents
        currency: 'usd',
        status: 'requires_payment_method',
        metadata: { bookingId: 'booking-123' }
      };
      
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
      
      // Act - Step 1: Create payment intent
      const createResponse = await request(app)
        .post('/api/payments/intent')
        .send(bookingData);
      
      // Assert - Step 1
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.paymentIntent).toEqual({
        id: 'pi_123456789',
        clientSecret: 'pi_123456789_secret_987654321',
        amount: 150.00,
        currency: 'USD',
        status: PaymentStatus.PENDING
      });
      
      // Arrange - Step 2: Mock payment processing
      const paymentData = {
        paymentIntentId: 'pi_123456789',
        paymentMethodId: 'pm_987654321'
      };
      
      const mockProcessedPaymentIntent = {
        id: 'pi_123456789',
        amount: 15000,
        currency: 'usd',
        status: 'succeeded',
        metadata: { bookingId: 'booking-123' }
      };
      
      mockStripe.paymentIntents.confirm.mockResolvedValue(mockProcessedPaymentIntent);
      
      // Act - Step 2: Process payment
      const processResponse = await request(app)
        .post('/api/payments/process')
        .send(paymentData);
      
      // Assert - Step 2
      expect(processResponse.status).toBe(200);
      expect(processResponse.body.success).toBe(true);
      expect(processResponse.body.payment.status).toBe(PaymentStatus.COMPLETED);
      expect(processResponse.body.payment.paymentIntentId).toBe('pi_123456789');
      
      // Arrange - Step 3: Mock payment retrieval
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockProcessedPaymentIntent);
      
      // Act - Step 3: Retrieve payment intent
      const retrieveResponse = await request(app)
        .get('/api/payments/intent/pi_123456789');
      
      // Assert - Step 3
      expect(retrieveResponse.status).toBe(200);
      expect(retrieveResponse.body.success).toBe(true);
      expect(retrieveResponse.body.paymentIntent.id).toBe('pi_123456789');
      expect(retrieveResponse.body.paymentIntent.status).toBe(PaymentStatus.COMPLETED);
    });
    
    it('should handle a payment flow with cancellation', async () => {
      // Arrange - Step 1: Mock payment intent creation
      const bookingData = {
        bookingId: 'booking-123',
        amount: 150.00,
        currency: 'USD',
        description: 'Luxury Yacht Booking'
      };
      
      const mockPaymentIntent = {
        id: 'pi_123456789',
        client_secret: 'pi_123456789_secret_987654321',
        amount: 15000,
        currency: 'usd',
        status: 'requires_payment_method',
        metadata: { bookingId: 'booking-123' }
      };
      
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);
      
      // Act - Step 1: Create payment intent
      const createResponse = await request(app)
        .post('/api/payments/intent')
        .send(bookingData);
      
      // Assert - Step 1
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.success).toBe(true);
      
      // Arrange - Step 2: Mock payment cancellation
      const mockCancelledPaymentIntent = {
        id: 'pi_123456789',
        amount: 15000,
        currency: 'usd',
        status: 'canceled',
        canceled_at: 1616161616,
        metadata: { bookingId: 'booking-123' }
      };
      
      mockStripe.paymentIntents.cancel.mockResolvedValue(mockCancelledPaymentIntent);
      
      // Act - Step 2: Cancel payment
      const cancelResponse = await request(app)
        .post('/api/payments/intent/pi_123456789/cancel');
      
      // Assert - Step 2
      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.payment.status).toBe(PaymentStatus.CANCELLED);
    });
    
    it('should handle errors in the payment flow', async () => {
      // Arrange - Step 1: Mock payment intent creation with error
      const bookingData = {
        bookingId: 'booking-123',
        amount: -150.00, // Invalid amount
        currency: 'USD',
        description: 'Luxury Yacht Booking'
      };
      
      mockStripe.paymentIntents.create.mockRejectedValue(
        new Error('Invalid amount: amount must be at least 50 cents')
      );
      
      // Act - Step 1: Attempt to create payment intent with invalid data
      const createResponse = await request(app)
        .post('/api/payments/intent')
        .send(bookingData);
      
      // Assert - Step 1
      expect(createResponse.status).toBe(400);
      expect(createResponse.body.success).toBe(false);
      expect(createResponse.body.error).toContain('Invalid amount');
      
      // Arrange - Step 2: Mock payment processing with error
      const paymentData = {
        paymentIntentId: 'pi_123456789',
        paymentMethodId: 'pm_987654321'
      };
      
      mockStripe.paymentIntents.confirm.mockRejectedValue(
        new Error('No such payment intent: pi_123456789')
      );
      
      // Act - Step 2: Attempt to process non-existent payment
      const processResponse = await request(app)
        .post('/api/payments/process')
        .send(paymentData);
      
      // Assert - Step 2
      expect(processResponse.status).toBe(400);
      expect(processResponse.body.success).toBe(false);
      expect(processResponse.body.error).toContain('No such payment intent');
    });
  });
  
  describe('Webhook handling', () => {
    it('should process a payment webhook event', async () => {
      // Arrange
      const payload = JSON.stringify({
        id: 'evt_123456789',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123456789',
            amount: 15000,
            currency: 'usd',
            status: 'succeeded',
            metadata: { bookingId: 'booking-123' }
          }
        }
      });
      
      const signature = 'test_signature';
      
      const mockEvent = {
        id: 'evt_123456789',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123456789',
            amount: 15000,
            currency: 'usd',
            status: 'succeeded',
            metadata: { bookingId: 'booking-123' }
          }
        }
      };
      
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      
      // Act
      const response = await request(app)
        .post('/api/payments/webhook')
        .set('Stripe-Signature', signature)
        .send(payload)
        .type('text/plain');
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.received).toBe(true);
      
      // Verify Stripe API call
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        expect.any(String)
      );
    });
    
    it('should handle invalid webhook signatures', async () => {
      // Arrange
      const payload = JSON.stringify({});
      const signature = 'invalid_signature';
      
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });
      
      // Act
      const response = await request(app)
        .post('/api/payments/webhook')
        .set('Stripe-Signature', signature)
        .send(payload)
        .type('text/plain');
      
      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid signature');
    });
  });
});