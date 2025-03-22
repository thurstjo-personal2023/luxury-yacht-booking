/**
 * Get Booking Use Case
 * 
 * Application layer use case for retrieving booking details
 */

import { IBookingRepository } from '../../../domain/repositories/booking-repository';
import { IYachtRepository } from '../../../domain/repositories/yacht-repository';
import { BookingItem } from '../../../domain/booking/booking-item';

/**
 * Get booking input DTO
 */
export interface GetBookingInput {
  bookingId: string;
  userId?: string;  // User requesting the booking (for authorization)
  userRole?: string;  // Role of user requesting the booking
}

/**
 * Get booking output DTO
 */
export interface GetBookingOutput {
  success: boolean;
  booking?: {
    id: string;
    packageId: string;
    yachtId?: string;
    packageName: string;
    yachtName?: string;
    status: string;
    customerId: string;
    customerDetails: {
      name: string;
      email: string;
      phone?: string;
      specialRequests?: string;
    };
    producerId?: string;
    producerName?: string;
    bookingDate: string;
    timeSlot?: {
      type: string;
      name: string;
      startTime?: string;
      endTime?: string;
    };
    checkInStatus: string;
    items: Array<{
      id: string;
      type: string;
      name: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
      isRequired: boolean;
      isPartnerItem: boolean;
      partnerId?: string;
      partnerName?: string;
    }>;
    totalAmount: number;
    paymentDetails?: {
      method: string;
      status: string;
      amount: number;
      currency: string;
      transactionId?: string;
      processingDate: string;
    };
    confirmationCode?: string;
    notes?: string;
    cancelledAt?: string;
    cancellationReason?: string;
    createdAt: string;
    updatedAt: string;
  };
  errors?: string[];
}

/**
 * Get booking use case
 */
export class GetBookingUseCase {
  constructor(
    private bookingRepository: IBookingRepository,
    private yachtRepository: IYachtRepository
  ) {}
  
  /**
   * Execute the use case
   */
  async execute(input: GetBookingInput): Promise<GetBookingOutput> {
    try {
      // 1. Retrieve booking from repository
      const booking = await this.bookingRepository.findById(input.bookingId);
      
      if (!booking) {
        return {
          success: false,
          errors: [`Booking with ID ${input.bookingId} not found`]
        };
      }
      
      // 2. Authorize access to booking
      // Only the customer, producer, partner provider, or admin can view a booking
      if (input.userId && input.userRole !== 'admin') {
        const isCustomer = input.userId === booking.customerId;
        const isProducer = input.userId === booking.producerId;
        const isPartnerWithItems = this.hasPartnerItems(booking.items, input.userId);
        
        if (!isCustomer && !isProducer && !isPartnerWithItems) {
          return {
            success: false,
            errors: ['Not authorized to view this booking']
          };
        }
      }
      
      // 3. Retrieve additional information
      // Get package details
      let packageName = '';
      let yachtName = '';
      let producerName = '';
      
      try {
        const packageInfo = await this.yachtRepository.findYachtPackageById(booking.packageId);
        if (packageInfo) {
          packageName = packageInfo.title;
          producerName = packageInfo.producerId || '';
        }
        
        if (booking.yachtId) {
          const yachtInfo = await this.yachtRepository.findYachtById(booking.yachtId);
          if (yachtInfo) {
            yachtName = yachtInfo.name;
          }
        }
      } catch (error) {
        // Non-fatal error - continue with available data
        console.error('Error fetching package or yacht details:', error);
      }
      
      // 4. Transform the booking to output DTO
      return {
        success: true,
        booking: {
          id: booking.id,
          packageId: booking.packageId,
          yachtId: booking.yachtId,
          packageName,
          yachtName,
          status: booking.status.toString(),
          customerId: booking.customerId,
          customerDetails: {
            name: booking.customerDetails.name,
            email: booking.customerDetails.contactInformation.email,
            phone: booking.customerDetails.contactInformation.phone,
            specialRequests: booking.customerDetails.specialRequests
          },
          producerId: booking.producerId,
          producerName,
          bookingDate: booking.bookingDate.toISOString(),
          timeSlot: booking.timeSlot ? {
            type: booking.timeSlot.type,
            name: booking.timeSlot.name,
            startTime: booking.timeSlot.startTime,
            endTime: booking.timeSlot.endTime
          } : undefined,
          checkInStatus: booking.checkInStatus,
          items: booking.items.map(item => ({
            id: item.id,
            type: item.type,
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            isRequired: item.isRequired,
            isPartnerItem: item.isPartnerItem(),
            partnerId: item.providerId,
            partnerName: '' // Would normally lookup partner name
          })),
          totalAmount: booking.totalAmount,
          paymentDetails: booking.paymentDetails ? {
            method: booking.paymentDetails.method,
            status: booking.paymentDetails.status.toString(),
            amount: booking.paymentDetails.amount,
            currency: booking.paymentDetails.currency,
            transactionId: booking.paymentDetails.transactionId,
            processingDate: booking.paymentDetails.processingDate.toISOString()
          } : undefined,
          confirmationCode: booking.confirmationCode,
          notes: booking.notes,
          cancelledAt: booking.cancelledAt?.toISOString(),
          cancellationReason: booking.cancellationReason,
          createdAt: booking.createdAt.toISOString(),
          updatedAt: booking.updatedAt.toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'An unknown error occurred']
      };
    }
  }
  
  /**
   * Helper to check if any booking items are from a specific partner
   */
  private hasPartnerItems(items: BookingItem[], partnerId: string): boolean {
    return items.some(item => 
      item.isPartnerItem() && 
      item.providerId === partnerId
    );
  }
}