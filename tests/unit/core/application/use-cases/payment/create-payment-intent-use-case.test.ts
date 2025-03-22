/**
 * Create Payment Intent Use Case Tests
 * 
 * Tests for the CreatePaymentIntentUseCase in the application layer.
 */

import { CreatePaymentIntentUseCase } from '../../../../../../core/application/use-cases/payment/create-payment-intent-use-case';
import { PaymentDetails } from '../../../../../../core/domain/payment/payment-details';
import { IBookingRepository } from '../../../../../../core/application/ports/repositories/booking-repository';
import { IPaymentRepository } from '../../../../../../core/application/ports/repositories/payment-repository';
import { IPaymentService } from '../../../../../../core/application/ports/services/payment-service';
import { Booking } from '../../../../../../core/domain/booking/booking';
import { BookingStatus } from '../../../../../../core/domain/booking/booking-status';
import { PaymentStatus } from '../../../../../../core/domain/payment/payment-status';
import { MockRepositoryFactory } from '../../../../../mocks/repositories/mock-repository-factory';
import { BaseUseCaseTest } from '../../../../../utils/base-use-case-test';

class CreatePaymentIntentTests extends BaseUseCaseTest<CreatePaymentIntentUseCase> {
  constructor() {
    super((repositoryFactory) => new CreatePaymentIntentUseCase(
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

describe('CreatePaymentIntentUseCase', () => {
  let tests: CreatePaymentIntentTests;
  
  beforeEach(() => {
    tests = new CreatePaymentIntentTests();
  });
  
  describe('execute method', () => {
    it('should create a payment intent for a valid booking', async () => {
      // Arrange
      const bookingId = 'booking-123';
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: bookingId,
        userId,
        yachtId: 'yacht-789',
        status: BookingStatus.PENDING,
        startDate,
        endDate,
        totalAmount: 5000,
        createdAt: now
      });
      
      const paymentIntentData = {
        id: 'pi_123456789',
        clientSecret: 'cs_test_123456789',
        amount: 5000,
        currency: 'USD',
        status: 'requires_payment_method'
      };
      
      tests.getBookingRepository().getById.mockResolvedValue(booking);
      tests.getPaymentService().createPaymentIntent.mockResolvedValue(paymentIntentData);
      
      // Act
      const result = await tests.useCase.execute({
        bookingId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.paymentIntent).toBeDefined();
      expect(result.paymentIntent?.id).toBe('pi_123456789');
      expect(result.paymentIntent?.clientSecret).toBe('cs_test_123456789');
      
      expect(tests.getBookingRepository().getById).toHaveBeenCalledWith(bookingId);
      expect(tests.getPaymentService().createPaymentIntent).toHaveBeenCalledWith({
        bookingId,
        amount: 5000,
        currency: 'USD',
        description: expect.any(String),
        metadata: expect.objectContaining({
          bookingId,
          userId
        })
      });
      
      // Should update the booking with payment details
      expect(tests.getBookingRepository().update).toHaveBeenCalledWith(expect.objectContaining({
        id: bookingId,
        paymentStatus: PaymentStatus.PENDING,
        paymentId: 'pi_123456789'
      }));
      
      // Should save the payment details
      expect(tests.getPaymentRepository().save).toHaveBeenCalledWith(expect.any(PaymentDetails));
    });
    
    it('should return an error if booking is not found', async () => {
      // Arrange
      const bookingId = 'booking-123';
      const userId = 'user-456';
      
      tests.getBookingRepository().getById.mockResolvedValue(null);
      
      // Act
      const result = await tests.useCase.execute({
        bookingId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not found');
      
      expect(tests.getBookingRepository().getById).toHaveBeenCalledWith(bookingId);
      expect(tests.getPaymentService().createPaymentIntent).not.toHaveBeenCalled();
      expect(tests.getBookingRepository().update).not.toHaveBeenCalled();
      expect(tests.getPaymentRepository().save).not.toHaveBeenCalled();
    });
    
    it('should return an error if user does not own the booking', async () => {
      // Arrange
      const bookingId = 'booking-123';
      const userId = 'user-456';
      const wrongUserId = 'user-789';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: bookingId,
        userId: wrongUserId, // Different user ID
        yachtId: 'yacht-789',
        status: BookingStatus.PENDING,
        startDate,
        endDate,
        totalAmount: 5000,
        createdAt: now
      });
      
      tests.getBookingRepository().getById.mockResolvedValue(booking);
      
      // Act
      const result = await tests.useCase.execute({
        bookingId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('not authorized');
      
      expect(tests.getBookingRepository().getById).toHaveBeenCalledWith(bookingId);
      expect(tests.getPaymentService().createPaymentIntent).not.toHaveBeenCalled();
      expect(tests.getBookingRepository().update).not.toHaveBeenCalled();
      expect(tests.getPaymentRepository().save).not.toHaveBeenCalled();
    });
    
    it('should return an error if booking has no total amount', async () => {
      // Arrange
      const bookingId = 'booking-123';
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: bookingId,
        userId,
        yachtId: 'yacht-789',
        status: BookingStatus.PENDING,
        startDate,
        endDate,
        // No totalAmount specified
        createdAt: now
      });
      
      tests.getBookingRepository().getById.mockResolvedValue(booking);
      
      // Act
      const result = await tests.useCase.execute({
        bookingId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('amount');
      
      expect(tests.getBookingRepository().getById).toHaveBeenCalledWith(bookingId);
      expect(tests.getPaymentService().createPaymentIntent).not.toHaveBeenCalled();
      expect(tests.getBookingRepository().update).not.toHaveBeenCalled();
      expect(tests.getPaymentRepository().save).not.toHaveBeenCalled();
    });
    
    it('should return an error if payment service fails', async () => {
      // Arrange
      const bookingId = 'booking-123';
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: bookingId,
        userId,
        yachtId: 'yacht-789',
        status: BookingStatus.PENDING,
        startDate,
        endDate,
        totalAmount: 5000,
        createdAt: now
      });
      
      tests.getBookingRepository().getById.mockResolvedValue(booking);
      tests.getPaymentService().createPaymentIntent.mockRejectedValue(new Error('Payment service error'));
      
      // Act
      const result = await tests.useCase.execute({
        bookingId,
        userId
      });
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Payment service error');
      
      expect(tests.getBookingRepository().getById).toHaveBeenCalledWith(bookingId);
      expect(tests.getPaymentService().createPaymentIntent).toHaveBeenCalled();
      expect(tests.getBookingRepository().update).not.toHaveBeenCalled();
      expect(tests.getPaymentRepository().save).not.toHaveBeenCalled();
    });
  });
});