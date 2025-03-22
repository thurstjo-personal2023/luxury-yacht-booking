/**
 * Create Payment Intent Use Case Tests
 * 
 * Tests for the CreatePaymentIntentUseCase in the application layer.
 */

import { CreatePaymentIntentUseCase } from '../../../../../../core/application/use-cases/payment/create-payment-intent-use-case';
import { IPaymentService } from '../../../../../../core/domain/services/payment-service';
import { PaymentStatus } from '../../../../../../core/domain/booking/payment-status';
import { IBookingRepository } from '../../../../../../core/application/ports/repositories/booking-repository';

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

describe('CreatePaymentIntentUseCase', () => {
  let useCase: CreatePaymentIntentUseCase;
  
  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreatePaymentIntentUseCase(mockPaymentService, mockBookingRepository);
  });
  
  it('should create a payment intent for a valid booking', async () => {
    // Arrange
    const bookingId = 'booking-123';
    const customerId = 'customer-456';
    const amount = 150.00;
    const currency = 'USD';
    const description = 'Yacht booking payment';
    
    // Mock booking repository to return a booking
    mockBookingRepository.getById.mockResolvedValue({
      id: bookingId,
      yachtId: 'yacht-789',
      customerId,
      totalPrice: amount,
      status: 'pending',
      startDate: '2025-04-01',
      endDate: '2025-04-03'
    } as any);
    
    // Mock payment service to return a payment intent
    mockPaymentService.createPaymentIntent.mockResolvedValue({
      id: 'pi_123456789',
      clientSecret: 'pi_123456789_secret_987654321',
      amount,
      currency,
      status: PaymentStatus.PENDING
    });
    
    // Act
    const result = await useCase.execute({
      bookingId,
      currency,
      description
    });
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.paymentIntent).toBeDefined();
    expect(result.paymentIntent?.id).toBe('pi_123456789');
    expect(result.paymentIntent?.clientSecret).toBe('pi_123456789_secret_987654321');
    expect(result.paymentIntent?.amount).toBe(amount);
    expect(result.paymentIntent?.currency).toBe(currency);
    expect(result.paymentIntent?.status).toBe(PaymentStatus.PENDING);
    
    // Verify repository and service calls
    expect(mockBookingRepository.getById).toHaveBeenCalledWith(bookingId);
    expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith({
      amount,
      currency,
      metadata: {
        bookingId,
        customerId,
        yachtId: 'yacht-789'
      },
      description
    });
    expect(mockBookingRepository.updatePaymentDetails).toHaveBeenCalled();
  });
  
  it('should return error when booking does not exist', async () => {
    // Arrange
    const bookingId = 'non-existent-booking';
    const currency = 'USD';
    
    // Mock booking repository to return null (booking not found)
    mockBookingRepository.getById.mockResolvedValue(null);
    
    // Act
    const result = await useCase.execute({
      bookingId,
      currency
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Booking not found');
    expect(result.paymentIntent).toBeNull();
    
    // Verify the payment service was not called
    expect(mockPaymentService.createPaymentIntent).not.toHaveBeenCalled();
    expect(mockBookingRepository.updatePaymentDetails).not.toHaveBeenCalled();
  });
  
  it('should handle payment service errors', async () => {
    // Arrange
    const bookingId = 'booking-123';
    const currency = 'USD';
    
    // Mock booking repository to return a booking
    mockBookingRepository.getById.mockResolvedValue({
      id: bookingId,
      yachtId: 'yacht-789',
      customerId: 'customer-456',
      totalPrice: 150.00,
      status: 'pending',
      startDate: '2025-04-01',
      endDate: '2025-04-03'
    } as any);
    
    // Mock payment service to throw an error
    const errorMessage = 'Payment service unavailable';
    mockPaymentService.createPaymentIntent.mockRejectedValue(new Error(errorMessage));
    
    // Act
    const result = await useCase.execute({
      bookingId,
      currency
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain(errorMessage);
    expect(result.paymentIntent).toBeNull();
    
    // Verify the booking was not updated
    expect(mockBookingRepository.updatePaymentDetails).not.toHaveBeenCalled();
  });
  
  it('should use custom amount if provided', async () => {
    // Arrange
    const bookingId = 'booking-123';
    const customerId = 'customer-456';
    const amount = 200.00; // Custom amount different from booking price
    const currency = 'USD';
    
    // Mock booking repository to return a booking
    mockBookingRepository.getById.mockResolvedValue({
      id: bookingId,
      yachtId: 'yacht-789',
      customerId,
      totalPrice: 150.00, // Original booking price
      status: 'pending',
      startDate: '2025-04-01',
      endDate: '2025-04-03'
    } as any);
    
    // Mock payment service to return a payment intent
    mockPaymentService.createPaymentIntent.mockResolvedValue({
      id: 'pi_123456789',
      clientSecret: 'pi_123456789_secret_987654321',
      amount,
      currency,
      status: PaymentStatus.PENDING
    });
    
    // Act
    const result = await useCase.execute({
      bookingId,
      currency,
      amount
    });
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.paymentIntent).toBeDefined();
    expect(result.paymentIntent?.amount).toBe(amount); // Should use custom amount
    
    // Verify payment service was called with custom amount
    expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        amount,
        currency
      })
    );
  });
});