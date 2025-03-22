/**
 * Payment Service Factory Tests
 * 
 * Tests for the payment service factory in the adapters layer.
 */

import { createPaymentService, PaymentServiceFactory } from '../../../../adapters/payment/payment-service-factory';
import { StripePaymentService } from '../../../../adapters/payment/stripe-payment-service';
import { IPaymentService } from '../../../../core/domain/services/payment-service';

// Mock the Stripe payment service
jest.mock('../../../../adapters/payment/stripe-payment-service');

describe('Payment Service Factory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Reset environment variables
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.PAYMENT_PROVIDER;
  });
  
  describe('createPaymentService', () => {
    it('should create a Stripe payment service when PAYMENT_PROVIDER is "stripe"', () => {
      // Arrange
      process.env.PAYMENT_PROVIDER = 'stripe';
      process.env.STRIPE_SECRET_KEY = 'test_stripe_key';
      
      // Act
      const paymentService = createPaymentService();
      
      // Assert
      expect(paymentService).toBeInstanceOf(StripePaymentService);
      expect(StripePaymentService).toHaveBeenCalledWith('test_stripe_key');
    });
    
    it('should create a Stripe payment service as default when PAYMENT_PROVIDER is not specified', () => {
      // Arrange
      delete process.env.PAYMENT_PROVIDER;
      process.env.STRIPE_SECRET_KEY = 'test_stripe_key';
      
      // Act
      const paymentService = createPaymentService();
      
      // Assert
      expect(paymentService).toBeInstanceOf(StripePaymentService);
      expect(StripePaymentService).toHaveBeenCalledWith('test_stripe_key');
    });
    
    it('should throw an error when STRIPE_SECRET_KEY is missing for Stripe provider', () => {
      // Arrange
      process.env.PAYMENT_PROVIDER = 'stripe';
      delete process.env.STRIPE_SECRET_KEY;
      
      // Act & Assert
      expect(() => createPaymentService()).toThrow(
        'STRIPE_SECRET_KEY environment variable is required for Stripe payment provider'
      );
    });
    
    it('should throw an error for unsupported payment provider', () => {
      // Arrange
      process.env.PAYMENT_PROVIDER = 'unsupported_provider';
      
      // Act & Assert
      expect(() => createPaymentService()).toThrow(
        'Unsupported payment provider: unsupported_provider'
      );
    });
  });
  
  describe('PaymentServiceFactory', () => {
    it('should create a factory with a create method', () => {
      // Arrange
      const factory = new PaymentServiceFactory();
      
      // Assert
      expect(factory).toHaveProperty('create');
      expect(typeof factory.create).toBe('function');
    });
    
    it('should create a Stripe payment service through the factory', () => {
      // Arrange
      process.env.STRIPE_SECRET_KEY = 'test_stripe_key';
      const factory = new PaymentServiceFactory();
      
      // Act
      const paymentService = factory.create('stripe');
      
      // Assert
      expect(paymentService).toBeInstanceOf(StripePaymentService);
      expect(StripePaymentService).toHaveBeenCalledWith('test_stripe_key');
    });
    
    it('should throw an error for unsupported payment provider in factory', () => {
      // Arrange
      const factory = new PaymentServiceFactory();
      
      // Act & Assert
      expect(() => factory.create('unsupported_provider')).toThrow(
        'Unsupported payment provider: unsupported_provider'
      );
    });
    
    it('should create payment service with custom API key', () => {
      // Arrange
      const factory = new PaymentServiceFactory();
      const customApiKey = 'custom_api_key';
      
      // Act
      const paymentService = factory.create('stripe', customApiKey);
      
      // Assert
      expect(paymentService).toBeInstanceOf(StripePaymentService);
      expect(StripePaymentService).toHaveBeenCalledWith(customApiKey);
    });
  });
});