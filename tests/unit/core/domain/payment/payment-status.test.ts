/**
 * Payment Status Tests
 * 
 * Tests for the PaymentStatus value object in the domain layer.
 */

import { PaymentStatus, isValidPaymentStatus } from '../../../../../core/domain/payment/payment-status';

describe('PaymentStatus', () => {
  describe('enum values', () => {
    it('should define the correct status values', () => {
      expect(PaymentStatus.PENDING).toBe('PENDING');
      expect(PaymentStatus.PROCESSING).toBe('PROCESSING');
      expect(PaymentStatus.PAID).toBe('PAID');
      expect(PaymentStatus.FAILED).toBe('FAILED');
      expect(PaymentStatus.REFUNDED).toBe('REFUNDED');
      expect(PaymentStatus.PARTIALLY_REFUNDED).toBe('PARTIALLY_REFUNDED');
    });
  });
  
  describe('isValidPaymentStatus function', () => {
    it('should return true for valid status values', () => {
      expect(isValidPaymentStatus(PaymentStatus.PENDING)).toBe(true);
      expect(isValidPaymentStatus(PaymentStatus.PROCESSING)).toBe(true);
      expect(isValidPaymentStatus(PaymentStatus.PAID)).toBe(true);
      expect(isValidPaymentStatus(PaymentStatus.FAILED)).toBe(true);
      expect(isValidPaymentStatus(PaymentStatus.REFUNDED)).toBe(true);
      expect(isValidPaymentStatus(PaymentStatus.PARTIALLY_REFUNDED)).toBe(true);
    });
    
    it('should return false for invalid status values', () => {
      expect(isValidPaymentStatus('INVALID_STATUS')).toBe(false);
      expect(isValidPaymentStatus('')).toBe(false);
      expect(isValidPaymentStatus(null as any)).toBe(false);
      expect(isValidPaymentStatus(undefined as any)).toBe(false);
    });
    
    it('should handle case sensitivity correctly', () => {
      expect(isValidPaymentStatus('pending')).toBe(false);
      expect(isValidPaymentStatus('Paid')).toBe(false);
      expect(isValidPaymentStatus('PENDING')).toBe(true);
    });
  });
  
  describe('terminal status checks', () => {
    it('should identify terminal statuses correctly', () => {
      expect(PaymentStatus.isTerminalStatus(PaymentStatus.PAID)).toBe(true);
      expect(PaymentStatus.isTerminalStatus(PaymentStatus.FAILED)).toBe(true);
      expect(PaymentStatus.isTerminalStatus(PaymentStatus.REFUNDED)).toBe(true);
      expect(PaymentStatus.isTerminalStatus(PaymentStatus.PARTIALLY_REFUNDED)).toBe(true);
      
      expect(PaymentStatus.isTerminalStatus(PaymentStatus.PENDING)).toBe(false);
      expect(PaymentStatus.isTerminalStatus(PaymentStatus.PROCESSING)).toBe(false);
      
      // Invalid values should return false
      expect(PaymentStatus.isTerminalStatus('INVALID' as any)).toBe(false);
    });
  });
  
  describe('transition validation', () => {
    it('should validate transitions from PENDING status', () => {
      expect(PaymentStatus.isValidTransition(PaymentStatus.PENDING, PaymentStatus.PROCESSING)).toBe(true);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PENDING, PaymentStatus.FAILED)).toBe(true);
      
      expect(PaymentStatus.isValidTransition(PaymentStatus.PENDING, PaymentStatus.PAID)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PENDING, PaymentStatus.REFUNDED)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PENDING, PaymentStatus.PARTIALLY_REFUNDED)).toBe(false);
    });
    
    it('should validate transitions from PROCESSING status', () => {
      expect(PaymentStatus.isValidTransition(PaymentStatus.PROCESSING, PaymentStatus.PAID)).toBe(true);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PROCESSING, PaymentStatus.FAILED)).toBe(true);
      
      expect(PaymentStatus.isValidTransition(PaymentStatus.PROCESSING, PaymentStatus.PENDING)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PROCESSING, PaymentStatus.REFUNDED)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PROCESSING, PaymentStatus.PARTIALLY_REFUNDED)).toBe(false);
    });
    
    it('should validate transitions from PAID status', () => {
      expect(PaymentStatus.isValidTransition(PaymentStatus.PAID, PaymentStatus.REFUNDED)).toBe(true);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED)).toBe(true);
      
      expect(PaymentStatus.isValidTransition(PaymentStatus.PAID, PaymentStatus.PENDING)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PAID, PaymentStatus.PROCESSING)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PAID, PaymentStatus.FAILED)).toBe(false);
    });
    
    it('should validate transitions from PARTIALLY_REFUNDED status', () => {
      expect(PaymentStatus.isValidTransition(PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED)).toBe(true);
      
      expect(PaymentStatus.isValidTransition(PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.PENDING)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.PROCESSING)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.PAID)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.FAILED)).toBe(false);
    });
    
    it('should not allow transitions from terminal statuses', () => {
      expect(PaymentStatus.isValidTransition(PaymentStatus.FAILED, PaymentStatus.PENDING)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.FAILED, PaymentStatus.PROCESSING)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.FAILED, PaymentStatus.PAID)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.FAILED, PaymentStatus.REFUNDED)).toBe(false);
      
      expect(PaymentStatus.isValidTransition(PaymentStatus.REFUNDED, PaymentStatus.PENDING)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.REFUNDED, PaymentStatus.PROCESSING)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.REFUNDED, PaymentStatus.PAID)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED)).toBe(false);
    });
  });
  
  describe('fromStripeStatus function', () => {
    it('should correctly map Stripe statuses to internal payment statuses', () => {
      expect(PaymentStatus.fromStripeStatus('requires_payment_method')).toBe(PaymentStatus.PENDING);
      expect(PaymentStatus.fromStripeStatus('requires_confirmation')).toBe(PaymentStatus.PENDING);
      expect(PaymentStatus.fromStripeStatus('requires_action')).toBe(PaymentStatus.PENDING);
      expect(PaymentStatus.fromStripeStatus('processing')).toBe(PaymentStatus.PROCESSING);
      expect(PaymentStatus.fromStripeStatus('succeeded')).toBe(PaymentStatus.PAID);
      expect(PaymentStatus.fromStripeStatus('canceled')).toBe(PaymentStatus.FAILED);
      expect(PaymentStatus.fromStripeStatus('requires_capture')).toBe(PaymentStatus.PROCESSING);
      
      // Invalid values should return PENDING as default
      expect(PaymentStatus.fromStripeStatus('unknown_status')).toBe(PaymentStatus.PENDING);
    });
  });
});