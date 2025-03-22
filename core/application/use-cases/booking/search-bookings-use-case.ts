/**
 * Search Bookings Use Case
 * 
 * Application layer use case for searching and listing bookings
 */

import { IBookingRepository, BookingSearchCriteria } from '../../../domain/repositories/booking-repository';
import { BookingStatusType } from '../../../domain/booking/booking-status';

/**
 * Search bookings input DTO
 */
export interface SearchBookingsInput {
  userId: string;
  userRole: string;
  customerId?: string;
  producerId?: string;
  packageId?: string;
  yachtId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  status?: string[];
  confirmationCode?: string;
  page?: number;
  limit?: number;
}

/**
 * Booking summary item DTO
 */
export interface BookingSummary {
  id: string;
  packageId: string;
  packageName: string;
  yachtId?: string;
  yachtName?: string;
  status: string;
  bookingDate: string;
  timeSlot?: {
    type: string;
    name: string;
  };
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  confirmationCode?: string;
  checkInStatus: string;
  isPaid: boolean;
  createdAt: string;
}

/**
 * Search bookings output DTO
 */
export interface SearchBookingsOutput {
  success: boolean;
  bookings?: BookingSummary[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  errors?: string[];
}

/**
 * Search bookings use case
 */
export class SearchBookingsUseCase {
  constructor(
    private bookingRepository: IBookingRepository
  ) {}
  
  /**
   * Execute the use case
   */
  async execute(input: SearchBookingsInput): Promise<SearchBookingsOutput> {
    try {
      // 1. Build search criteria based on role and permissions
      const criteria: BookingSearchCriteria = {
        limit: input.limit || 10,
        offset: ((input.page || 1) - 1) * (input.limit || 10)
      };
      
      // Parse dates if provided as strings
      if (input.startDate) {
        criteria.startDate = input.startDate instanceof Date 
          ? input.startDate 
          : new Date(input.startDate);
      }
      
      if (input.endDate) {
        criteria.endDate = input.endDate instanceof Date 
          ? input.endDate 
          : new Date(input.endDate);
      }
      
      // Apply filters based on user role and permissions
      switch (input.userRole) {
        case 'consumer':
          // Consumers can only view their own bookings
          criteria.customerId = input.userId;
          break;
          
        case 'producer':
          // Producers can view bookings for their packages/yachts
          criteria.producerId = input.userId;
          
          // Apply additional filters if provided
          if (input.packageId) criteria.packageId = input.packageId;
          if (input.yachtId) criteria.yachtId = input.yachtId;
          if (input.customerId) criteria.customerId = input.customerId;
          if (input.status && input.status.length > 0) criteria.status = input.status;
          if (input.confirmationCode) criteria.confirmationCode = input.confirmationCode;
          break;
          
        case 'partner':
          // Partners can only view bookings that include their add-ons
          // This is a complex query that might require custom implementation
          // For now, we'll add a note about this limitation
          return {
            success: false,
            errors: ['Partner booking search requires custom implementation']
          };
          
        case 'admin':
          // Admins can view all bookings and apply any filters
          if (input.packageId) criteria.packageId = input.packageId;
          if (input.yachtId) criteria.yachtId = input.yachtId;
          if (input.customerId) criteria.customerId = input.customerId;
          if (input.producerId) criteria.producerId = input.producerId;
          if (input.status && input.status.length > 0) criteria.status = input.status;
          if (input.confirmationCode) criteria.confirmationCode = input.confirmationCode;
          break;
          
        default:
          return {
            success: false,
            errors: ['Invalid user role or insufficient permissions']
          };
      }
      
      // 2. Execute the search
      const { bookings, total } = await this.bookingRepository.search(criteria);
      
      // 3. Transform results to output DTO
      const bookingSummaries: BookingSummary[] = bookings.map(booking => ({
        id: booking.id,
        packageId: booking.packageId,
        packageName: '', // Would normally be populated from a package lookup
        yachtId: booking.yachtId,
        yachtName: '', // Would normally be populated from a yacht lookup
        status: booking.status.toString(),
        bookingDate: booking.bookingDate.toISOString(),
        timeSlot: booking.timeSlot ? {
          type: booking.timeSlot.type,
          name: booking.timeSlot.name
        } : undefined,
        customerName: booking.customerDetails.name,
        customerEmail: booking.customerDetails.contactInformation.email,
        totalAmount: booking.totalAmount,
        confirmationCode: booking.confirmationCode,
        checkInStatus: booking.checkInStatus,
        isPaid: booking.isPaid(),
        createdAt: booking.createdAt.toISOString()
      }));
      
      // 4. Calculate pagination info
      const limit = input.limit || 10;
      const page = input.page || 1;
      const totalPages = Math.ceil(total / limit);
      
      return {
        success: true,
        bookings: bookingSummaries,
        pagination: {
          total,
          page,
          limit,
          totalPages
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