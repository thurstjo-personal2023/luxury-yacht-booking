/**
 * Stripe Payment Service Integration Tests
 * 
 * Tests the integration between our payment service adapter and the Stripe API
 */

import { StripePaymentService } from '../../adapters/payment/stripe-payment-service';
import { PaymentStatus } from '../../core/domain/booking/payment-status';
import { IPaymentService } from '../../core/domain/services/payment-service';

// Mock Stripe library
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

describe('Stripe Payment Service Integration', () => {
  let paymentService: IPaymentService;
  let mockStripe: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked Stripe instance
    const Stripe = require('stripe');
    mockStripe = new Stripe();
    
    // Create the payment service with the mock
    paymentService = new StripePaymentService('test_key');
    
    // Set direct access to the mock for verification
    (paymentService as any).stripe = mockStripe;
  });
  
  describe('createPaymentIntent', () => {
    it('should create a payment intent through Stripe API', async () => {
      // Arrange
      const bookingInfo = {
        bookingId: 'booking-123',
        amount: 150.00,
        currency: 'USD',
        description: 'Luxury Yacht Booking'
      };
      
      const mockStripeResponse = {
        id: 'pi_123456789',
        client_secret: 'pi_123456789_secret_987654321',
        amount: 15000, // Stripe uses cents
        currency: 'usd',
        status: 'requires_payment_method',
        metadata: { bookingId: 'booking-123' }
      };
      
      mockStripe.paymentIntents.create.mockResolvedValue(mockStripeResponse);
      
      // Act
      const result = await paymentService.createPaymentIntent(bookingInfo);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.paymentIntent).toEqual({
        id: 'pi_123456789',
        clientSecret: 'pi_123456789_secret_987654321',
        amount: 150.00, // Our service converts from cents
        currency: 'USD',
        status: PaymentStatus.PENDING
      });
      
      // Verify Stripe API call
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 15000, // Should convert to cents
        currency: 'usd',
        description: 'Luxury Yacht Booking',
        metadata: { bookingId: 'booking-123' }
      });
    });
    
    it('should handle Stripe API errors', async () => {
      // Arrange
      const bookingInfo = {
        bookingId: 'booking-123',
        amount: 150.00,
        currency: 'USD'
      };
      
      mockStripe.paymentIntents.create.mockRejectedValue(
        new Error('Invalid currency')
      );
      
      // Act
      const result = await paymentService.createPaymentIntent(bookingInfo);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid currency/);
      expect(result.paymentIntent).toBeNull();
    });
  });
  
  describe('getPaymentIntent', () => {
    it('should retrieve a payment intent from Stripe API', async () => {
      // Arrange
      const paymentIntentId = 'pi_123456789';
      
      const mockStripeResponse = {
        id: paymentIntentId,
        client_secret: 'pi_123456789_secret_987654321',
        amount: 15000,
        currency: 'usd',
        status: 'succeeded',
        metadata: { bookingId: 'booking-123' }
      };
      
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockStripeResponse);
      
      // Act
      const result = await paymentService.getPaymentIntent(paymentIntentId);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.paymentIntent).toEqual({
        id: paymentIntentId,
        clientSecret: 'pi_123456789_secret_987654321',
        amount: 150.00,
        currency: 'USD',
        status: PaymentStatus.COMPLETED
      });
      
      // Verify Stripe API call
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith(paymentIntentId);
    });
    
    it('should handle non-existent payment intent', async () => {
      // Arrange
      const paymentIntentId = 'pi_nonexistent';
      
      mockStripe.paymentIntents.retrieve.mockRejectedValue(
        new Error('No such payment intent')
      );
      
      // Act
      const result = await paymentService.getPaymentIntent(paymentIntentId);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No such payment intent/);
      expect(result.paymentIntent).toBeNull();
    });
  });
  
  describe('cancelPayment', () => {
    it('should cancel a payment intent through Stripe API', async () => {
      // Arrange
      const paymentIntentId = 'pi_123456789';
      
      const mockStripeResponse = {
        id: paymentIntentId,
        amount: 15000,
        currency: 'usd',
        status: 'canceled',
        canceled_at: 1616161616,
        metadata: { bookingId: 'booking-123' }
      };
      
      mockStripe.paymentIntents.cancel.mockResolvedValue(mockStripeResponse);
      
      // Act
      const result = await paymentService.cancelPaymentIntent(paymentIntentId);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.payment).toEqual({
        paymentIntentId,
        status: PaymentStatus.CANCELLED,
        amount: 150.00,
        currency: 'USD',
        metadata: { bookingId: 'booking-123' }
      });
      
      // Verify Stripe API call
      expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith(paymentIntentId);
    });
    
    it('should handle cancelation errors', async () => {
      // Arrange
      const paymentIntentId = 'pi_123456789';
      
      mockStripe.paymentIntents.cancel.mockRejectedValue(
        new Error('Payment intent cannot be canceled because it is already succeeded')
      );
      
      // Act
      const result = await paymentService.cancelPaymentIntent(paymentIntentId);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/already succeeded/);
      expect(result.payment).toBeNull();
    });
  });
  
  describe('processWebhookEvent', () => {
    it('should process a webhook event correctly', async () => {
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
      const result = await paymentService.processWebhookEvent(payload, signature);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.event).toEqual({
        id: 'evt_123456789',
        type: 'payment_intent.succeeded',
        paymentIntent: {
          id: 'pi_123456789',
          amount: 150.00,
          currency: 'USD',
          status: PaymentStatus.COMPLETED,
          metadata: { bookingId: 'booking-123' }
        }
      });
      
      // Verify Stripe API call
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        expect.any(String) // This is the webhook secret
      );
    });
    
    it('should handle invalid webhook signatures', async () => {
      // Arrange
      const payload = '{}';
      const signature = 'invalid_signature';
      
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });
      
      // Act
      const result = await paymentService.processWebhookEvent(payload, signature);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid signature/);
      expect(result.event).toBeNull();
    });
  });
});