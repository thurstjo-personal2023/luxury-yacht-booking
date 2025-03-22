/**
 * Cancel Payment Use Case Tests
 * 
 * Tests for the CancelPaymentUseCase in the application layer.
 */

import { CancelPaymentUseCase } from '../../../../../../core/application/use-cases/payment/cancel-payment-use-case';
import { PaymentDetails } from '../../../../../../core/domain/payment/payment-details';
import { IBookingRepository } from '../../../../../../core/application/ports/repositories/booking-repository';
import { IPaymentRepository } from '../../../../../../core/application/ports/repositories/payment-repository';
import { IPaymentService } from '../../../../../../core/application/ports/services/payment-service';
import { Booking } from '../../../../../../core/domain/booking/booking';
import { BookingStatus } from '../../../../../../core/domain/booking/booking-status';
import { PaymentStatus } from '../../../../../../core/domain/payment/payment-status';
import { MockRepositoryFactory } from '../../../../../mocks/repositories/mock-repository-factory';
import { BaseUseCaseTest } from '../../../../../utils/base-use-case-test';

class CancelPaymentTests extends BaseUseCaseTest<CancelPaymentUseCase> {
  constructor() {
    super((repositoryFactory) => new CancelPaymentUseCase(
      repositoryFactory.getBookingRepository(),
      repositoryFactory.getPaymentRepository(),
      {
        createPaymentIntent: jest.fn(),
        getPaymentIntent: jest.fn(),
        cancelPaymentIntent: jest.fn(),
        processWebhookEvent: jest.fn()
      }
    ));
  }

  getBookingRepository(): jest.Mocked<IBookingRepository> {
    return this.repositoryFactory.getBookingRepository() as jest.Mocked<IBookingRepository>;
  }

  getPaymentRepository(): jest.Mocked<IPaymentRepository> {
    return this.repositoryFactory.getPaymentRepository() as jest.Mocked<IPaymentRepository>;
  }

  getPaymentService(): jest.Mocked<IPaymentService> {
    return (this.useCase as any).paymentService as jest.Mocked<IPaymentService>;
  }
}

