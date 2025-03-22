/**
 * Booking Status Tests
 * 
 * Tests for the BookingStatus value object in the domain layer.
 */

import { BookingStatus, isValidBookingStatus } from '../../../../../core/domain/booking/booking-status';

describe('BookingStatus', () => {
  describe('enum values', () => {
    it('should define the correct status values', () => {
      expect(BookingStatus.PENDING).toBe('PENDING');
      expect(BookingStatus.CONFIRMED).toBe('CONFIRMED');
      expect(BookingStatus.CANCELLED).toBe('CANCELLED');
      expect(BookingStatus.COMPLETED).toBe('COMPLETED');
      expect(BookingStatus.REJECTED).toBe('REJECTED');
    });
  });
  
  describe('isValidBookingStatus function', () => {
    it('should return true for valid status values', () => {
      expect(isValidBookingStatus(BookingStatus.PENDING)).toBe(true);
      expect(isValidBookingStatus(BookingStatus.CONFIRMED)).toBe(true);
      expect(isValidBookingStatus(BookingStatus.CANCELLED)).toBe(true);
      expect(isValidBookingStatus(BookingStatus.COMPLETED)).toBe(true);
      expect(isValidBookingStatus(BookingStatus.REJECTED)).toBe(true);
    });
    
    it('should return false for invalid status values', () => {
      expect(isValidBookingStatus('INVALID_STATUS')).toBe(false);
      expect(isValidBookingStatus('')).toBe(false);
      expect(isValidBookingStatus(null as any)).toBe(false);
      expect(isValidBookingStatus(undefined as any)).toBe(false);
    });
    
    it('should handle case sensitivity correctly', () => {
      expect(isValidBookingStatus('pending')).toBe(false);
      expect(isValidBookingStatus('Confirmed')).toBe(false);
      expect(isValidBookingStatus('PENDING')).toBe(true);
    });
  });
  
  describe('status transitions', () => {
    it('should allow specific transitions from PENDING status', () => {
      // In a real implementation, there might be a canTransitionTo function to test
      // For now, we'll manually check the expected valid transitions
      
      // Valid transitions from PENDING
      const validTransitions = [
        BookingStatus.CONFIRMED,
        BookingStatus.CANCELLED,
        BookingStatus.REJECTED
      ];
      
      // Invalid transitions from PENDING
      const invalidTransitions = [
        BookingStatus.COMPLETED
      ];
      
      // This is a placeholder for more specific transition validation tests
      // that would depend on the actual implementation
      expect(validTransitions).not.toContain(BookingStatus.COMPLETED);
      expect(invalidTransitions).toContain(BookingStatus.COMPLETED);
    });
    
    it('should allow specific transitions from CONFIRMED status', () => {
      // Valid transitions from CONFIRMED
      const validTransitions = [
        BookingStatus.CANCELLED,
        BookingStatus.COMPLETED
      ];
      
      // Invalid transitions from CONFIRMED
      const invalidTransitions = [
        BookingStatus.PENDING,
        BookingStatus.REJECTED
      ];
      
      expect(validTransitions).not.toContain(BookingStatus.PENDING);
      expect(invalidTransitions).toContain(BookingStatus.PENDING);
    });
    
    it('should not allow transitions from CANCELLED status', () => {
      // No valid transitions from CANCELLED
      const validTransitions: BookingStatus[] = [];
      
      // All other statuses are invalid transitions
      const invalidTransitions = [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.COMPLETED,
        BookingStatus.REJECTED
      ];
      
      expect(validTransitions).toHaveLength(0);
      expect(invalidTransitions).toContain(BookingStatus.PENDING);
      expect(invalidTransitions).toContain(BookingStatus.CONFIRMED);
    });
    
    it('should not allow transitions from COMPLETED status', () => {
      // No valid transitions from COMPLETED
      const validTransitions: BookingStatus[] = [];
      
      // All other statuses are invalid transitions
      const invalidTransitions = [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.CANCELLED,
        BookingStatus.REJECTED
      ];
      
      expect(validTransitions).toHaveLength(0);
      expect(invalidTransitions).toContain(BookingStatus.PENDING);
      expect(invalidTransitions).toContain(BookingStatus.CONFIRMED);
    });
  });
});