/**
 * Stripe Payment Service Tests
 * 
 * Tests for the Stripe payment service adapter.
 */

import { StripePaymentService } from '../../../../adapters/payment/stripe-payment-service';
import { PaymentStatus } from '../../../../core/domain/booking/payment-status';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

describe('StripePaymentService', () => {
  // Mock data
  const apiKey = 'test_stripe_key';
  const webhookSecret = 'test_webhook_secret';
  const mockPaymentIntent = {
    id: 'pi_123456789',
    client_secret: 'pi_123456789_secret',
    amount: 5000, // $50.00
    currency: 'usd',
    status: 'requires_payment_method',
    metadata: {
      bookingId: 'test-booking-123'
    }
  };
  
  // Mock implementation of Stripe
  const mockStripe = {
    paymentIntents: {
      create: jest.fn().mockResolvedValue(mockPaymentIntent),
      retrieve: jest.fn().mockResolvedValue(mockPaymentIntent),
      cancel: jest.fn().mockResolvedValue({ ...mockPaymentIntent, status: 'canceled' })
    },
    webhooks: {
      constructEvent: jest.fn()
    }
  };
  
  // Setup
  let service: StripePaymentService;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set mock implementation
    (Stripe as unknown as jest.Mock).mockImplementation(() => mockStripe);
    
    // Create the service
    service = new StripePaymentService(apiKey, webhookSecret);
  });
  
  describe('createPaymentIntent', () => {
    it('should create a payment intent', async () => {
      // Arrange
      const bookingInfo = {
        amount: 50.00,
        currency: 'USD',
        metadata: {
          bookingId: 'test-booking-123',
          customerId: 'test-customer-123'
        },
        description: 'Test booking'
      };
      
      // Act
      const result = await service.createPaymentIntent(bookingInfo);
      
      // Assert
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 5000, // $50.00 converted to cents
        currency: 'usd',
        description: 'Test booking',
        metadata: bookingInfo.metadata
      });
      expect(result).toEqual({
        id: mockPaymentIntent.id,
        clientSecret: mockPaymentIntent.client_secret,
        amount: bookingInfo.amount,
        currency: bookingInfo.currency,
        status: PaymentStatus.PENDING
      });
    });
    
    it('should handle errors when creating a payment intent', async () => {
      // Arrange
      const bookingInfo = {
        amount: 50.00,
        currency: 'USD',
        metadata: {
          bookingId: 'test-booking-123'
        }
      };
      mockStripe.paymentIntents.create.mockRejectedValueOnce(new Error('Test error'));
      
      // Act & Assert
      await expect(service.createPaymentIntent(bookingInfo)).rejects.toThrow('Failed to create payment intent: Test error');
    });
  });
  
  describe('getPaymentIntent', () => {
    it('should retrieve a payment intent', async () => {
      // Arrange
      const paymentIntentId = 'pi_123456789';
      
      // Act
      const result = await service.getPaymentIntent(paymentIntentId);
      
      // Assert
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith(paymentIntentId);
      expect(result).toEqual({
        id: mockPaymentIntent.id,
        clientSecret: mockPaymentIntent.client_secret,
        amount: mockPaymentIntent.amount / 100,
        currency: mockPaymentIntent.currency.toUpperCase(),
        status: PaymentStatus.PENDING
      });
    });
    
    it('should handle errors when retrieving a payment intent', async () => {
      // Arrange
      const paymentIntentId = 'pi_123456789';
      mockStripe.paymentIntents.retrieve.mockRejectedValueOnce(new Error('Test error'));
      
      // Act & Assert
      await expect(service.getPaymentIntent(paymentIntentId)).rejects.toThrow('Failed to retrieve payment intent: Test error');
    });
  });
  
  describe('cancelPaymentIntent', () => {
    it('should cancel a payment intent', async () => {
      // Arrange
      const paymentIntentId = 'pi_123456789';
      
      // Act
      const result = await service.cancelPaymentIntent(paymentIntentId);
      
      // Assert
      expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith(paymentIntentId);
      expect(result).toEqual({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.CANCELLED,
        amount: mockPaymentIntent.amount / 100,
        currency: mockPaymentIntent.currency.toUpperCase(),
        metadata: mockPaymentIntent.metadata as Record<string, string>,
        processedAt: expect.any(Date)
      });
    });
    
    it('should handle errors when canceling a payment intent', async () => {
      // Arrange
      const paymentIntentId = 'pi_123456789';
      mockStripe.paymentIntents.cancel.mockRejectedValueOnce(new Error('Test error'));
      
      // Act & Assert
      await expect(service.cancelPaymentIntent(paymentIntentId)).rejects.toThrow('Failed to cancel payment intent: Test error');
    });
  });
  
  describe('processWebhookEvent', () => {
    // Mock webhook event data
    const webhookEvent = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_123456789',
          amount: 5000,
          currency: 'usd',
          status: 'succeeded',
          metadata: { bookingId: 'test-booking-123' }
        }
      }
    };
    
    beforeEach(() => {
      mockStripe.webhooks.constructEvent.mockReturnValue(webhookEvent);
    });
    
    it('should process a payment succeeded webhook event', async () => {
      // Arrange
      const signature = 'test_signature';
      const payload = JSON.stringify(webhookEvent);
      
      // Act
      const result = await service.processWebhookEvent(payload, signature);
      
      // Assert
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(payload, signature, webhookSecret);
      expect(result).toEqual({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.COMPLETED,
        amount: 50.00,
        currency: 'USD',
        metadata: { bookingId: 'test-booking-123' },
        processedAt: expect.any(Date)
      });
    });
    
    it('should handle errors when processing a webhook event', async () => {
      // Arrange
      const signature = 'test_signature';
      const payload = JSON.stringify(webhookEvent);
      mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });
      
      // Act & Assert
      await expect(service.processWebhookEvent(payload, signature)).rejects.toThrow('Failed to process webhook event: Invalid signature');
    });
  });
});