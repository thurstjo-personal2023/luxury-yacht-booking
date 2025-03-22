/**
 * Payment Status Tests
 * 
 * Tests for the PaymentStatus value object in the domain layer.
 */

import { PaymentStatus } from '../../../../../core/domain/booking/payment-status';

describe('PaymentStatus', () => {
  describe('PaymentStatus enum', () => {
    it('should have the correct status values', () => {
      // Verify all expected statuses are defined
      expect(PaymentStatus.PENDING).toBeDefined();
      expect(PaymentStatus.PROCESSING).toBeDefined();
      expect(PaymentStatus.COMPLETED).toBeDefined();
      expect(PaymentStatus.CANCELLED).toBeDefined();
      expect(PaymentStatus.FAILED).toBeDefined();
      expect(PaymentStatus.REFUNDED).toBeDefined();
      
      // Verify the values match expected strings
      expect(PaymentStatus.PENDING).toBe('pending');
      expect(PaymentStatus.PROCESSING).toBe('processing');
      expect(PaymentStatus.COMPLETED).toBe('completed');
      expect(PaymentStatus.CANCELLED).toBe('cancelled');
      expect(PaymentStatus.FAILED).toBe('failed');
      expect(PaymentStatus.REFUNDED).toBe('refunded');
    });
  });
  
  describe('isTerminalStatus', () => {
    it('should identify terminal payment statuses correctly', () => {
      // Terminal statuses
      expect(PaymentStatus.isTerminalStatus(PaymentStatus.COMPLETED)).toBe(true);
      expect(PaymentStatus.isTerminalStatus(PaymentStatus.CANCELLED)).toBe(true);
      expect(PaymentStatus.isTerminalStatus(PaymentStatus.FAILED)).toBe(true);
      expect(PaymentStatus.isTerminalStatus(PaymentStatus.REFUNDED)).toBe(true);
      
      // Non-terminal statuses
      expect(PaymentStatus.isTerminalStatus(PaymentStatus.PENDING)).toBe(false);
      expect(PaymentStatus.isTerminalStatus(PaymentStatus.PROCESSING)).toBe(false);
    });
    
    it('should handle unknown status values', () => {
      expect(PaymentStatus.isTerminalStatus('unknown' as any)).toBe(false);
    });
  });
  
  describe('isValidTransition', () => {
    it('should allow valid status transitions', () => {
      // From PENDING
      expect(PaymentStatus.isValidTransition(PaymentStatus.PENDING, PaymentStatus.PROCESSING)).toBe(true);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PENDING, PaymentStatus.COMPLETED)).toBe(true);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PENDING, PaymentStatus.CANCELLED)).toBe(true);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PENDING, PaymentStatus.FAILED)).toBe(true);
      
      // From PROCESSING
      expect(PaymentStatus.isValidTransition(PaymentStatus.PROCESSING, PaymentStatus.COMPLETED)).toBe(true);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PROCESSING, PaymentStatus.FAILED)).toBe(true);
      
      // From COMPLETED
      expect(PaymentStatus.isValidTransition(PaymentStatus.COMPLETED, PaymentStatus.REFUNDED)).toBe(true);
    });
    
    it('should prevent invalid status transitions', () => {
      // Cannot go back to PENDING
      expect(PaymentStatus.isValidTransition(PaymentStatus.PROCESSING, PaymentStatus.PENDING)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.COMPLETED, PaymentStatus.PENDING)).toBe(false);
      
      // Cannot transition from terminal states (except COMPLETED to REFUNDED)
      expect(PaymentStatus.isValidTransition(PaymentStatus.CANCELLED, PaymentStatus.PROCESSING)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.FAILED, PaymentStatus.COMPLETED)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.REFUNDED, PaymentStatus.COMPLETED)).toBe(false);
      
      // Cannot transition to the same state
      expect(PaymentStatus.isValidTransition(PaymentStatus.PENDING, PaymentStatus.PENDING)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.COMPLETED, PaymentStatus.COMPLETED)).toBe(false);
    });
    
    it('should handle unknown status values', () => {
      expect(PaymentStatus.isValidTransition('unknown' as any, PaymentStatus.COMPLETED)).toBe(false);
      expect(PaymentStatus.isValidTransition(PaymentStatus.PENDING, 'unknown' as any)).toBe(false);
    });
  });
  
  describe('fromStripeStatus', () => {
    it('should map Stripe payment intent status to PaymentStatus', () => {
      expect(PaymentStatus.fromStripeStatus('requires_payment_method')).toBe(PaymentStatus.PENDING);
      expect(PaymentStatus.fromStripeStatus('requires_confirmation')).toBe(PaymentStatus.PENDING);
      expect(PaymentStatus.fromStripeStatus('requires_action')).toBe(PaymentStatus.PENDING);
      expect(PaymentStatus.fromStripeStatus('processing')).toBe(PaymentStatus.PROCESSING);
      expect(PaymentStatus.fromStripeStatus('succeeded')).toBe(PaymentStatus.COMPLETED);
      expect(PaymentStatus.fromStripeStatus('canceled')).toBe(PaymentStatus.CANCELLED);
      expect(PaymentStatus.fromStripeStatus('requires_capture')).toBe(PaymentStatus.PROCESSING);
    });
    
    it('should handle unknown Stripe status', () => {
      expect(PaymentStatus.fromStripeStatus('unknown_status')).toBe(PaymentStatus.PENDING);
    });
  });
});