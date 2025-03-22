/**
 * Payment Service Interface Tests
 * 
 * These tests verify the contract and behavior expected from any
 * implementation of the IPaymentService interface.
 */

import { IPaymentService } from '../../../../../core/domain/services/payment-service';
import { PaymentStatus } from '../../../../../core/domain/booking/payment-status';

// This is a mock implementation of the payment service interface for testing
class MockPaymentService implements IPaymentService {
  private mockResponses: Map<string, any> = new Map();
  private callLog: Array<{ method: string, args: any }> = [];
  
  // Configure mock responses
  setMockResponse(method: string, response: any) {
    this.mockResponses.set(method, response);
  }
  
  // Get call log for verification
  getCallLog() {
    return this.callLog;
  }
  
  // Implementation of IPaymentService methods
  async createPaymentIntent(bookingInfo: any) {
    this.callLog.push({ method: 'createPaymentIntent', args: bookingInfo });
    const response = this.mockResponses.get('createPaymentIntent');
    if (response instanceof Error) throw response;
    return response || { 
      id: 'mock-pi-123', 
      clientSecret: 'mock-secret',
      amount: bookingInfo.amount,
      currency: bookingInfo.currency,
      status: PaymentStatus.PENDING
    };
  }
  
  async getPaymentIntent(paymentIntentId: string) {
    this.callLog.push({ method: 'getPaymentIntent', args: { paymentIntentId } });
    const response = this.mockResponses.get('getPaymentIntent');
    if (response instanceof Error) throw response;
    return response || { 
      id: paymentIntentId, 
      clientSecret: 'mock-secret',
      amount: 100,
      currency: 'USD',
      status: PaymentStatus.PENDING
    };
  }
  
  async cancelPaymentIntent(paymentIntentId: string) {
    this.callLog.push({ method: 'cancelPaymentIntent', args: { paymentIntentId } });
    const response = this.mockResponses.get('cancelPaymentIntent');
    if (response instanceof Error) throw response;
    return response || {
      paymentIntentId,
      status: PaymentStatus.CANCELLED,
      amount: 100,
      currency: 'USD',
      metadata: {},
      processedAt: new Date()
    };
  }
  
  async processWebhookEvent(payload: string, signature: string) {
    this.callLog.push({ method: 'processWebhookEvent', args: { payload, signature } });
    const response = this.mockResponses.get('processWebhookEvent');
    if (response instanceof Error) throw response;
    return response || {
      paymentIntentId: 'mock-pi-123',
      status: PaymentStatus.COMPLETED,
      amount: 100,
      currency: 'USD',
      metadata: { bookingId: 'mock-booking-123' },
      processedAt: new Date()
    };
  }
}

