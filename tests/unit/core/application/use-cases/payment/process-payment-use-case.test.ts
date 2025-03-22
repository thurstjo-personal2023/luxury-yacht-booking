/**
 * Process Payment Use Case Tests
 * 
 * Tests for the ProcessPaymentUseCase in the application layer.
 */

import { ProcessPaymentUseCase } from '../../../../../../core/application/use-cases/payment/process-payment-use-case';
import { PaymentDetails } from '../../../../../../core/domain/payment/payment-details';
import { IBookingRepository } from '../../../../../../core/application/ports/repositories/booking-repository';
import { IPaymentRepository } from '../../../../../../core/application/ports/repositories/payment-repository';
import { IPaymentService } from '../../../../../../core/application/ports/services/payment-service';
import { Booking } from '../../../../../../core/domain/booking/booking';
import { BookingStatus } from '../../../../../../core/domain/booking/booking-status';
import { PaymentStatus } from '../../../../../../core/domain/payment/payment-status';
import { MockRepositoryFactory } from '../../../../../mocks/repositories/mock-repository-factory';
import { BaseUseCaseTest } from '../../../../../utils/base-use-case-test';

class ProcessPaymentTests extends BaseUseCaseTest<ProcessPaymentUseCase> {
  constructor() {
    super((repositoryFactory) => new ProcessPaymentUseCase(
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

describe('ProcessPaymentUseCase', () => {
  let tests: ProcessPaymentTests;
  
  beforeEach(() => {
    tests = new ProcessPaymentTests();
  });
  
  describe('execute method', () => {
    it('should successfully process payment intent for valid booking', async () => {
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
      
      // Mock successful payment intent retrieval
      const paymentIntentData = {
        id: paymentIntentId,
        amount: 5000,
        currency: 'USD',
        status: 'succeeded',
        metadata: {
          bookingId,
          userId
        }
      };
      
      tests.getBookingRepository().getById.mockResolvedValue(booking);
      tests.getPaymentRepository().getByPaymentIntentId.mockResolvedValue(paymentDetails);
      tests.getPaymentService().getPaymentIntent.mockResolvedValue(paymentIntentData);
      
      // Act
      const result = await tests.useCase.execute({
        paymentIntentId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.booking).toBeDefined();
      expect(result.payment?.status).toBe(PaymentStatus.PAID);
      
      // Verify calls
      expect(tests.getBookingRepository().getById).toHaveBeenCalledWith(bookingId);
      expect(tests.getPaymentRepository().getByPaymentIntentId).toHaveBeenCalledWith(paymentIntentId);
      expect(tests.getPaymentService().getPaymentIntent).toHaveBeenCalledWith(paymentIntentId);
      
      // Verify booking update
      expect(tests.getBookingRepository().update).toHaveBeenCalledWith(expect.objectContaining({
        id: bookingId,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID
      }));
      
      // Verify payment details update
      expect(tests.getPaymentRepository().update).toHaveBeenCalledWith(expect.objectContaining({
        bookingId,
        paymentIntentId,
        status: PaymentStatus.PAID,
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
      expect(tests.getPaymentService().getPaymentIntent).not.toHaveBeenCalled();
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
      expect(tests.getPaymentService().getPaymentIntent).not.toHaveBeenCalled();
      expect(tests.getBookingRepository().update).not.toHaveBeenCalled();
      expect(tests.getPaymentRepository().update).not.toHaveBeenCalled();
    });
    
    it('should return error when payment intent verification fails', async () => {
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
      tests.getPaymentService().getPaymentIntent.mockRejectedValue(new Error('Payment intent verification failed'));
      
      // Act
      const result = await tests.useCase.execute({
        paymentIntentId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('verification failed');
      
      // Verify calls
      expect(tests.getBookingRepository().getById).toHaveBeenCalledWith(bookingId);
      expect(tests.getPaymentRepository().getByPaymentIntentId).toHaveBeenCalledWith(paymentIntentId);
      expect(tests.getPaymentService().getPaymentIntent).toHaveBeenCalledWith(paymentIntentId);
      expect(tests.getBookingRepository().update).not.toHaveBeenCalled();
      expect(tests.getPaymentRepository().update).not.toHaveBeenCalled();
    });
    
    it('should handle failed payment status', async () => {
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
      
      // Mock failed payment intent 
      const paymentIntentData = {
        id: paymentIntentId,
        amount: 5000,
        currency: 'USD',
        status: 'canceled',
        metadata: {
          bookingId,
          userId
        }
      };
      
      tests.getBookingRepository().getById.mockResolvedValue(booking);
      tests.getPaymentRepository().getByPaymentIntentId.mockResolvedValue(paymentDetails);
      tests.getPaymentService().getPaymentIntent.mockResolvedValue(paymentIntentData);
      
      // Act
      const result = await tests.useCase.execute({
        paymentIntentId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('failed');
      expect(result.booking).toBeDefined();
      expect(result.payment).toBeDefined();
      expect(result.payment?.status).toBe(PaymentStatus.FAILED);
      
      // Verify booking update (should still be pending)
      expect(tests.getBookingRepository().update).toHaveBeenCalledWith(expect.objectContaining({
        id: bookingId,
        status: BookingStatus.PENDING,
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
    
    it('should not allow unauthorized users to process payment', async () => {
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
      expect(tests.getPaymentService().getPaymentIntent).not.toHaveBeenCalled();
      expect(tests.getBookingRepository().update).not.toHaveBeenCalled();
      expect(tests.getPaymentRepository().update).not.toHaveBeenCalled();
    });
  });
});