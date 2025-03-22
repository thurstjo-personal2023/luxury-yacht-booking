/**
 * Cancel Booking Use Case
 * 
 * Application layer use case for cancelling a booking
 */

import { BookingService } from '../../../domain/services/booking-service';
import { IBookingRepository } from '../../../domain/repositories/booking-repository';

/**
 * Cancel booking input DTO
 */
export interface CancelBookingInput {
  bookingId: string;
  cancellationReason?: string;
  cancelledById?: string;  // ID of user who performed the cancellation
  isAdminCancellation?: boolean;  // Whether this is an admin-initiated cancellation
}

/**
 * Cancel booking output DTO
 */
export interface CancelBookingOutput {
  success: boolean;
  booking?: {
    id: string;
    status: string;
    cancelledAt: string;
    cancellationReason?: string;
    refundAmount?: number;
    cancellationPolicy?: string;
  };
  errors?: string[];
}

/**
 * Cancel booking use case
 */
export class CancelBookingUseCase {
  constructor(
    private bookingRepository: IBookingRepository,
    private bookingService: BookingService
  ) {}
  
  /**
   * Execute the use case
   */
  async execute(input: CancelBookingInput): Promise<CancelBookingOutput> {
    try {
      // 1. Retrieve booking from repository
      const booking = await this.bookingRepository.findById(input.bookingId);
      
      if (!booking) {
        return {
          success: false,
          errors: [`Booking with ID ${input.bookingId} not found`]
        };
      }
      
      // 2. Validate cancellation permissions
      // Only the customer or producer can cancel a booking
      // unless it's an admin cancellation
      if (!input.isAdminCancellation && input.cancelledById) {
        if (
          input.cancelledById !== booking.customerId && 
          input.cancelledById !== booking.producerId
        ) {
          return {
            success: false,
            errors: ['Not authorized to cancel this booking']
          };
        }
      }
      
      // 3. Cancel the booking
      const cancellationResult = this.bookingService.cancelBooking(
        booking,
        input.cancellationReason,
        input.cancelledById,
        input.isAdminCancellation
      );
      
      if (!cancellationResult.success || !cancellationResult.booking) {
        return {
          success: false,
          errors: [cancellationResult.error || 'Failed to cancel booking']
        };
      }
      
      // 4. Save the cancelled booking
      const savedBooking = await this.bookingRepository.save(cancellationResult.booking);
      
      // 5. Determine cancellation policy description
      let cancellationPolicy = 'No refund available';
      if (cancellationResult.refundAmount && cancellationResult.refundAmount > 0) {
        if (cancellationResult.refundAmount >= savedBooking.totalAmount) {
          cancellationPolicy = 'Full refund provided';
        } else {
          const refundPercentage = Math.round((cancellationResult.refundAmount / savedBooking.totalAmount) * 100);
          cancellationPolicy = `Partial refund (${refundPercentage}%) provided`;
        }
      }
      
      // 6. Transform result to output DTO
      return {
        success: true,
        booking: {
          id: savedBooking.id,
          status: savedBooking.status.toString(),
          cancelledAt: savedBooking.cancelledAt?.toISOString() || new Date().toISOString(),
          cancellationReason: savedBooking.cancellationReason,
          refundAmount: cancellationResult.refundAmount,
          cancellationPolicy
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