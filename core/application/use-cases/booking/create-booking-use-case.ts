/**
 * Create Booking Use Case
 * 
 * Application layer use case for creating a new booking
 */

import { v4 as uuidv4 } from 'uuid';
import { Booking } from '../../../domain/booking/booking';
import { CustomerDetails } from '../../../domain/booking/customer-details';
import { BookingItem } from '../../../domain/booking/booking-item';
import { TimeSlot } from '../../../domain/booking/time-slot';
import { BookingService, BookingCreationResult } from '../../../domain/services/booking-service';
import { PricingService, Discount } from '../../../domain/services/pricing-service';
import { AvailabilityService } from '../../../domain/services/availability-service';
import { IBookingRepository } from '../../../domain/repositories/booking-repository';
import { IYachtRepository } from '../../../domain/repositories/yacht-repository';

/**
 * Create booking input DTO
 */
export interface CreateBookingInput {
  // Customer information
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  specialRequests?: string;
  
  // Booking details
  packageId: string;
  yachtId?: string;
  bookingDate: Date | string;
  timeSlotType?: string;
  timeSlotStartHour?: number;
  timeSlotStartMinute?: number;
  timeSlotEndHour?: number;
  timeSlotEndMinute?: number;
  
  // Items and add-ons
  addonIds?: string[];
  optionalAddonIds?: string[];
  customizations?: Array<{
    id: string;
    quantity: number;
  }>;
  
  // Discounts
  discountCodes?: string[];
  
  // Additional info
  producerId?: string;
  metadata?: Record<string, any>;
}

/**
 * Create booking output DTO
 */
export interface CreateBookingOutput {
  success: boolean;
  booking?: {
    id: string;
    packageId: string;
    yachtId?: string;
    customerId: string;
    bookingDate: string;
    timeSlot?: {
      type: string;
      name: string;
      startTime?: string;
      endTime?: string;
    };
    totalAmount: number;
    status: string;
    items: Array<{
      id: string;
      name: string;
      type: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    }>;
    confirmationCode?: string;
    createdAt: string;
  };
  errors?: string[];
  availabilityConflicts?: string[];
}

/**
 * Create booking use case
 */
export class CreateBookingUseCase {
  constructor(
    private bookingRepository: IBookingRepository,
    private yachtRepository: IYachtRepository,
    private bookingService: BookingService,
    private pricingService: PricingService,
    private availabilityService: AvailabilityService
  ) {}
  
  /**
   * Execute the use case
   */
  async execute(input: CreateBookingInput): Promise<CreateBookingOutput> {
    try {
      // Convert string date to Date object if needed
      const bookingDate = input.bookingDate instanceof Date 
        ? input.bookingDate 
        : new Date(input.bookingDate);
      
      // 1. Validate input package exists
      const packageInfo = await this.yachtRepository.findYachtPackageById(input.packageId);
      if (!packageInfo) {
        return {
          success: false,
          errors: [`Package with ID ${input.packageId} not found`]
        };
      }
      
      // 2. Validate yacht if provided
      let yachtInfo = null;
      if (input.yachtId) {
        yachtInfo = await this.yachtRepository.findYachtById(input.yachtId);
        if (!yachtInfo) {
          return {
            success: false,
            errors: [`Yacht with ID ${input.yachtId} not found`]
          };
        }
      }
      
      // 3. Create time slot if provided
      let timeSlot: TimeSlot | undefined;
      if (input.timeSlotType) {
        timeSlot = new TimeSlot(
          input.timeSlotType,
          `${input.timeSlotType.charAt(0).toUpperCase()}${input.timeSlotType.slice(1)} Booking`,
          input.timeSlotStartHour,
          input.timeSlotStartMinute,
          input.timeSlotEndHour,
          input.timeSlotEndMinute
        );
      }
      
      // 4. Check availability
      const existingBookings = await this.bookingRepository.findConflictingBookings(
        input.packageId,
        bookingDate,
        timeSlot
      );
      
      const availabilityResult = this.availabilityService.checkBookingConflicts(
        { 
          // Create a minimal booking object just for conflict checking
          timeSlot, 
          packageId: input.packageId, 
          yachtId: input.yachtId,
          bookingDate
        } as Booking,
        existingBookings
      );
      
      if (availabilityResult.hasConflict) {
        return {
          success: false,
          errors: ['Selected date and time slot is not available'],
          availabilityConflicts: availabilityResult.conflictingBookingIds
        };
      }
      
      // 5. Create customer details
      const customerDetails = new CustomerDetails(
        input.customerName,
        {
          email: input.customerEmail,
          phone: input.customerPhone
        },
        input.customerId,
        input.specialRequests
      );
      
      // 6. Create booking items
      const items: BookingItem[] = [];
      
      // Add main package as first item
      const mainItem = new BookingItem(
        `item-package-${uuidv4().substring(0, 8)}`,
        'package',
        packageInfo.title,
        packageInfo.pricing,
        1,
        packageInfo.pricing,
        true,
        undefined,
        input.packageId
      );
      
      items.push(mainItem);
      
      // TODO: Add code to handle addon items and customizations
      // This will require retrieving addon information from the repository
      
      // 7. Create booking
      const bookingId = `booking-${uuidv4()}`;
      const bookingResult = this.bookingService.createBooking(
        bookingId,
        input.packageId,
        input.customerId,
        customerDetails,
        bookingDate,
        items,
        [], // discounts - would be applied based on discount codes
        input.yachtId,
        timeSlot,
        input.producerId
      );
      
      if (!bookingResult.success || !bookingResult.booking) {
        return {
          success: false,
          errors: [bookingResult.error || 'Failed to create booking']
        };
      }
      
      // 8. Save booking to repository
      const savedBooking = await this.bookingRepository.save(bookingResult.booking);
      
      // 9. Transform result to output DTO
      return {
        success: true,
        booking: {
          id: savedBooking.id,
          packageId: savedBooking.packageId,
          yachtId: savedBooking.yachtId,
          customerId: savedBooking.customerId,
          bookingDate: savedBooking.bookingDate.toISOString(),
          timeSlot: savedBooking.timeSlot ? {
            type: savedBooking.timeSlot.type,
            name: savedBooking.timeSlot.name,
            startTime: savedBooking.timeSlot.startTime,
            endTime: savedBooking.timeSlot.endTime
          } : undefined,
          totalAmount: savedBooking.totalAmount,
          status: savedBooking.status.toString(),
          items: savedBooking.items.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            totalPrice: item.totalPrice
          })),
          confirmationCode: savedBooking.confirmationCode,
          createdAt: savedBooking.createdAt.toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'An unknown error occurred']
      };
    }
  }
}