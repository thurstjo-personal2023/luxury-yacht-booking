/**
 * Confirm Booking Use Case
 * 
 * Application layer use case for confirming a booking
 */

import { BookingService } from '../../../domain/services/booking-service';
import { PaymentDetails } from '../../../domain/booking/payment-details';
import { PaymentStatus } from '../../../domain/booking/payment-status';
import { IBookingRepository } from '../../../domain/repositories/booking-repository';

/**
 * Confirm booking input DTO
 */
export interface ConfirmBookingInput {
  bookingId: string;
  paymentMethod: string;
  paymentId: string;
  paymentAmount: number;
  paymentCurrency?: string;
  paymentMetadata?: Record<string, any>;
  confirmationCode?: string;
}

/**
 * Confirm booking output DTO
 */
export interface ConfirmBookingOutput {
  success: boolean;
  booking?: {
    id: string;
    status: string;
    confirmationCode: string;
    customerDetails: {
      name: string;
      email: string;
      phone?: string;
    };
    bookingDate: string;
    totalAmount: number;
    paymentDetails: {
      method: string;
      transactionId: string;
      status: string;
      amount: number;
      currency: string;
      processingDate: string;
    };
  };
  errors?: string[];
}

/**
 * Confirm booking use case
 */
export class ConfirmBookingUseCase {
  constructor(
    private bookingRepository: IBookingRepository,
    private bookingService: BookingService
  ) {}
  
  /**
   * Execute the use case
   */
  async execute(input: ConfirmBookingInput): Promise<ConfirmBookingOutput> {
    try {
      // 1. Retrieve booking from repository
      const booking = await this.bookingRepository.findById(input.bookingId);
      
      if (!booking) {
        return {
          success: false,
          errors: [`Booking with ID ${input.bookingId} not found`]
        };
      }
      
      // 2. Create payment details
      const paymentDetails = new PaymentDetails(
        `payment-${input.paymentId}`,
        booking.id,
        input.paymentMethod,
        PaymentStatus.COMPLETED,
        input.paymentAmount,
        input.paymentCurrency || 'AED',
        new Date(),
        input.paymentId,
        input.paymentMetadata
      );
      
      // 3. Generate confirmation code if not provided
      const confirmationCode = input.confirmationCode || this.bookingService.generateConfirmationCode(booking);
      
      // 4. Confirm booking
      try {
        const confirmedBooking = this.bookingService.confirmBooking(
          booking,
          paymentDetails,
          confirmationCode
        );
        
        // 5. Save the updated booking to repository
        const savedBooking = await this.bookingRepository.save(confirmedBooking);
        
        // 6. Transform result to output DTO
        return {
          success: true,
          booking: {
            id: savedBooking.id,
            status: savedBooking.status.toString(),
            confirmationCode: savedBooking.confirmationCode || confirmationCode,
            customerDetails: {
              name: savedBooking.customerDetails.name,
              email: savedBooking.customerDetails.contactInformation.email,
              phone: savedBooking.customerDetails.contactInformation.phone,
            },
            bookingDate: savedBooking.bookingDate.toISOString(),
            totalAmount: savedBooking.totalAmount,
            paymentDetails: {
              method: savedBooking.paymentDetails?.method || input.paymentMethod,
              transactionId: savedBooking.paymentDetails?.transactionId || input.paymentId,
              status: savedBooking.paymentDetails?.status.toString() || 'completed',
              amount: savedBooking.paymentDetails?.amount || input.paymentAmount,
              currency: savedBooking.paymentDetails?.currency || input.paymentCurrency || 'AED',
              processingDate: savedBooking.paymentDetails?.processingDate.toISOString() || new Date().toISOString()
            }
          }
        };
      } catch (error) {
        return {
          success: false,
          errors: [error instanceof Error ? error.message : 'Error confirming booking']
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'An unknown error occurred']
      };
    }
  }
}