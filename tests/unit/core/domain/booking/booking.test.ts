/**
 * Booking Entity Tests
 * 
 * Tests for the Booking entity in the domain layer.
 */

import { Booking } from '../../../../../core/domain/booking/booking';
import { BookingStatus } from '../../../../../core/domain/booking/booking-status';
import { PaymentStatus } from '../../../../../core/domain/booking/payment-status';

describe('Booking Entity', () => {
  describe('constructor', () => {
    it('should create a valid booking with required properties', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // Day after tomorrow
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        createdAt: now
      });
      
      expect(booking.id).toBe('booking-123');
      expect(booking.userId).toBe('user-456');
      expect(booking.yachtId).toBe('yacht-789');
      expect(booking.startDate).toBe(startDate);
      expect(booking.endDate).toBe(endDate);
      expect(booking.status).toBe(BookingStatus.PENDING);
      expect(booking.createdAt).toBe(now);
      expect(booking.totalAmount).toBeUndefined();
      expect(booking.paymentStatus).toBeUndefined();
    });
    
    it('should create a booking with all optional properties', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.CONFIRMED,
        totalAmount: 5000,
        paymentStatus: PaymentStatus.PAID,
        paymentId: 'payment-123',
        guestCount: 5,
        addOns: ['addon-1', 'addon-2'],
        specialRequests: 'Please provide life jackets for kids',
        createdAt: now,
        updatedAt: now
      });
      
      expect(booking.id).toBe('booking-123');
      expect(booking.totalAmount).toBe(5000);
      expect(booking.paymentStatus).toBe(PaymentStatus.PAID);
      expect(booking.paymentId).toBe('payment-123');
      expect(booking.guestCount).toBe(5);
      expect(booking.addOns).toEqual(['addon-1', 'addon-2']);
      expect(booking.specialRequests).toBe('Please provide life jackets for kids');
      expect(booking.updatedAt).toBe(now);
    });
    
    it('should set default values for missing optional properties', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        createdAt: now
      });
      
      expect(booking.addOns).toEqual([]);
      expect(booking.updatedAt).toEqual(now);
      expect(booking.guestCount).toBe(1); // Default guest count
    });
  });
  
  describe('update method', () => {
    let booking: Booking;
    
    beforeEach(() => {
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        createdAt: now
      });
    });
    
    it('should update booking properties', () => {
      const newStartDate = new Date(booking.startDate.getTime() + 24 * 60 * 60 * 1000);
      const newEndDate = new Date(booking.endDate.getTime() + 24 * 60 * 60 * 1000);
      
      const updatedBooking = booking.update({
        startDate: newStartDate,
        endDate: newEndDate,
        status: BookingStatus.CONFIRMED,
        totalAmount: 5000,
        paymentStatus: PaymentStatus.PAID,
        paymentId: 'payment-123',
        guestCount: 4,
        addOns: ['addon-1'],
        specialRequests: 'Need a captain'
      });
      
      expect(updatedBooking.startDate).toBe(newStartDate);
      expect(updatedBooking.endDate).toBe(newEndDate);
      expect(updatedBooking.status).toBe(BookingStatus.CONFIRMED);
      expect(updatedBooking.totalAmount).toBe(5000);
      expect(updatedBooking.paymentStatus).toBe(PaymentStatus.PAID);
      expect(updatedBooking.paymentId).toBe('payment-123');
      expect(updatedBooking.guestCount).toBe(4);
      expect(updatedBooking.addOns).toEqual(['addon-1']);
      expect(updatedBooking.specialRequests).toBe('Need a captain');
      expect(updatedBooking.updatedAt).not.toBe(booking.updatedAt);
      
      // Immutability check - original booking should be unchanged
      expect(booking.status).toBe(BookingStatus.PENDING);
      expect(booking.totalAmount).toBeUndefined();
    });
    
    it('should only update provided properties', () => {
      const updatedBooking = booking.update({
        status: BookingStatus.CONFIRMED
      });
      
      expect(updatedBooking.status).toBe(BookingStatus.CONFIRMED);
      expect(updatedBooking.startDate).toBe(booking.startDate);
      expect(updatedBooking.endDate).toBe(booking.endDate);
      expect(updatedBooking.userId).toBe(booking.userId);
      expect(updatedBooking.yachtId).toBe(booking.yachtId);
      expect(updatedBooking.updatedAt).not.toBe(booking.updatedAt);
    });
  });
  
  describe('calculateDuration method', () => {
    it('should calculate booking duration in days', () => {
      const now = new Date();
      const startDate = new Date(now);
      const endDate = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 3 days later
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        createdAt: now
      });
      
      expect(booking.calculateDuration()).toBe(3);
    });
    
    it('should handle same day bookings', () => {
      const now = new Date();
      const startDate = new Date(now);
      const endDate = new Date(now);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        createdAt: now
      });
      
      expect(booking.calculateDuration()).toBe(1);
    });
  });
  
  describe('canBeCancelled method', () => {
    it('should allow cancellation of pending bookings', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        createdAt: now
      });
      
      expect(booking.canBeCancelled()).toBe(true);
    });
    
    it('should allow cancellation of confirmed bookings', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.CONFIRMED,
        createdAt: now
      });
      
      expect(booking.canBeCancelled()).toBe(true);
    });
    
    it('should not allow cancellation of completed bookings', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.COMPLETED,
        createdAt: now
      });
      
      expect(booking.canBeCancelled()).toBe(false);
    });
    
    it('should not allow cancellation of cancelled bookings', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.CANCELLED,
        createdAt: now
      });
      
      expect(booking.canBeCancelled()).toBe(false);
    });
  });
  
  describe('isUpcoming method', () => {
    it('should return true for future bookings', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.CONFIRMED,
        createdAt: now
      });
      
      expect(booking.isUpcoming()).toBe(true);
    });
    
    it('should return false for past bookings', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.COMPLETED,
        createdAt: now
      });
      
      expect(booking.isUpcoming()).toBe(false);
    });
    
    it('should return true for current bookings', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.CONFIRMED,
        createdAt: now
      });
      
      expect(booking.isUpcoming()).toBe(true);
    });
  });
  
  describe('toObject method', () => {
    it('should convert booking to plain object', () => {
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 5000,
        paymentStatus: PaymentStatus.PENDING,
        guestCount: 3,
        addOns: ['addon-1', 'addon-2'],
        specialRequests: 'Need a captain',
        createdAt: now,
        updatedAt: now
      });
      
      const obj = booking.toObject();
      
      expect(obj).toEqual({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 5000,
        paymentStatus: PaymentStatus.PENDING,
        guestCount: 3,
        addOns: ['addon-1', 'addon-2'],
        specialRequests: 'Need a captain',
        createdAt: now,
        updatedAt: now
      });
    });
  });
});