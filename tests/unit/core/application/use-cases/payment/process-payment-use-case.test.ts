/**
 * Process Payment Use Case Tests
 * 
 * Tests for the ProcessPaymentUseCase in the application layer.
 */

import { ProcessPaymentUseCase } from '../../../../../../core/application/use-cases/payment/process-payment-use-case';
import { IPaymentService } from '../../../../../../core/domain/services/payment-service';
import { PaymentStatus } from '../../../../../../core/domain/booking/payment-status';
import { IBookingRepository } from '../../../../../../core/application/ports/repositories/booking-repository';
import { PaymentDetails } from '../../../../../../core/domain/booking/payment-details';

// Mock repositories and services
const mockPaymentService: jest.Mocked<IPaymentService> = {
  createPaymentIntent: jest.fn(),
  getPaymentIntent: jest.fn(),
  cancelPaymentIntent: jest.fn(),
  processWebhookEvent: jest.fn()
};

const mockBookingRepository: jest.Mocked<IBookingRepository> = {
  create: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
  findByCustomer: jest.fn(),
  findByYacht: jest.fn(),
  findByDateRange: jest.fn(),
  findByStatus: jest.fn(),
  updateStatus: jest.fn(),
  confirm: jest.fn(),
  cancel: jest.fn(),
  updatePaymentDetails: jest.fn()
};

