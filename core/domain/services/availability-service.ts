/**
 * Availability Service
 * 
 * Domain service for handling availability and scheduling logic
 */

import { TimeSlot } from '../booking/time-slot';
import { Booking } from '../booking/booking';
import { BookingStatusType } from '../booking/booking-status';

/**
 * Available time slot
 */
export interface AvailableTimeSlot {
  timeSlot: TimeSlot;
  isAvailable: boolean;
  remainingCapacity: number;
}

/**
 * Availability check result
 */
export interface AvailabilityResult {
  date: Date;
  timeSlots: AvailableTimeSlot[];
  isFullyBooked: boolean;
}

/**
 * Block reason type
 */
export enum BlockReasonType {
  MAINTENANCE = 'maintenance',
  WEATHER = 'weather',
  HOLIDAY = 'holiday',
  RESERVED = 'reserved',
  OTHER = 'other'
}

/**
 * Time block
 */
export interface TimeBlock {
  id: string;
  yachtId?: string;
  packageId?: string;
  startDate: Date;
  endDate: Date;
  reason: BlockReasonType;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

/**
 * Availability service
 */
export class AvailabilityService {
  /**
   * Standard time slots
   */
  private standardTimeSlots: TimeSlot[] = [
    new TimeSlot('morning', 'Morning Cruise', 9, 0, 13, 0),
    new TimeSlot('afternoon', 'Afternoon Cruise', 14, 0, 18, 0),
    new TimeSlot('evening', 'Sunset Cruise', 18, 30, 22, 0),
    new TimeSlot('full_day', 'Full Day Charter', 9, 0, 18, 0)
  ];
  
  constructor(customTimeSlots?: TimeSlot[]) {
    if (customTimeSlots && customTimeSlots.length > 0) {
      this.standardTimeSlots = customTimeSlots;
    }
  }
  
  /**
   * Set custom time slots
   */
  setTimeSlots(timeSlots: TimeSlot[]): void {
    this.standardTimeSlots = timeSlots;
  }
  
  /**
   * Get the standard time slots
   */
  getStandardTimeSlots(): TimeSlot[] {
    return [...this.standardTimeSlots];
  }
  
  /**
   * Get available time slots for a specific date
   */
  getAvailability(
    date: Date,
    packageId: string,
    yachtId: string | undefined,
    existingBookings: Booking[],
    timeBlocks: TimeBlock[],
    maxCapacity: number = 1
  ): AvailabilityResult {
    // Reset hours to ensure we're just comparing dates
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    // Filter bookings for this package/yacht and date
    const relevantBookings = existingBookings.filter(booking => {
      const bookingDate = new Date(booking.bookingDate);
      bookingDate.setHours(0, 0, 0, 0);
      
      return bookingDate.getTime() === targetDate.getTime() &&
             (booking.packageId === packageId || (yachtId && booking.yachtId === yachtId)) &&
             booking.status.type !== BookingStatusType.CANCELLED &&
             booking.status.type !== BookingStatusType.DRAFT;
    });
    
    // Check for time blocks that might affect this date
    const relevantBlocks = timeBlocks.filter(block => {
      const blockStart = new Date(block.startDate);
      const blockEnd = new Date(block.endDate);
      
      // Check if block applies to this yacht/package
      const matchesResource = 
        (!block.yachtId && !block.packageId) || // Global block
        (yachtId && block.yachtId === yachtId) || // Matches yacht
        (block.packageId === packageId); // Matches package
      
      // Check if date falls within block period
      blockStart.setHours(0, 0, 0, 0);
      blockEnd.setHours(23, 59, 59, 999);
      
      return matchesResource && 
             targetDate.getTime() >= blockStart.getTime() && 
             targetDate.getTime() <= blockEnd.getTime();
    });
    
    // Calculate availability for each time slot
    const availableTimeSlots = this.standardTimeSlots.map(timeSlot => {
      // Check for blocks that completely block this time slot
      const isBlocked = relevantBlocks.some(block => this.isTimeSlotBlocked(timeSlot, block));
      
      if (isBlocked) {
        return {
          timeSlot,
          isAvailable: false,
          remainingCapacity: 0
        };
      }
      
      // Count bookings that overlap with this time slot
      const overlappingBookings = relevantBookings.filter(booking => 
        booking.timeSlot && this.doTimeSlotsOverlap(booking.timeSlot, timeSlot)
      );
      
      const remainingCapacity = Math.max(0, maxCapacity - overlappingBookings.length);
      
      return {
        timeSlot,
        isAvailable: remainingCapacity > 0,
        remainingCapacity
      };
    });
    
    return {
      date: targetDate,
      timeSlots: availableTimeSlots,
      isFullyBooked: availableTimeSlots.every(slot => !slot.isAvailable)
    };
  }
  
  /**
   * Get availability for a date range
   */
  getAvailabilityForDateRange(
    startDate: Date,
    endDate: Date,
    packageId: string,
    yachtId: string | undefined,
    existingBookings: Booking[],
    timeBlocks: TimeBlock[],
    maxCapacity: number = 1
  ): AvailabilityResult[] {
    const results: AvailabilityResult[] = [];
    
    // Clone dates to avoid modifying the originals
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Reset hours to ensure we're just comparing dates
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    // Loop through each day in the range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const result = this.getAvailability(
        new Date(currentDate),
        packageId,
        yachtId,
        existingBookings,
        timeBlocks,
        maxCapacity
      );
      
