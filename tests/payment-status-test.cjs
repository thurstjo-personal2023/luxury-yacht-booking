/**
 * Payment Status Test
 * 
 * Tests for the PaymentStatus domain object using CommonJS modules.
 */

const { PaymentStatus, isValidPaymentStatus } = require('../core/domain/payment/payment-status.cjs');

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
      expect(isValidPaymentStatus(null)).toBe(false);
      expect(isValidPaymentStatus(undefined)).toBe(false);
    });
    
    it('should handle case sensitivity correctly', () => {
      expect(isValidPaymentStatus('pending')).toBe(false);
      expect(isValidPaymentStatus('Paid')).toBe(false);
      expect(isValidPaymentStatus('PENDING')).toBe(true);
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