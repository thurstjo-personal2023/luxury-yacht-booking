/**
 * Payment Details Tests
 * 
 * Tests for the PaymentDetails value object in the domain layer.
 */

import { PaymentDetails } from '../../../../../core/domain/booking/payment-details';
import { PaymentStatus } from '../../../../../core/domain/booking/payment-status';

describe('PaymentDetails', () => {
  describe('constructor', () => {
    it('should create a valid payment details object with minimum required fields', () => {
      const paymentDetails = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 100.0,
        currency: 'USD'
      });
      
      expect(paymentDetails).toBeDefined();
      expect(paymentDetails.paymentIntentId).toBe('pi_123456789');
      expect(paymentDetails.status).toBe(PaymentStatus.PENDING);
      expect(paymentDetails.amount).toBe(100.0);
      expect(paymentDetails.currency).toBe('USD');
      expect(paymentDetails.processingDate).toBeUndefined();
      expect(paymentDetails.metadata).toEqual({});
    });
    
    it('should create a payment details object with all fields', () => {
      const processingDate = new Date();
      const metadata = { bookingId: 'booking_123', customerId: 'customer_123' };
      
      const paymentDetails = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.COMPLETED,
        amount: 150.0,
        currency: 'EUR',
        processingDate,
        metadata
      });
      
      expect(paymentDetails).toBeDefined();
      expect(paymentDetails.paymentIntentId).toBe('pi_123456789');
      expect(paymentDetails.status).toBe(PaymentStatus.COMPLETED);
      expect(paymentDetails.amount).toBe(150.0);
      expect(paymentDetails.currency).toBe('EUR');
      expect(paymentDetails.processingDate).toBe(processingDate);
      expect(paymentDetails.metadata).toEqual(metadata);
    });
    
    it('should throw error when paymentIntentId is not provided', () => {
      expect(() => new PaymentDetails({
        paymentIntentId: '',
        status: PaymentStatus.PENDING,
        amount: 100.0,
        currency: 'USD'
      })).toThrow('Payment intent ID is required');
    });
    
    it('should throw error when status is not provided', () => {
      expect(() => new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: '' as any,
        amount: 100.0,
        currency: 'USD'
      })).toThrow('Payment status is required');
    });
    
    it('should throw error when amount is invalid', () => {
      expect(() => new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: -10.0,
        currency: 'USD'
      })).toThrow('Amount must be a positive number');
      
      expect(() => new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 0,
        currency: 'USD'
      })).toThrow('Amount must be a positive number');
    });
    
    it('should throw error when currency is not provided', () => {
      expect(() => new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 100.0,
        currency: ''
      })).toThrow('Currency is required');
    });
  });
  
  describe('isCompleted', () => {
    it('should return true when payment status is COMPLETED', () => {
      const paymentDetails = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.COMPLETED,
        amount: 100.0,
        currency: 'USD'
      });
      
      expect(paymentDetails.isCompleted()).toBe(true);
    });
    
    it('should return false when payment status is not COMPLETED', () => {
      const pendingPayment = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 100.0,
        currency: 'USD'
      });
      
      const processingPayment = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PROCESSING,
        amount: 100.0,
        currency: 'USD'
      });
      
      const cancelledPayment = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.CANCELLED,
        amount: 100.0,
        currency: 'USD'
      });
      
      expect(pendingPayment.isCompleted()).toBe(false);
      expect(processingPayment.isCompleted()).toBe(false);
      expect(cancelledPayment.isCompleted()).toBe(false);
    });
  });
  
  describe('isCancelled', () => {
    it('should return true when payment status is CANCELLED', () => {
      const paymentDetails = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.CANCELLED,
        amount: 100.0,
        currency: 'USD'
      });
      
      expect(paymentDetails.isCancelled()).toBe(true);
    });
    
    it('should return false when payment status is not CANCELLED', () => {
      const pendingPayment = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 100.0,
        currency: 'USD'
      });
      
      const completedPayment = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.COMPLETED,
        amount: 100.0,
        currency: 'USD'
      });
      
      expect(pendingPayment.isCancelled()).toBe(false);
      expect(completedPayment.isCancelled()).toBe(false);
    });
  });
  
  describe('isFailed', () => {
    it('should return true when payment status is FAILED', () => {
      const paymentDetails = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.FAILED,
        amount: 100.0,
        currency: 'USD'
      });
      
      expect(paymentDetails.isFailed()).toBe(true);
    });
    
    it('should return false when payment status is not FAILED', () => {
      const pendingPayment = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 100.0,
        currency: 'USD'
      });
      
      const completedPayment = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.COMPLETED,
        amount: 100.0,
        currency: 'USD'
      });
      
      expect(pendingPayment.isFailed()).toBe(false);
      expect(completedPayment.isFailed()).toBe(false);
    });
  });
  
  describe('isPending', () => {
    it('should return true when payment status is PENDING', () => {
      const paymentDetails = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 100.0,
        currency: 'USD'
      });
      
      expect(paymentDetails.isPending()).toBe(true);
    });
    
    it('should return false when payment status is not PENDING', () => {
      const processingPayment = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PROCESSING,
        amount: 100.0,
        currency: 'USD'
      });
      
      const completedPayment = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.COMPLETED,
        amount: 100.0,
        currency: 'USD'
      });
      
      expect(processingPayment.isPending()).toBe(false);
      expect(completedPayment.isPending()).toBe(false);
    });
  });
  
  describe('updateStatus', () => {
    it('should update status when transition is valid', () => {
      const paymentDetails = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 100.0,
        currency: 'USD'
      });
      
      const updated = paymentDetails.updateStatus(PaymentStatus.PROCESSING);
      
      expect(updated.status).toBe(PaymentStatus.PROCESSING);
      expect(updated).not.toBe(paymentDetails); // Should return a new instance
    });
    
    it('should update processing date when transitioning to a terminal status', () => {
      const paymentDetails = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 100.0,
        currency: 'USD'
      });
      
      const updated = paymentDetails.updateStatus(PaymentStatus.COMPLETED);
      
      expect(updated.status).toBe(PaymentStatus.COMPLETED);
      expect(updated.processingDate).toBeDefined();
      expect(updated.processingDate instanceof Date).toBe(true);
    });
    
    it('should throw error when transition is invalid', () => {
      const paymentDetails = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.COMPLETED,
        amount: 100.0,
        currency: 'USD'
      });
      
      expect(() => paymentDetails.updateStatus(PaymentStatus.PENDING)).toThrow();
    });
  });
  
  describe('toJSON', () => {
    it('should convert payment details to a plain object', () => {
      const processingDate = new Date();
      const metadata = { bookingId: 'booking_123' };
      
      const paymentDetails = new PaymentDetails({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.COMPLETED,
        amount: 150.0,
        currency: 'EUR',
        processingDate,
        metadata
      });
      
      const json = paymentDetails.toJSON();
      
      expect(json).toEqual({
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.COMPLETED,
        amount: 150.0,
        currency: 'EUR',
        processingDate: processingDate,
        metadata: metadata
      });
    });
  });
});