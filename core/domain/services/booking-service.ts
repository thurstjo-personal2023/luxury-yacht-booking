/**
 * Booking Service
 * 
 * Domain service for booking-related business logic
 */

import { Booking, CheckInStatusType } from '../booking/booking';
import { BookingStatus, BookingStatusType } from '../booking/booking-status';
import { BookingItem } from '../booking/booking-item';
import { PaymentDetails } from '../booking/payment-details';
import { PaymentStatus } from '../booking/payment-status';
import { TimeSlot } from '../booking/time-slot';
import { CustomerDetails } from '../booking/customer-details';
import { PricingService, Discount } from './pricing-service';

/**
 * Result of a booking availability check
 */
export interface AvailabilityCheckResult {
  isAvailable: boolean;
  conflictingBookingIds?: string[];
  reason?: string;
}

/**
 * Booking creation result
 */
export interface BookingCreationResult {
  success: boolean;
  booking?: Booking;
  error?: string;
}

/**
 * Booking cancellation result
 */
export interface BookingCancellationResult {
  success: boolean;
  booking?: Booking;
  refundAmount?: number;
  error?: string;
}

/**
 * Booking service for business logic related to bookings
 */
export class BookingService {
  private pricingService: PricingService;
  
  constructor(pricingService: PricingService) {
    this.pricingService = pricingService;
  }
  
  /**
   * Check if a package is available for booking on a specific date
   * 
   * NOTE: This would typically rely on a repository to check existing bookings,
   * but in the domain layer we only define the business logic interface
   */
  checkAvailability(
    packageId: string,
    date: Date,
    timeSlot?: TimeSlot,
    existingBookings: Booking[] = []
  ): AvailabilityCheckResult {
    // Filter relevant bookings (same package, same date, confirmed status)
    const relevantBookings = existingBookings.filter(booking => 
      booking.packageId === packageId && 
      this.isSameBookingDate(booking.bookingDate, date) &&
      booking.status.type !== BookingStatusType.CANCELLED &&
      booking.status.type !== BookingStatusType.DRAFT
    );
    
    // If no time slot is specified, we're just checking date availability
    if (!timeSlot) {
      // Simple capacity check - in a real implementation, this would consider the package's daily capacity
      return {
        isAvailable: true,  // We assume there's no daily limit for now
        conflictingBookingIds: []
      };
    }
    
    // Check for time slot conflicts
    const conflictingBookings = relevantBookings.filter(booking => 
      booking.timeSlot && this.doTimeSlotsOverlap(booking.timeSlot, timeSlot)
    );
    
    return {
      isAvailable: conflictingBookings.length === 0,
      conflictingBookingIds: conflictingBookings.map(booking => booking.id),
      reason: conflictingBookings.length > 0 ? 'Time slot unavailable' : undefined
    };
  }
  
  /**
   * Create a new booking
   */
  createBooking(
    id: string,
    packageId: string,
    customerId: string,
    customerDetails: CustomerDetails,
    bookingDate: Date,
    items: BookingItem[] = [],
    discounts: Discount[] = [],
    yachtId?: string,
    timeSlot?: TimeSlot,
    producerId?: string
  ): BookingCreationResult {
    try {
      // Create a draft booking first
      let booking = Booking.createDraft(
        id,
        packageId,
        customerId,
        customerDetails,
        bookingDate,
        yachtId,
        timeSlot,
        producerId
      );
      
      // Add booking items
      items.forEach(item => {
        booking = booking.addItem(item);
      });
      
      // Calculate final price (applying discounts)
      // Note: This is redundant as the Booking entity also calculates total,
      // but we're doing it here to show how the pricing service would be used
      const totalAmount = this.pricingService.calculateTotalPrice(items, discounts);
      
      return {
        success: true,
        booking
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating booking'
      };
    }
  }
  
  /**
   * Confirm a booking
   */
  confirmBooking(
    booking: Booking,
    paymentDetails?: PaymentDetails,
    confirmationCode?: string
  ): Booking {
    // Check if booking can be confirmed
    if (booking.status.type !== BookingStatusType.DRAFT && 
        booking.status.type !== BookingStatusType.PENDING) {
      throw new Error(`Cannot confirm booking with status ${booking.status.type}`);
    }
    
    // If payment details are provided, validate and attach them
    let updatedBooking = booking;
    
    if (paymentDetails) {
      // Validate payment details
      if (paymentDetails.status.type !== PaymentStatus.COMPLETED) {
        throw new Error('Cannot confirm booking without completed payment');
      }
      
      // Update booking with payment details
      updatedBooking = booking.setPaymentDetails(paymentDetails);
    }
    
    // Set confirmation code if provided
    if (confirmationCode) {
      updatedBooking = updatedBooking.setConfirmationCode(confirmationCode);
    }
    
    // Update status to confirmed
    return updatedBooking.updateStatus(BookingStatusType.CONFIRMED);
  }
  