describe('ProcessPaymentUseCase', () => {
  let useCase: ProcessPaymentUseCase;
  
  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ProcessPaymentUseCase(mockPaymentService, mockBookingRepository);
  });
  
  it('should process a payment successfully', async () => {
    // Arrange
    const paymentIntentId = 'pi_123456789';
    const paymentMethodId = 'pm_987654321';
    const bookingId = 'booking-123';
    
    // Mock payment service to return a successful payment result
    const mockPaymentResult = {
      paymentIntentId,
      status: PaymentStatus.COMPLETED,
      amount: 150.00,
      currency: 'USD',
      metadata: { bookingId },
      processedAt: new Date()
    };
    
    // Mock API calls
    mockPaymentService.getPaymentIntent.mockResolvedValue({
      id: paymentIntentId,
      clientSecret: 'pi_secret',
      amount: 150.00,
      currency: 'USD',
      status: PaymentStatus.PENDING
    });
    
    mockBookingRepository.getById.mockResolvedValue({
      id: bookingId,
      status: 'pending',
      paymentDetails: new PaymentDetails({
        paymentIntentId,
        status: PaymentStatus.PENDING,
        amount: 150.00,
        currency: 'USD'
      })
    } as any);
    
    mockBookingRepository.confirm.mockResolvedValue({
      id: bookingId,
      status: 'confirmed',
      paymentDetails: new PaymentDetails({
        paymentIntentId,
        status: PaymentStatus.COMPLETED,
        amount: 150.00,
        currency: 'USD',
        processingDate: mockPaymentResult.processedAt
      })
    } as any);
    
    // Act
    const result = await useCase.execute({
      paymentIntentId,
      paymentMethodId
    });
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.payment).toBeDefined();
    expect(result.payment?.paymentIntentId).toBe(paymentIntentId);
    expect(result.payment?.status).toBe(PaymentStatus.COMPLETED);
    
    // Verify repository calls
    expect(mockPaymentService.getPaymentIntent).toHaveBeenCalledWith(paymentIntentId);
    expect(mockBookingRepository.getById).toHaveBeenCalledWith(bookingId);
    expect(mockBookingRepository.confirm).toHaveBeenCalledWith(
      bookingId,
      expect.objectContaining({
        paymentIntentId,
        status: PaymentStatus.COMPLETED
      })
    );
  });
  
  it('should return error when payment intent not found', async () => {
    // Arrange
    const paymentIntentId = 'non-existent-payment';
    const paymentMethodId = 'pm_987654321';
    
    // Mock payment service to throw an error (payment intent not found)
    mockPaymentService.getPaymentIntent.mockRejectedValue(new Error('Payment intent not found'));
    
    // Act
    const result = await useCase.execute({
      paymentIntentId,
      paymentMethodId
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Payment intent not found');
    expect(result.payment).toBeNull();
    
    // Verify no booking updates were performed
    expect(mockBookingRepository.confirm).not.toHaveBeenCalled();
  });
  
  it('should return error when booking not found', async () => {
    // Arrange
    const paymentIntentId = 'pi_123456789';
    const paymentMethodId = 'pm_987654321';
    const bookingId = 'non-existent-booking';
    
    // Mock payment service to return payment intent
    mockPaymentService.getPaymentIntent.mockResolvedValue({
      id: paymentIntentId,
      clientSecret: 'pi_secret',
      amount: 150.00,
      currency: 'USD',
      status: PaymentStatus.PENDING,
      metadata: { bookingId }
    });
    
    // Mock booking repository to return null (booking not found)
    mockBookingRepository.getById.mockResolvedValue(null);
    
    // Act
    const result = await useCase.execute({
      paymentIntentId,
      paymentMethodId
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
    expect(result.payment).toBeNull();
    
    // Verify API calls
    expect(mockPaymentService.getPaymentIntent).toHaveBeenCalledWith(paymentIntentId);
    expect(mockBookingRepository.getById).toHaveBeenCalledWith(bookingId);
    expect(mockBookingRepository.confirm).not.toHaveBeenCalled();
  });
  
  it('should handle payment processing errors', async () => {
    // Arrange
    const paymentIntentId = 'pi_123456789';
    const paymentMethodId = 'pm_987654321';
    const bookingId = 'booking-123';
    
    // Mock payment service to return payment intent
    mockPaymentService.getPaymentIntent.mockResolvedValue({
      id: paymentIntentId,
      clientSecret: 'pi_secret',
      amount: 150.00,
      currency: 'USD',
      status: PaymentStatus.PENDING,
      metadata: { bookingId }
    });
    
    // Mock booking repository to return booking
    mockBookingRepository.getById.mockResolvedValue({
      id: bookingId,
      status: 'pending',
      paymentDetails: new PaymentDetails({
        paymentIntentId,
        status: PaymentStatus.PENDING,
        amount: 150.00,
        currency: 'USD'
      })
    } as any);
    
    // Mock payment service to throw error during processing
    const errorMessage = 'Card declined';
    mockPaymentService.processPayment = jest.fn().mockRejectedValue(new Error(errorMessage));
    
    // Act
    const result = await useCase.execute({
      paymentIntentId,
      paymentMethodId
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain(errorMessage);
    expect(result.payment).toBeNull();
    
    // Verify that booking was not confirmed
    expect(mockBookingRepository.confirm).not.toHaveBeenCalled();
  });
  
  it('should handle payment status FAILED', async () => {
    // Arrange
    const paymentIntentId = 'pi_123456789';
    const paymentMethodId = 'pm_987654321';
    const bookingId = 'booking-123';
    
    // Mock payment service to return a failed payment result
    const mockPaymentResult = {
      paymentIntentId,
      status: PaymentStatus.FAILED,
      amount: 150.00,
      currency: 'USD',
      metadata: { bookingId },
      processedAt: new Date()
    };
    
    // Mock API calls
    mockPaymentService.getPaymentIntent.mockResolvedValue({
      id: paymentIntentId,
      clientSecret: 'pi_secret',
      amount: 150.00,
      currency: 'USD',
      status: PaymentStatus.PENDING,
      metadata: { bookingId }
    });
    
    mockBookingRepository.getById.mockResolvedValue({
      id: bookingId,
      status: 'pending',
      paymentDetails: new PaymentDetails({
        paymentIntentId,
        status: PaymentStatus.PENDING,
        amount: 150.00,
        currency: 'USD'
      })
    } as any);
    
    mockPaymentService.processPayment = jest.fn().mockResolvedValue(mockPaymentResult);
    
    // Act
    const result = await useCase.execute({
      paymentIntentId,
      paymentMethodId
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('failed');
    expect(result.payment).toEqual(mockPaymentResult);
    
    // Verify that booking was not confirmed
    expect(mockBookingRepository.confirm).not.toHaveBeenCalled();
    // Should update payment details though
    expect(mockBookingRepository.updatePaymentDetails).toHaveBeenCalledWith(
      bookingId,
      expect.objectContaining({
        paymentIntentId,
        status: PaymentStatus.FAILED
      })
    );
  });
});