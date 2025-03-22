/**
 * Mock Booking Repository
 * 
 * This class provides a mock implementation of the IBookingRepository interface
 * for testing use cases and controllers without requiring a real database.
 */

import { BaseMockRepository } from '../base-mock-repository';
import { IBookingRepository } from '../../../../core/application/ports/repositories/booking-repository';
import { Booking } from '../../../../core/domain/booking/booking';
import { BookingStatus } from '../../../../core/domain/booking/booking-status';
import { BookingQueryOptions, PagedBookings } from '../../../../core/application/ports/repositories/booking-repository';
import { TimeSlot } from '../../../../core/domain/booking/time-slot';

export class MockBookingRepository extends BaseMockRepository implements IBookingRepository {
  // In-memory storage for bookings
  private bookings: Map<string, Booking> = new Map();
  
  /**
   * Create a new booking
   * @param booking Booking to create
   */
  async create(booking: Booking): Promise<string> {
    return this.executeMethod<string>('create', [booking], () => {
      const id = booking.id || `mock-booking-${Date.now()}`;
      const newBooking = { ...booking, id };
      this.bookings.set(id, newBooking);
      return id;
    });
  }
  
  /**
   * Get a booking by ID
   * @param id Booking ID
   */
  async getById(id: string): Promise<Booking | null> {
    return this.executeMethod<Booking | null>('getById', [id], () => {
      return this.bookings.has(id) ? this.bookings.get(id) || null : null;
    });
  }
  
  /**
   * Update an existing booking
   * @param id Booking ID
   * @param booking Updated booking data
   */
  async update(id: string, booking: Partial<Booking>): Promise<boolean> {
    return this.executeMethod<boolean>('update', [id, booking], () => {
      if (!this.bookings.has(id)) {
        return false;
      }
      
      const existingBooking = this.bookings.get(id);
      if (!existingBooking) return false;
      
      this.bookings.set(id, { ...existingBooking, ...booking });
      return true;
    });
  }
  
  /**
   * Delete a booking
   * @param id Booking ID
   */
  async delete(id: string): Promise<boolean> {
    return this.executeMethod<boolean>('delete', [id], () => {
      if (!this.bookings.has(id)) {
        return false;
      }
      
      return this.bookings.delete(id);
    });
  }
  
  /**
   * List bookings by query options
   * @param options Query options
   */
  async listBookings(options?: BookingQueryOptions): Promise<PagedBookings> {
    return this.executeMethod<PagedBookings>('listBookings', [options], () => {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      
      let filteredBookings = Array.from(this.bookings.values());
      
      // Apply filters
      if (options?.status) {
        filteredBookings = filteredBookings.filter(booking => 
          booking.status === options.status
        );
      }
      
      if (options?.userId) {
        filteredBookings = filteredBookings.filter(booking => 
          booking.userId === options.userId
        );
      }
      
      if (options?.yachtId) {
        filteredBookings = filteredBookings.filter(booking => 
          booking.yachtId === options.yachtId
        );
      }
      
      if (options?.producerId) {
        filteredBookings = filteredBookings.filter(booking => 
          booking.producerId === options.producerId
        );
      }
      
      if (options?.startDate) {
        filteredBookings = filteredBookings.filter(booking => 
          booking.startDate >= options.startDate
        );
      }
      
      if (options?.endDate) {
        filteredBookings = filteredBookings.filter(booking => 
          booking.endDate <= options.endDate
        );
      }
      
      // Apply sorting
      if (options?.sortBy) {
        const sortField = options.sortBy;
        const sortDir = options?.sortDir || 'asc';
        
        filteredBookings.sort((a: any, b: any) => {
          const aValue = a[sortField];
          const bValue = b[sortField];
          
          if (aValue === bValue) return 0;
          
          if (sortDir === 'asc') {
            return aValue < bValue ? -1 : 1;
          } else {
            return aValue > bValue ? -1 : 1;
          }
        });
      }
      
      const totalCount = filteredBookings.length;
      const startIndex = (page - 1) * pageSize;
      const items = filteredBookings.slice(startIndex, startIndex + pageSize);
      
      return {
        items,
        totalCount,
        hasMore: startIndex + pageSize < totalCount
      };
    });
  }
  