describe('CancelPaymentUseCase', () => {
  let tests: CancelPaymentTests;
  
  beforeEach(() => {
    tests = new CancelPaymentTests();
  });
  
  describe('execute method', () => {
    it('should successfully cancel payment intent for valid booking', async () => {
      // Arrange
      const bookingId = 'booking-123';
      const paymentIntentId = 'pi_123456789';
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Create a booking with payment information
      const booking = new Booking({
        id: bookingId,
        userId,
        yachtId: 'yacht-789',
        status: BookingStatus.PENDING,
        startDate,
        endDate,
        totalAmount: 5000,
        paymentId: paymentIntentId,
        paymentStatus: PaymentStatus.PENDING,
        createdAt: now
      });
      
      // Create payment details
      const paymentDetails = new PaymentDetails({
        bookingId,
        paymentIntentId,
        amount: 5000,
        currency: 'USD',
        status: PaymentStatus.PENDING
      });
      
      // Mock successful payment intent cancellation
      const cancelledPaymentIntent = {
        id: paymentIntentId,
        status: 'canceled',
        amount: 5000,
        currency: 'USD'
      };
      
      tests.getBookingRepository().getById.mockResolvedValue(booking);
      tests.getPaymentRepository().getByPaymentIntentId.mockResolvedValue(paymentDetails);
      tests.getPaymentService().cancelPaymentIntent.mockResolvedValue(cancelledPaymentIntent);
      
      // Act
      const result = await tests.useCase.execute({
        paymentIntentId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.booking).toBeDefined();
      expect(result.payment?.status).toBe(PaymentStatus.FAILED);
      
      // Verify calls
      expect(tests.getBookingRepository().getById).toHaveBeenCalledWith(bookingId);
      expect(tests.getPaymentRepository().getByPaymentIntentId).toHaveBeenCalledWith(paymentIntentId);
      expect(tests.getPaymentService().cancelPaymentIntent).toHaveBeenCalledWith(paymentIntentId);
      
      // Verify booking update
      expect(tests.getBookingRepository().update).toHaveBeenCalledWith(expect.objectContaining({
        id: bookingId,
        status: BookingStatus.CANCELLED,
        paymentStatus: PaymentStatus.FAILED
      }));
      
      // Verify payment details update
      expect(tests.getPaymentRepository().update).toHaveBeenCalledWith(expect.objectContaining({
        bookingId,
        paymentIntentId,
        status: PaymentStatus.FAILED,
        processingDate: expect.any(Date)
      }));
    });
    
    it('should return error when payment intent not found', async () => {
      // Arrange
      const paymentIntentId = 'pi_123456789';
      const userId = 'user-456';
      
      tests.getPaymentRepository().getByPaymentIntentId.mockResolvedValue(null);
      
      // Act
      const result = await tests.useCase.execute({
        paymentIntentId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
      
      // No other calls should be made
      expect(tests.getBookingRepository().getById).not.toHaveBeenCalled();
      expect(tests.getPaymentService().cancelPaymentIntent).not.toHaveBeenCalled();
      expect(tests.getBookingRepository().update).not.toHaveBeenCalled();
      expect(tests.getPaymentRepository().update).not.toHaveBeenCalled();
    });
    
    it('should return error when booking not found', async () => {
      // Arrange
      const bookingId = 'booking-123';
      const paymentIntentId = 'pi_123456789';
      const userId = 'user-456';
      
      // Create payment details
      const paymentDetails = new PaymentDetails({
        bookingId,
        paymentIntentId,
        amount: 5000,
        currency: 'USD',
        status: PaymentStatus.PENDING
      });
      
      tests.getPaymentRepository().getByPaymentIntentId.mockResolvedValue(paymentDetails);
      tests.getBookingRepository().getById.mockResolvedValue(null);
      
      // Act
      const result = await tests.useCase.execute({
        paymentIntentId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
      
      // Verify calls
      expect(tests.getPaymentRepository().getByPaymentIntentId).toHaveBeenCalledWith(paymentIntentId);
      expect(tests.getBookingRepository().getById).toHaveBeenCalledWith(bookingId);
      expect(tests.getPaymentService().cancelPaymentIntent).not.toHaveBeenCalled();
      expect(tests.getBookingRepository().update).not.toHaveBeenCalled();
      expect(tests.getPaymentRepository().update).not.toHaveBeenCalled();
    });
    
    it('should return error when user is not the booking owner', async () => {
      // Arrange
      const bookingId = 'booking-123';
      const paymentIntentId = 'pi_123456789';
      const userId = 'user-456';
      const wrongUserId = 'user-789';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Create a booking with payment information but different userId
      const booking = new Booking({
        id: bookingId,
        userId: wrongUserId, // Different than the request
        yachtId: 'yacht-789',
        status: BookingStatus.PENDING,
        startDate,
        endDate,
        totalAmount: 5000,
        paymentId: paymentIntentId,
        paymentStatus: PaymentStatus.PENDING,
        createdAt: now
      });
      
      // Create payment details
      const paymentDetails = new PaymentDetails({
        bookingId,
        paymentIntentId,
        amount: 5000,
        currency: 'USD',
        status: PaymentStatus.PENDING
      });
      
      tests.getBookingRepository().getById.mockResolvedValue(booking);
      tests.getPaymentRepository().getByPaymentIntentId.mockResolvedValue(paymentDetails);
      
      // Act
      const result = await tests.useCase.execute({
        paymentIntentId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not authorized');
      
      // No payment service or updates should be called
      expect(tests.getPaymentService().cancelPaymentIntent).not.toHaveBeenCalled();
      expect(tests.getBookingRepository().update).not.toHaveBeenCalled();
      expect(tests.getPaymentRepository().update).not.toHaveBeenCalled();
    });
    
    it('should handle payment intent cancellation failure', async () => {
      // Arrange
      const bookingId = 'booking-123';
      const paymentIntentId = 'pi_123456789';
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Create a booking with payment information
      const booking = new Booking({
        id: bookingId,
        userId,
        yachtId: 'yacht-789',
        status: BookingStatus.PENDING,
        startDate,
        endDate,
        totalAmount: 5000,
        paymentId: paymentIntentId,
        paymentStatus: PaymentStatus.PENDING,
        createdAt: now
      });
      
      // Create payment details
      const paymentDetails = new PaymentDetails({
        bookingId,
        paymentIntentId,
        amount: 5000,
        currency: 'USD',
        status: PaymentStatus.PENDING
      });
      
      tests.getBookingRepository().getById.mockResolvedValue(booking);
      tests.getPaymentRepository().getByPaymentIntentId.mockResolvedValue(paymentDetails);
      tests.getPaymentService().cancelPaymentIntent.mockRejectedValue(new Error('Payment cancellation failed'));
      
      // Act
      const result = await tests.useCase.execute({
        paymentIntentId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Payment cancellation failed');
      
      // Verify calls
      expect(tests.getBookingRepository().getById).toHaveBeenCalledWith(bookingId);
      expect(tests.getPaymentRepository().getByPaymentIntentId).toHaveBeenCalledWith(paymentIntentId);
      expect(tests.getPaymentService().cancelPaymentIntent).toHaveBeenCalledWith(paymentIntentId);
      expect(tests.getBookingRepository().update).not.toHaveBeenCalled();
      expect(tests.getPaymentRepository().update).not.toHaveBeenCalled();
    });
    
    it('should not allow cancellation of completed bookings', async () => {
      // Arrange
      const bookingId = 'booking-123';
      const paymentIntentId = 'pi_123456789';
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() - 48 * 60 * 60 * 1000); // Past dates
      const endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Create a completed booking
      const booking = new Booking({
        id: bookingId,
        userId,
        yachtId: 'yacht-789',
        status: BookingStatus.COMPLETED,
        startDate,
        endDate,
        totalAmount: 5000,
        paymentId: paymentIntentId,
        paymentStatus: PaymentStatus.PAID,
        createdAt: now
      });
      
      // Create payment details
      const paymentDetails = new PaymentDetails({
        bookingId,
        paymentIntentId,
        amount: 5000,
        currency: 'USD',
        status: PaymentStatus.PAID
      });
      
      tests.getBookingRepository().getById.mockResolvedValue(booking);
      tests.getPaymentRepository().getByPaymentIntentId.mockResolvedValue(paymentDetails);
      
      // Act
      const result = await tests.useCase.execute({
        paymentIntentId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('cannot be cancelled');
      
      // No payment service or updates should be called
      expect(tests.getPaymentService().cancelPaymentIntent).not.toHaveBeenCalled();
      expect(tests.getBookingRepository().update).not.toHaveBeenCalled();
      expect(tests.getPaymentRepository().update).not.toHaveBeenCalled();
    });
  });
});