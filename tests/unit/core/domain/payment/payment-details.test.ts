/**
 * Payment Details Tests
 * 
 * Tests for the PaymentDetails value object in the domain layer.
 */

import { PaymentDetails } from '../../../../../core/domain/payment/payment-details';
import { PaymentStatus } from '../../../../../core/domain/payment/payment-status';

describe('PaymentDetails', () => {
  describe('constructor', () => {
    it('should create payment details with required properties', () => {
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 1000,
        currency: 'USD'
      });
      
      expect(paymentDetails.bookingId).toBe('booking-123');
      expect(paymentDetails.paymentIntentId).toBe('pi_123456789');
      expect(paymentDetails.status).toBe(PaymentStatus.PENDING);
      expect(paymentDetails.amount).toBe(1000);
      expect(paymentDetails.currency).toBe('USD');
      expect(paymentDetails.processingDate).toBeUndefined();
      expect(paymentDetails.metadata).toBeUndefined();
    });
    
    it('should create payment details with all properties', () => {
      const processingDate = new Date();
      const metadata = { customerId: 'cus_123456' };
      
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PAID,
        amount: 1000,
        currency: 'USD',
        processingDate,
        metadata
      });
      
      expect(paymentDetails.bookingId).toBe('booking-123');
      expect(paymentDetails.paymentIntentId).toBe('pi_123456789');
      expect(paymentDetails.status).toBe(PaymentStatus.PAID);
      expect(paymentDetails.amount).toBe(1000);
      expect(paymentDetails.currency).toBe('USD');
      expect(paymentDetails.processingDate).toBe(processingDate);
      expect(paymentDetails.metadata).toEqual(metadata);
    });
  });
  
  describe('status check methods', () => {
    it('should identify pending payments', () => {
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 1000,
        currency: 'USD'
      });
      
      expect(paymentDetails.isPending()).toBe(true);
      expect(paymentDetails.isCompleted()).toBe(false);
      expect(paymentDetails.isFailed()).toBe(false);
      expect(paymentDetails.isCancelled()).toBe(false);
    });
    
    it('should identify processing payments', () => {
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PROCESSING,
        amount: 1000,
        currency: 'USD'
      });
      
      expect(paymentDetails.isPending()).toBe(false);
      expect(paymentDetails.isProcessing()).toBe(true);
      expect(paymentDetails.isCompleted()).toBe(false);
      expect(paymentDetails.isFailed()).toBe(false);
      expect(paymentDetails.isCancelled()).toBe(false);
    });
    
    it('should identify paid payments', () => {
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PAID,
        amount: 1000,
        currency: 'USD'
      });
      
      expect(paymentDetails.isPending()).toBe(false);
      expect(paymentDetails.isCompleted()).toBe(true);
      expect(paymentDetails.isFailed()).toBe(false);
      expect(paymentDetails.isCancelled()).toBe(false);
    });
    
    it('should identify failed payments', () => {
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.FAILED,
        amount: 1000,
        currency: 'USD'
      });
      
      expect(paymentDetails.isPending()).toBe(false);
      expect(paymentDetails.isCompleted()).toBe(false);
      expect(paymentDetails.isFailed()).toBe(true);
      expect(paymentDetails.isCancelled()).toBe(false);
    });
    
    it('should identify cancelled payments', () => {
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.REFUNDED,
        amount: 1000,
        currency: 'USD'
      });
      
      expect(paymentDetails.isPending()).toBe(false);
      expect(paymentDetails.isCompleted()).toBe(false);
      expect(paymentDetails.isFailed()).toBe(false);
      expect(paymentDetails.isCancelled()).toBe(true);
    });
  });
  
  describe('update method', () => {
    it('should update payment status', () => {
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 1000,
        currency: 'USD'
      });
      
      const processingDate = new Date();
      const updatedPayment = paymentDetails.update({
        status: PaymentStatus.PAID,
        processingDate
      });
      
      expect(updatedPayment.status).toBe(PaymentStatus.PAID);
      expect(updatedPayment.processingDate).toBe(processingDate);
      expect(updatedPayment.bookingId).toBe('booking-123');
      expect(updatedPayment.paymentIntentId).toBe('pi_123456789');
    });
    
    it('should update metadata', () => {
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 1000,
        currency: 'USD'
      });
      
      const metadata = { customerId: 'cus_123456', receiptUrl: 'https://example.com/receipt' };
      const updatedPayment = paymentDetails.update({
        metadata
      });
      
      expect(updatedPayment.metadata).toEqual(metadata);
      expect(updatedPayment.status).toBe(PaymentStatus.PENDING);
    });
    
    it('should not modify original object', () => {
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 1000,
        currency: 'USD'
      });
      
      const processingDate = new Date();
      const updatedPayment = paymentDetails.update({
        status: PaymentStatus.PAID,
        processingDate
      });
      
      // Original should be unchanged
      expect(paymentDetails.status).toBe(PaymentStatus.PENDING);
      expect(paymentDetails.processingDate).toBeUndefined();
      
      // Updated object should have new values
      expect(updatedPayment.status).toBe(PaymentStatus.PAID);
      expect(updatedPayment.processingDate).toBe(processingDate);
    });
  });
  
  describe('getFormattedAmount method', () => {
    it('should format amount correctly for USD', () => {
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PAID,
        amount: 1000,
        currency: 'USD'
      });
      
      expect(paymentDetails.getFormattedAmount()).toBe('$10.00');
    });
    
    it('should format amount correctly for EUR', () => {
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PAID,
        amount: 1000,
        currency: 'EUR'
      });
      
      expect(paymentDetails.getFormattedAmount()).toBe('€10.00');
    });
    
    it('should format amount correctly for AED', () => {
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PAID,
        amount: 1000,
        currency: 'AED'
      });
      
      expect(paymentDetails.getFormattedAmount()).toBe('1,000.00 AED');
    });
  });
});