  /**
   * Cancel a booking
   */
  cancelBooking(
    booking: Booking,
    reason?: string,
    cancelledById?: string,
    isAdminCancellation: boolean = false
  ): BookingCancellationResult {
    try {
      // Check if booking can be cancelled by regular means
      // (admins can override this check)
      if (!isAdminCancellation) {
        if (!booking.canBeModified()) {
          return {
            success: false,
            error: 'Booking cannot be cancelled in its current state'
          };
        }
      }
      
      // Calculate refund amount if applicable
      // In a real implementation, this would consider cancellation policies
      let refundAmount = 0;
      if (booking.paymentDetails && booking.paymentDetails.isSuccessful()) {
        // Simple refund logic - full refund if cancelled with enough notice
        const today = new Date();
        const bookingDate = new Date(booking.bookingDate);
        const daysDifference = Math.ceil(
          (bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Example policy: full refund if cancelled 7+ days in advance
        // 50% refund if 3-6 days in advance, no refund otherwise
        if (daysDifference >= 7) {
          refundAmount = booking.totalAmount;
        } else if (daysDifference >= 3) {
          refundAmount = booking.totalAmount * 0.5;
        }
        
        // Admin cancellations always get full refund
        if (isAdminCancellation) {
          refundAmount = booking.totalAmount;
        }
      }
      
      // Create cancellation metadata
      const cancelMeta = {
        cancelledById: cancelledById || booking.customerId,
        cancellationDate: new Date(),
        isAdminCancellation,
        refundAmount
      };
      
      // Update booking
      const cancelledBooking = booking
        .cancel(reason)
        .updateMetadata({ cancellation: cancelMeta });
      
      return {
        success: true,
        booking: cancelledBooking,
        refundAmount
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error cancelling booking'
      };
    }
  }
  
  /**
   * Check in a booking
   */
  checkInBooking(booking: Booking, notes?: string): Booking {
    // Ensure booking is in confirmed state
    if (booking.status.type !== BookingStatusType.CONFIRMED) {
      throw new Error('Only confirmed bookings can be checked in');
    }
    
    // Update check-in status
    let updatedBooking = booking.updateCheckInStatus(CheckInStatusType.CHECKED_IN);
    
    // Add check-in notes if provided
    if (notes) {
      updatedBooking = updatedBooking.updateNotes(notes);
    }
    
    return updatedBooking;
  }
  
  /**
   * Mark booking as no-show
   */
  markAsNoShow(booking: Booking, notes?: string): Booking {
    // Ensure booking is in confirmed state
    if (booking.status.type !== BookingStatusType.CONFIRMED) {
      throw new Error('Only confirmed bookings can be marked as no-show');
    }
    
    // Update check-in status
    let updatedBooking = booking.updateCheckInStatus(CheckInStatusType.NO_SHOW);
    
    // Add notes if provided
    if (notes) {
      updatedBooking = updatedBooking.updateNotes(notes);
    }
    
    return updatedBooking;
  }
  
  /**
   * Complete a booking
   */
  completeBooking(booking: Booking, notes?: string): Booking {
    // Ensure booking is in checked-in state
    if (booking.status.type !== BookingStatusType.CHECKED_IN) {
      throw new Error('Only checked-in bookings can be completed');
    }
    
    // Update status to completed
    let updatedBooking = booking.updateStatus(BookingStatusType.COMPLETED);
    
    // Add completion notes if provided
    if (notes) {
      updatedBooking = updatedBooking.updateNotes(notes);
    }
    
    return updatedBooking;
  }
  
  /**
   * Generate a confirmation code
   */
  generateConfirmationCode(booking: Booking): string {
    // Generate a unique booking confirmation code
    // Format: YAC-{YEAR}{MONTH}{DAY}-{4 RANDOM CHARS}
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Generate 4 random alphanumeric characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomChars = '';
    for (let i = 0; i < 4; i++) {
      randomChars += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return `YAC-${year}${month}${day}-${randomChars}`;
  }
  
  /**
   * Helper: Check if two dates represent the same booking day
   */
  private isSameBookingDate(date1: Date, date2: Date): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    
    return d1.getTime() === d2.getTime();
  }
  
  /**
   * Helper: Check if two time slots overlap
   */
  private doTimeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    // If start or end times aren't set, assume same time of day type is a conflict
    if (!slot1.startTime || !slot1.endTime || !slot2.startTime || !slot2.endTime) {
      return slot1.type === slot2.type;
    }
    
    // Check for time range overlap
    return (
      (slot1.startTime <= slot2.startTime && slot2.startTime < slot1.endTime) ||
      (slot2.startTime <= slot1.startTime && slot1.startTime < slot2.endTime)
    );
  }
}