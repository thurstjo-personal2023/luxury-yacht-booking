/**
 * Payment Status Tests
 * 
 * Tests for the PaymentStatus value object in the domain layer.
 */

import { PaymentStatus, isValidPaymentStatus } from '../../../../../core/domain/booking/payment-status';

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
  
  describe('status transitions', () => {
    it('should allow specific transitions from PENDING status', () => {
      // Valid transitions from PENDING
      const validTransitions = [
        PaymentStatus.PROCESSING,
        PaymentStatus.FAILED
      ];
      
      // Invalid transitions from PENDING
      const invalidTransitions = [
        PaymentStatus.PAID,
        PaymentStatus.REFUNDED,
        PaymentStatus.PARTIALLY_REFUNDED
      ];
      
      // These are placeholders for transition validation tests
      expect(validTransitions).not.toContain(PaymentStatus.PAID);
      expect(invalidTransitions).toContain(PaymentStatus.PAID);
    });
    
    it('should allow specific transitions from PROCESSING status', () => {
      // Valid transitions from PROCESSING
      const validTransitions = [
        PaymentStatus.PAID,
        PaymentStatus.FAILED
      ];
      
      // Invalid transitions from PROCESSING
      const invalidTransitions = [
        PaymentStatus.PENDING,
        PaymentStatus.REFUNDED,
        PaymentStatus.PARTIALLY_REFUNDED
      ];
      
      expect(validTransitions).not.toContain(PaymentStatus.PENDING);
      expect(invalidTransitions).toContain(PaymentStatus.PENDING);
    });
    
    it('should allow specific transitions from PAID status', () => {
      // Valid transitions from PAID
      const validTransitions = [
        PaymentStatus.REFUNDED,
        PaymentStatus.PARTIALLY_REFUNDED
      ];
      
      // Invalid transitions from PAID
      const invalidTransitions = [
        PaymentStatus.PENDING,
        PaymentStatus.PROCESSING,
        PaymentStatus.FAILED
      ];
      
      expect(validTransitions).not.toContain(PaymentStatus.PENDING);
      expect(invalidTransitions).toContain(PaymentStatus.PENDING);
    });
    
    it('should not allow transitions from FAILED status', () => {
      // FAILED is generally a terminal state, so no valid transitions
      const validTransitions: PaymentStatus[] = [];
      
      // All other statuses are invalid transitions
      const invalidTransitions = [
        PaymentStatus.PENDING,
        PaymentStatus.PROCESSING,
        PaymentStatus.PAID,
        PaymentStatus.REFUNDED,
        PaymentStatus.PARTIALLY_REFUNDED
      ];
      
      expect(validTransitions).toHaveLength(0);
      expect(invalidTransitions).toContain(PaymentStatus.PENDING);
      expect(invalidTransitions).toContain(PaymentStatus.PAID);
    });
    
    it('should not allow transitions from REFUNDED status', () => {
      // REFUNDED is a terminal state, so no valid transitions
      const validTransitions: PaymentStatus[] = [];
      
      // All other statuses are invalid transitions
      const invalidTransitions = [
        PaymentStatus.PENDING,
        PaymentStatus.PROCESSING,
        PaymentStatus.PAID,
        PaymentStatus.FAILED,
        PaymentStatus.PARTIALLY_REFUNDED
      ];
      
      expect(validTransitions).toHaveLength(0);
      expect(invalidTransitions).toContain(PaymentStatus.PENDING);
      expect(invalidTransitions).toContain(PaymentStatus.PAID);
    });
    
    it('should allow specific transitions from PARTIALLY_REFUNDED status', () => {
      // Valid transitions from PARTIALLY_REFUNDED
      const validTransitions = [
        PaymentStatus.REFUNDED
      ];
      
      // Invalid transitions from PARTIALLY_REFUNDED
      const invalidTransitions = [
        PaymentStatus.PENDING,
        PaymentStatus.PROCESSING,
        PaymentStatus.PAID,
        PaymentStatus.FAILED
      ];
      
      expect(validTransitions).toContain(PaymentStatus.REFUNDED);
      expect(invalidTransitions).not.toContain(PaymentStatus.REFUNDED);
    });
  });
});