      results.push(result);
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return results;
  }
  
  /**
   * Find next available date and time slot
   */
  findNextAvailableSlot(
    startDate: Date,
    lookAheadDays: number,
    packageId: string,
    yachtId: string | undefined,
    existingBookings: Booking[],
    timeBlocks: TimeBlock[],
    maxCapacity: number = 1,
    preferredTimeSlotType?: string
  ): { date: Date; availableSlot: AvailableTimeSlot } | null {
    // Clone date to avoid modifying the original
    const currentDate = new Date(startDate);
    
    // Look ahead for specified number of days
    for (let day = 0; day < lookAheadDays; day++) {
      const availability = this.getAvailability(
        currentDate,
        packageId,
        yachtId,
        existingBookings,
        timeBlocks,
        maxCapacity
      );
      
      // If preferred time slot is specified, check that first
      if (preferredTimeSlotType) {
        const preferredSlot = availability.timeSlots.find(slot => 
          slot.timeSlot.type === preferredTimeSlotType && slot.isAvailable
        );
        
        if (preferredSlot) {
          return {
            date: new Date(currentDate),
            availableSlot: preferredSlot
          };
        }
      }
      
      // Otherwise find any available slot
      const availableSlot = availability.timeSlots.find(slot => slot.isAvailable);
      
      if (availableSlot) {
        return {
          date: new Date(currentDate),
          availableSlot
        };
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // No availability found in the look-ahead period
    return null;
  }
  
  /**
   * Create a time block (make dates/times unavailable)
   */
  createTimeBlock(
    id: string,
    startDate: Date,
    endDate: Date,
    reason: BlockReasonType,
    createdBy: string,
    packageId?: string,
    yachtId?: string,
    notes?: string
  ): TimeBlock {
    // Validate time block
    if (startDate > endDate) {
      throw new Error('End date must be after start date');
    }
    
    return {
      id,
      startDate,
      endDate,
      reason,
      packageId,
      yachtId,
      notes,
      createdBy,
      createdAt: new Date()
    };
  }
  
  /**
   * Check if a booking conflicts with existing bookings
   */
  checkBookingConflicts(
    booking: Booking,
    existingBookings: Booking[]
  ): { hasConflict: boolean; conflictingBookingIds: string[] } {
    if (!booking.timeSlot) {
      // If no time slot specified, there's no conflict
      return { hasConflict: false, conflictingBookingIds: [] };
    }
    
    // Find bookings for the same date, yacht, and overlapping time slot
    const bookingDate = new Date(booking.bookingDate);
    bookingDate.setHours(0, 0, 0, 0);
    
    const conflictingBookings = existingBookings.filter(existingBooking => {
      // Skip if it's the same booking or cancelled/draft booking
      if (
        existingBooking.id === booking.id ||
        existingBooking.status.type === BookingStatusType.CANCELLED ||
        existingBooking.status.type === BookingStatusType.DRAFT
      ) {
        return false;
      }
      
      // Check if it's the same package or yacht
      const isSameResource = 
        existingBooking.packageId === booking.packageId ||
        (booking.yachtId && existingBooking.yachtId === booking.yachtId);
      
      if (!isSameResource) {
        return false;
      }
      
      // Check if it's the same date
      const existingDate = new Date(existingBooking.bookingDate);
      existingDate.setHours(0, 0, 0, 0);
      
      const isSameDate = existingDate.getTime() === bookingDate.getTime();
      
      if (!isSameDate) {
        return false;
      }
      
      // Check for time slot overlap
      return existingBooking.timeSlot && 
             this.doTimeSlotsOverlap(existingBooking.timeSlot, booking.timeSlot!);
    });
    
    return {
      hasConflict: conflictingBookings.length > 0,
      conflictingBookingIds: conflictingBookings.map(booking => booking.id)
    };
  }
  
  /**
   * Check if a time slot is blocked by a time block
   */
  private isTimeSlotBlocked(timeSlot: TimeSlot, block: TimeBlock): boolean {
    // If time slot doesn't have specific times, assume it's blocked for the whole day
    if (!timeSlot.startTime || !timeSlot.endTime) {
      return true;
    }
    
    // Get date portions from block
    const blockStart = new Date(block.startDate);
    const blockEnd = new Date(block.endDate);
    
    // Set time portion of block dates to match time slot
    const blockStartWithTime = new Date(blockStart);
    blockStartWithTime.setHours(
      timeSlot.startHour || 0,
      timeSlot.startMinute || 0,
      0, 0
    );
    
    const blockEndWithTime = new Date(blockEnd);
    blockEndWithTime.setHours(
      timeSlot.endHour || 23,
      timeSlot.endMinute || 59,
      59, 999
    );
    
    // Check if block completely encompasses the time slot
    return blockStart <= blockStartWithTime && blockEnd >= blockEndWithTime;
  }
  
  /**
   * Check if two time slots overlap
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