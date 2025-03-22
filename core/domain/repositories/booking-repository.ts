/**
 * Booking Repository Interface
 * 
 * This interface defines the contract for booking data access
 */

import { Booking } from '../booking/booking';
import { TimeSlot } from '../booking/time-slot';
import { TimeBlock } from '../services/availability-service';

/**
 * Booking search criteria
 */
export interface BookingSearchCriteria {
  customerId?: string;
  producerId?: string;
  packageId?: string;
  yachtId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string[];
  confirmationCode?: string;
  limit?: number;
  offset?: number;
}

/**
 * Booking repository interface
 */
export interface IBookingRepository {
  /**
   * Find booking by ID
   */
  findById(id: string): Promise<Booking | null>;
  
  /**
   * Find booking by confirmation code
   */
  findByConfirmationCode(code: string): Promise<Booking | null>;
  
  /**
   * Find bookings by search criteria
   */
  findByCriteria(criteria: BookingSearchCriteria): Promise<Booking[]>;
  
  /**
   * Search bookings
   */
  search(criteria: BookingSearchCriteria): Promise<{
    bookings: Booking[];
    total: number;
  }>;
  
  /**
   * Save booking
   */
  save(booking: Booking): Promise<Booking>;
  
  /**
   * Delete booking
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Find existing bookings that might conflict with a new booking
   */
  findConflictingBookings(
    packageId: string,
    date: Date,
    timeSlot?: TimeSlot,
    excludeBookingId?: string
  ): Promise<Booking[]>;
  
  /**
   * Create a new time block
   */
  createTimeBlock(block: TimeBlock): Promise<TimeBlock>;
  
  /**
   * Find time blocks by criteria
   */
  findTimeBlocks(
    startDate: Date,
    endDate: Date,
    packageId?: string,
    yachtId?: string
  ): Promise<TimeBlock[]>;
  
  /**
   * Delete a time block
   */
  deleteTimeBlock(id: string): Promise<boolean>;
  
  /**
   * Get booking statistics for a time period
   */
  getBookingStats(
    startDate: Date,
    endDate: Date,
    producerId?: string
  ): Promise<{
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    revenue: number;
    averageBookingValue: number;
  }>;
  
  /**
   * Get customer booking history
   */
  getCustomerBookingHistory(
    customerId: string,
    limit?: number
  ): Promise<Booking[]>;
  
  /**
   * Get booking count by status
   */
  getBookingCountByStatus(
    producerId?: string
  ): Promise<Record<string, number>>;
}