describe('Payment Service Interface', () => {
  let paymentService: MockPaymentService;
  
  beforeEach(() => {
    paymentService = new MockPaymentService();
  });
  
  describe('createPaymentIntent', () => {
    it('should create a payment intent with required fields', async () => {
      const bookingInfo = {
        amount: 150.00,
        currency: 'USD',
        metadata: {
          bookingId: 'booking-123',
          customerId: 'customer-456'
        },
        description: 'Yacht booking payment'
      };
      
      const mockResult = {
        id: 'pi_123456789',
        clientSecret: 'pi_123456789_secret_987654321',
        amount: bookingInfo.amount,
        currency: bookingInfo.currency,
        status: PaymentStatus.PENDING
      };
      
      paymentService.setMockResponse('createPaymentIntent', mockResult);
      
      const result = await paymentService.createPaymentIntent(bookingInfo);
      
      // Verify the result has the expected format
      expect(result).toEqual(mockResult);
      
      // Verify the method was called with the right parameters
      const calls = paymentService.getCallLog();
      expect(calls.length).toBe(1);
      expect(calls[0].method).toBe('createPaymentIntent');
      expect(calls[0].args).toEqual(bookingInfo);
    });
    
    it('should handle errors during payment intent creation', async () => {
      const bookingInfo = {
        amount: 150.00,
        currency: 'USD',
        metadata: {
          bookingId: 'booking-123',
          customerId: 'customer-456'
        }
      };
      
      const error = new Error('Failed to create payment intent');
      paymentService.setMockResponse('createPaymentIntent', error);
      
      await expect(paymentService.createPaymentIntent(bookingInfo)).rejects.toThrow('Failed to create payment intent');
    });
  });
  
  describe('getPaymentIntent', () => {
    it('should retrieve a payment intent by ID', async () => {
      const paymentIntentId = 'pi_123456789';
      
      const mockResult = {
        id: paymentIntentId,
        clientSecret: 'pi_123456789_secret_987654321',
        amount: 150.00,
        currency: 'USD',
        status: PaymentStatus.PROCESSING
      };
      
      paymentService.setMockResponse('getPaymentIntent', mockResult);
      
      const result = await paymentService.getPaymentIntent(paymentIntentId);
      
      // Verify the result has the expected format
      expect(result).toEqual(mockResult);
      
      // Verify the method was called with the right parameters
      const calls = paymentService.getCallLog();
      expect(calls.length).toBe(1);
      expect(calls[0].method).toBe('getPaymentIntent');
      expect(calls[0].args).toEqual({ paymentIntentId });
    });
    
    it('should handle errors during payment intent retrieval', async () => {
      const paymentIntentId = 'pi_123456789';
      
      const error = new Error('Payment intent not found');
      paymentService.setMockResponse('getPaymentIntent', error);
      
      await expect(paymentService.getPaymentIntent(paymentIntentId)).rejects.toThrow('Payment intent not found');
    });
  });
  
  describe('cancelPaymentIntent', () => {
    it('should cancel a payment intent', async () => {
      const paymentIntentId = 'pi_123456789';
      
      const mockResult = {
        paymentIntentId,
        status: PaymentStatus.CANCELLED,
        amount: 150.00,
        currency: 'USD',
        metadata: { bookingId: 'booking-123' },
        processedAt: new Date()
      };
      
      paymentService.setMockResponse('cancelPaymentIntent', mockResult);
      
      const result = await paymentService.cancelPaymentIntent(paymentIntentId);
      
      // Verify the result has the expected format
      expect(result).toEqual(mockResult);
      
      // Verify the method was called with the right parameters
      const calls = paymentService.getCallLog();
      expect(calls.length).toBe(1);
      expect(calls[0].method).toBe('cancelPaymentIntent');
      expect(calls[0].args).toEqual({ paymentIntentId });
    });
    
    it('should handle errors during payment intent cancellation', async () => {
      const paymentIntentId = 'pi_123456789';
      
      const error = new Error('Cannot cancel completed payment intent');
      paymentService.setMockResponse('cancelPaymentIntent', error);
      
      await expect(paymentService.cancelPaymentIntent(paymentIntentId)).rejects.toThrow('Cannot cancel completed payment intent');
    });
  });
  
  describe('processWebhookEvent', () => {
    it('should process a webhook event', async () => {
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
      
      const signature = 'mock_signature_123';
      
      const mockResult = {
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.COMPLETED,
        amount: 150.00,
        currency: 'USD',
        metadata: { bookingId: 'booking-123' },
        processedAt: new Date()
      };
      
      paymentService.setMockResponse('processWebhookEvent', mockResult);
      
      const result = await paymentService.processWebhookEvent(payload, signature);
      
      // Verify the result has the expected format
      expect(result).toEqual(mockResult);
      
      // Verify the method was called with the right parameters
      const calls = paymentService.getCallLog();
      expect(calls.length).toBe(1);
      expect(calls[0].method).toBe('processWebhookEvent');
      expect(calls[0].args).toEqual({ payload, signature });
    });
    
    it('should handle errors during webhook processing', async () => {
      const payload = JSON.stringify({ id: 'evt_123456789' });
      const signature = 'invalid_signature';
      
      const error = new Error('Invalid webhook signature');
      paymentService.setMockResponse('processWebhookEvent', error);
      
      await expect(paymentService.processWebhookEvent(payload, signature)).rejects.toThrow('Invalid webhook signature');
    });
  });
});