  /**
   * Find overlapping bookings
   * @param yachtId Yacht ID
   * @param startDate Start date
   * @param endDate End date
   * @param excludeBookingId Booking ID to exclude (for updates)
   */
  async findOverlappingBookings(
    yachtId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string
  ): Promise<Booking[]> {
    return this.executeMethod<Booking[]>(
      'findOverlappingBookings', 
      [yachtId, startDate, endDate, excludeBookingId], 
      () => {
        return Array.from(this.bookings.values())
          .filter(booking => 
            booking.yachtId === yachtId &&
            booking.id !== excludeBookingId && 
            booking.status !== BookingStatus.CANCELLED &&
            // Check for date overlaps
            ((booking.startDate <= endDate && booking.endDate >= startDate) ||
             (booking.startDate >= startDate && booking.startDate <= endDate) ||
             (booking.endDate >= startDate && booking.endDate <= endDate))
          );
      }
    );
  }
  
  /**
   * Check if a time slot is available
   * @param yachtId Yacht ID
   * @param date Booking date
   * @param timeSlot Time slot
   * @param excludeBookingId Booking ID to exclude (for updates)
   */
  async isTimeSlotAvailable(
    yachtId: string,
    date: Date,
    timeSlot: TimeSlot,
    excludeBookingId?: string
  ): Promise<boolean> {
    return this.executeMethod<boolean>(
      'isTimeSlotAvailable', 
      [yachtId, date, timeSlot, excludeBookingId], 
      () => {
        // Convert timeSlot to Date objects for the given date
        const startDate = new Date(date);
        startDate.setHours(timeSlot.startHour || 0, timeSlot.startMinute || 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(timeSlot.endHour || 0, timeSlot.endMinute || 0, 0, 0);
        
        // Find overlapping bookings
        const overlappingBookings = Array.from(this.bookings.values())
          .filter(booking => 
            booking.yachtId === yachtId &&
            booking.id !== excludeBookingId && 
            booking.status !== BookingStatus.CANCELLED &&
            // Check for date overlaps
            ((booking.startDate <= endDate && booking.endDate >= startDate) ||
             (booking.startDate >= startDate && booking.startDate <= endDate) ||
             (booking.endDate >= startDate && booking.endDate <= endDate))
          );
        
        return overlappingBookings.length === 0;
      }
    );
  }
  
  /**
   * Count bookings matching criteria
   * @param options Query options
   */
  async count(options?: BookingQueryOptions): Promise<number> {
    return this.executeMethod<number>('count', [options], () => {
      let filteredBookings = Array.from(this.bookings.values());
      
      // Apply filters
      if (options?.status) {
        filteredBookings = filteredBookings.filter(booking => 
          booking.status === options.status
        );
      }
      
      if (options?.userId) {
        filteredBookings = filteredBookings.filter(booking => 
          booking.userId === options.userId
        );
      }
      
      if (options?.yachtId) {
        filteredBookings = filteredBookings.filter(booking => 
          booking.yachtId === options.yachtId
        );
      }
      
      if (options?.producerId) {
        filteredBookings = filteredBookings.filter(booking => 
          booking.producerId === options.producerId
        );
      }
      
      return filteredBookings.length;
    });
  }
  
  /**
   * Set mock bookings for testing
   * @param bookings Array of bookings to use as mock data
   */
  setMockBookings(bookings: Booking[]): void {
    this.bookings.clear();
    for (const booking of bookings) {
      this.bookings.set(booking.id, booking);
    }
  }
  
  /**
   * Clear all mock bookings
   */
  clearMockBookings(): void {
    this.bookings.clear();
  }
}