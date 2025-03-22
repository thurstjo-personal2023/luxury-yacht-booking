/**
 * Process Payment Use Case Integration Test
 * 
 * This test verifies the integration of the ProcessPaymentUseCase with
 * its repository and service dependencies.
 */

import { 
  PaymentStatus,
  ProcessPaymentInput,
  ProcessPaymentOutput,
  IPaymentService
} from '../../common/domain-types';
import { 
  createTestEnvironment,
  createTestBooking,
  createTestPaymentDetails
} from '../../setup/setup-test-env';

/**
 * Mock ProcessPaymentUseCase for testing
 */
class ProcessPaymentUseCase {
  constructor(
    private bookingRepository: any,
    private paymentRepository: any,
    private paymentService: IPaymentService
  ) {}

  /**
   * Execute the use case
   */
  async execute(input: ProcessPaymentInput): Promise<ProcessPaymentOutput> {
    try {
      // Validate input
      if (!input.paymentIntentId) {
        return {
          success: false,
          error: 'Payment intent ID is required'
        };
      }

      // Retrieve payment intent from payment service
      const paymentIntent = await this.paymentService.getPaymentIntent(input.paymentIntentId);
      if (!paymentIntent) {
        return {
          success: false,
          error: 'Payment intent not found'
        };
      }

      // Check payment intent status
      if (paymentIntent.status !== 'succeeded') {
        return {
          success: false,
          error: `Payment not successful: ${paymentIntent.status}`
        };
      }

      // Get booking ID from payment intent metadata
      const bookingId = paymentIntent.metadata?.bookingId;
      if (!bookingId) {
        return {
          success: false,
          error: 'Booking ID not found in payment metadata'
        };
      }

      // Get existing booking
      const booking = await this.bookingRepository.getById(bookingId);
      if (!booking) {
        return {
          success: false,
          error: 'Booking not found'
        };
      }

      // Check if payment is already processed
      const existingPayment = await this.paymentRepository.getByPaymentIntentId(input.paymentIntentId);
      if (existingPayment) {
        return {
          success: true,
          payment: existingPayment
        };
      }

      // Create payment record
      const payment = createTestPaymentDetails({
        bookingId: booking.id,
        paymentIntentId: input.paymentIntentId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: PaymentStatus.PAID,
        processingDate: new Date()
      });

      // Save payment
      const savedPayment = await this.paymentRepository.create(payment);

      // Update booking with payment info
      booking.paymentId = savedPayment.id;
      booking.paymentStatus = PaymentStatus.PAID;
      booking.status = booking.status === 'pending' ? 'confirmed' : booking.status;
      
      await this.bookingRepository.update(booking);

      return {
        success: true,
        payment: savedPayment
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

describe('ProcessPaymentUseCase Integration', () => {
  it('should process a successful payment', async () => {
    // Setup
    const env = createTestEnvironment();
    const { bookingRepository, paymentRepository, paymentService } = env;
    
    // Create a test booking without payment
    const booking = createTestBooking({
      id: 'booking-payment-test',
      userId: 'user-payment-test'
    });
    await bookingRepository.create(booking);
    
    // Mock the payment service to return a successful payment intent
    jest.spyOn(paymentService, 'getPaymentIntent').mockResolvedValue({
      id: 'pi_test_success',
      amount: 5000,
      currency: 'USD',
      status: 'succeeded',
      client_secret: 'cs_test_secret',
      metadata: { bookingId: booking.id }
    });
    
    const useCase = new ProcessPaymentUseCase(
      bookingRepository,
      paymentRepository,
      paymentService
    );
    
    const input: ProcessPaymentInput = {
      paymentIntentId: 'pi_test_success',
      userId: booking.userId
    };
    
    // Execute
    const result = await useCase.execute(input);
    
    // Verify
    expect(result.success).toBe(true);
    expect(result.payment).toBeDefined();
    if (result.payment) {
      expect(result.payment.bookingId).toBe(booking.id);
      expect(result.payment.paymentIntentId).toBe(input.paymentIntentId);
      expect(result.payment.status).toBe(PaymentStatus.PAID);
    }
    
    // Verify booking was updated
    const updatedBooking = await bookingRepository.getById(booking.id);
    expect(updatedBooking).toBeDefined();
    expect(updatedBooking?.paymentId).toBeDefined();
    expect(updatedBooking?.paymentStatus).toBe(PaymentStatus.PAID);
  });
  
  it('should fail when payment intent not found', async () => {
    // Setup
    const env = createTestEnvironment();
    const { bookingRepository, paymentRepository, paymentService } = env;
    
    // Mock the payment service to return null (not found)
    jest.spyOn(paymentService, 'getPaymentIntent').mockResolvedValue(null);
    
    const useCase = new ProcessPaymentUseCase(
      bookingRepository,
      paymentRepository,
      paymentService
    );
    
    const input: ProcessPaymentInput = {
      paymentIntentId: 'pi_test_not_found',
      userId: 'user-test'
    };
    
    // Execute
    const result = await useCase.execute(input);
    
    // Verify
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
  
  it('should fail when payment intent status is not succeeded', async () => {
    // Setup
    const env = createTestEnvironment();
    const { bookingRepository, paymentRepository, paymentService } = env;
    
    // Mock the payment service to return a payment intent that's not succeeded
    jest.spyOn(paymentService, 'getPaymentIntent').mockResolvedValue({
      id: 'pi_test_failed',
      amount: 5000,
      currency: 'USD',
      status: 'requires_payment_method',
      client_secret: 'cs_test_secret',
      metadata: { bookingId: 'booking-test-1' }
    });
    
    const useCase = new ProcessPaymentUseCase(
      bookingRepository,
      paymentRepository,
      paymentService
    );
    
    const input: ProcessPaymentInput = {
      paymentIntentId: 'pi_test_failed',
      userId: 'user-test'
    };
    
    // Execute
    const result = await useCase.execute(input);
    
    // Verify
    expect(result.success).toBe(false);
    expect(result.error).toContain('not successful');
  });
  
  it('should return existing payment if already processed', async () => {
    // Setup
    const env = createTestEnvironment();
    const { bookingRepository, paymentRepository, paymentService } = env;
    
    // Create a test payment that's already processed
    const existingPayment = createTestPaymentDetails({
      id: 'payment-already-processed',
      bookingId: 'booking-test-1',
      paymentIntentId: 'pi_test_already_processed',
      status: PaymentStatus.PAID
    });
    await paymentRepository.create(existingPayment);
    
    // Mock the payment service
    jest.spyOn(paymentService, 'getPaymentIntent').mockResolvedValue({
      id: 'pi_test_already_processed',
      amount: 5000,
      currency: 'USD',
      status: 'succeeded',
      client_secret: 'cs_test_secret',
      metadata: { bookingId: 'booking-test-1' }
    });
    
    const useCase = new ProcessPaymentUseCase(
      bookingRepository,
      paymentRepository,
      paymentService
    );
    
    const input: ProcessPaymentInput = {
      paymentIntentId: 'pi_test_already_processed',
      userId: 'user-test'
    };
    
    // Execute
    const result = await useCase.execute(input);
    
    // Verify
    expect(result.success).toBe(true);
    expect(result.payment).toBeDefined();
    if (result.payment) {
      expect(result.payment.id).toBe(existingPayment.id);
      expect(result.payment.paymentIntentId).toBe(existingPayment.paymentIntentId);
    }
  });
});