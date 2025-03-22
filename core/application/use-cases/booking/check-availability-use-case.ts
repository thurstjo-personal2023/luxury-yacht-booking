/**
 * Check Availability Use Case
 * 
 * Application layer use case for checking booking availability
 */

import { AvailabilityService, AvailabilityResult } from '../../../domain/services/availability-service';
import { IBookingRepository } from '../../../domain/repositories/booking-repository';
import { IYachtRepository } from '../../../domain/repositories/yacht-repository';
import { TimeSlot } from '../../../domain/booking/time-slot';

/**
 * Check availability input DTO
 */
export interface CheckAvailabilityInput {
  packageId: string;
  yachtId?: string;
  date: Date | string;
  startDate?: Date | string;
  endDate?: Date | string;
  timeSlotType?: string;
}

/**
 * Available time slot DTO
 */
export interface AvailableTimeSlotDTO {
  type: string;
  name: string;
  startTime?: string;
  endTime?: string;
  isAvailable: boolean;
  remainingCapacity: number;
}

/**
 * Availability day DTO
 */
export interface AvailabilityDayDTO {
  date: string;
  timeSlots: AvailableTimeSlotDTO[];
  isFullyBooked: boolean;
}

/**
 * Check availability output DTO
 */
export interface CheckAvailabilityOutput {
  success: boolean;
  singleDay?: AvailabilityDayDTO;
  dateRange?: AvailabilityDayDTO[];
  nextAvailable?: {
    date: string;
    timeSlot: AvailableTimeSlotDTO;
  };
  errors?: string[];
}

/**
 * Check availability use case
 */
export class CheckAvailabilityUseCase {
  constructor(
    private bookingRepository: IBookingRepository,
    private yachtRepository: IYachtRepository,
    private availabilityService: AvailabilityService
  ) {}
  
  /**
   * Execute the use case
   */
  async execute(input: CheckAvailabilityInput): Promise<CheckAvailabilityOutput> {
    try {
      // 1. Validate input package exists
      const packageInfo = await this.yachtRepository.findYachtPackageById(input.packageId);
      if (!packageInfo) {
        return {
          success: false,
          errors: [`Package with ID ${input.packageId} not found`]
        };
      }
      
      // 2. Validate yacht if provided
      if (input.yachtId) {
        const yachtInfo = await this.yachtRepository.findYachtById(input.yachtId);
        if (!yachtInfo) {
          return {
            success: false,
            errors: [`Yacht with ID ${input.yachtId} not found`]
          };
        }
      }
      
      // 3. Get capacity for the package/yacht
      const capacity = await this.yachtRepository.getYachtPackageCapacity(input.packageId);
      
      // 4. Get existing bookings and time blocks
      const targetDate = input.date instanceof Date ? input.date : new Date(input.date);
      const bookingDate = new Date(targetDate);
      bookingDate.setHours(0, 0, 0, 0);
      
      // Find any bookings that might affect availability
      const existingBookings = await this.bookingRepository.findConflictingBookings(
        input.packageId,
        bookingDate
      );
      
      // Find any time blocks (maintenance, etc.) that affect availability
      const timeBlocks = await this.bookingRepository.findTimeBlocks(
        bookingDate,
        bookingDate,
        input.packageId,
        input.yachtId
      );
      
      // 5. Handle single date availability check
      if (!input.startDate && !input.endDate) {
        const availabilityResult = this.availabilityService.getAvailability(
          bookingDate,
          input.packageId,
          input.yachtId,
          existingBookings,
          timeBlocks,
          capacity
        );
        
        return {
          success: true,
          singleDay: this.mapAvailabilityResultToDTO(availabilityResult)
        };
      }
      
      // 6. Handle date range availability check
      if (input.startDate && input.endDate) {
        const startDate = input.startDate instanceof Date ? input.startDate : new Date(input.startDate);
        const endDate = input.endDate instanceof Date ? input.endDate : new Date(input.endDate);
        
        const rangeResults = await this.getDateRangeAvailability(
          startDate,
          endDate,
          input.packageId,
          input.yachtId,
          capacity
        );
        
        return {
          success: true,
          dateRange: rangeResults
        };
      }
      
      // 7. Find next available slot if requested
      if (input.timeSlotType) {
        const startDate = input.startDate instanceof Date ? input.startDate : new Date(input.startDate || input.date);
        
        // Find all bookings in next 30 days
        const thirtyDaysLater = new Date(startDate);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        
        const rangeBookings = await this.bookingRepository.findByCriteria({
          packageId: input.packageId,
          yachtId: input.yachtId,
          startDate,
          endDate: thirtyDaysLater
        });
        
        const rangeBlocks = await this.bookingRepository.findTimeBlocks(
          startDate,
          thirtyDaysLater,
          input.packageId,
          input.yachtId
        );
        
        const nextAvailable = this.availabilityService.findNextAvailableSlot(
          startDate,
          30, // Look ahead 30 days
          input.packageId,
          input.yachtId,
          rangeBookings,
          rangeBlocks,
          capacity,
          input.timeSlotType
        );
        
        if (nextAvailable) {
          return {
            success: true,
            nextAvailable: {
              date: nextAvailable.date.toISOString(),
              timeSlot: {
                type: nextAvailable.availableSlot.timeSlot.type,
                name: nextAvailable.availableSlot.timeSlot.name,
                startTime: nextAvailable.availableSlot.timeSlot.startTime,
                endTime: nextAvailable.availableSlot.timeSlot.endTime,
                isAvailable: nextAvailable.availableSlot.isAvailable,
                remainingCapacity: nextAvailable.availableSlot.remainingCapacity
              }
            }
          };
        } else {
          return {
            success: true,
            errors: ['No availability found in the next 30 days']
          };
        }
      }
      
      return {
        success: false,
        errors: ['Invalid availability check parameters']
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'An unknown error occurred']
      };
    }
  }
  
  /**
   * Get availability for a date range
   */
  private async getDateRangeAvailability(
    startDate: Date,
    endDate: Date,
    packageId: string,
    yachtId: string | undefined,
    capacity: number
  ): Promise<AvailabilityDayDTO[]> {
    // Find all bookings in the date range
    const rangeBookings = await this.bookingRepository.findByCriteria({
      packageId,
      yachtId,
      startDate,
      endDate
    });
    
    // Find any time blocks in the date range
    const rangeBlocks = await this.bookingRepository.findTimeBlocks(
      startDate,
      endDate,
      packageId,
      yachtId
    );
    
    // Get availability for each day in the range
    const availabilityResults = this.availabilityService.getAvailabilityForDateRange(
      startDate,
      endDate,
      packageId,
      yachtId,
      rangeBookings,
      rangeBlocks,
      capacity
    );
    
    // Map to DTOs
    return availabilityResults.map(this.mapAvailabilityResultToDTO);
  }
  
  /**
   * Map domain availability result to DTO
   */
  private mapAvailabilityResultToDTO(result: AvailabilityResult): AvailabilityDayDTO {
    return {
      date: result.date.toISOString(),
      timeSlots: result.timeSlots.map(slot => ({
        type: slot.timeSlot.type,
        name: slot.timeSlot.name,
        startTime: slot.timeSlot.startTime,
        endTime: slot.timeSlot.endTime,
        isAvailable: slot.isAvailable,
        remainingCapacity: slot.remainingCapacity
      })),
      isFullyBooked: result.isFullyBooked
    };
  }
}