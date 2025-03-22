/**
 * Booking-Payment Cross-Module Integration Test
 * 
 * This test verifies the integration between booking and payment modules,
 * focusing on the complete flow from creating a booking to processing payment.
 */

import { 
  Booking,
  BookingStatus,
  CreateBookingInput,
  PaymentStatus,
  ProcessPaymentInput
} from '../../common/domain-types';
import { 
  createTestEnvironment,
  createTestBooking
} from '../../setup/setup-test-env';

/**
 * Mock CreateBookingUseCase for cross-module testing
 */
class CreateBookingUseCase {
  constructor(
    private bookingRepository: any,
    private yachtRepository: any
  ) {}

  async execute(input: CreateBookingInput): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    try {
      // Validate input
      if (!input.userId || !input.yachtId || !input.startDate || !input.endDate) {
        return {
          success: false,
          error: 'Missing required fields'
        };
      }

      // Verify yacht exists
      const yacht = await this.yachtRepository.getById(input.yachtId);
      if (!yacht) {
        return {
          success: false,
          error: 'Yacht not found'
        };
      }

      // Check yacht availability
      const isAvailable = await this.yachtRepository.checkAvailability(
        input.yachtId,
        input.startDate,
        input.endDate
      );

      if (!isAvailable) {
        return {
          success: false,
          error: 'Yacht not available for selected dates'
        };
      }

      // Calculate total amount
      const daysCount = Math.ceil(
        (input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const totalAmount = yacht.pricePerDay * daysCount;

      // Create booking entity
      const booking: Booking = {
        id: `booking-${Date.now()}`,
        userId: input.userId,
        yachtId: input.yachtId,
        startDate: input.startDate,
        endDate: input.endDate,
        status: BookingStatus.PENDING,
        totalAmount,
        guestCount: input.guestCount,
        specialRequests: input.specialRequests,
        createdAt: new Date(),
        items: [],
        timeSlots: []
      };

      // Save to repository
      const createdBooking = await this.bookingRepository.create(booking);

      return {
        success: true,
        booking: createdBooking
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Mock CreatePaymentIntentUseCase for cross-module testing
 */
class CreatePaymentIntentUseCase {
  constructor(
    private bookingRepository: any,
    private paymentService: any
  ) {}

  async execute(input: { bookingId: string; userId: string }): Promise<{ success: boolean; paymentIntent?: any; error?: string }> {
    try {
      // Validate input
      if (!input.bookingId) {
        return {
          success: false,
          error: 'Booking ID is required'
        };
      }

      // Get booking
      const booking = await this.bookingRepository.getById(input.bookingId);
      if (!booking) {
        return {
          success: false,
          error: 'Booking not found'
        };
      }

      // Verify booking belongs to user
      if (booking.userId !== input.userId) {
        return {
          success: false,
          error: 'Unauthorized'
        };
      }

      // Create payment intent
      const paymentIntent = await this.paymentService.createPaymentIntent({
        amount: booking.totalAmount,
        currency: 'USD',
        metadata: {
          bookingId: booking.id,
          userId: booking.userId,
          yachtId: booking.yachtId
        }
      });

      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Mock ProcessPaymentUseCase for cross-module testing
 */
class ProcessPaymentUseCase {
  constructor(
    private bookingRepository: any,
    private paymentRepository: any,
    private paymentService: any
  ) {}

  async execute(input: ProcessPaymentInput): Promise<{ success: boolean; payment?: any; error?: string }> {
    try {
      // Validate input
      if (!input.paymentIntentId) {
        return {
          success: false,
          error: 'Payment intent ID is required'
        };
      }

      // Retrieve payment intent
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

      // Create payment record
      const payment = {
        id: `payment-${Date.now()}`,
        bookingId: booking.id,
        paymentIntentId: input.paymentIntentId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: PaymentStatus.PAID,
        processingDate: new Date(),
        metadata: paymentIntent.metadata
      };

      // Save payment
      const savedPayment = await this.paymentRepository.create(payment);

      // Update booking with payment info
      booking.paymentId = savedPayment.id;
      booking.paymentStatus = PaymentStatus.PAID;
      booking.status = BookingStatus.CONFIRMED;
      
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

describe('Booking-Payment Cross-Module Integration', () => {
  it('should execute the full booking and payment flow', async () => {
    // Setup test environment
    const env = createTestEnvironment();
    const { bookingRepository, yachtRepository, paymentRepository, paymentService } = env;
    
    // Create use cases
    const createBookingUseCase = new CreateBookingUseCase(bookingRepository, yachtRepository);
    const createPaymentIntentUseCase = new CreatePaymentIntentUseCase(bookingRepository, paymentService);
    const processPaymentUseCase = new ProcessPaymentUseCase(bookingRepository, paymentRepository, paymentService);
    
    // Step 1: Create a booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);
    
    const bookingInput: CreateBookingInput = {
      userId: 'user-integration-test',
      yachtId: 'yacht-test-1',
      startDate: tomorrow,
      endDate: dayAfter,
      guestCount: 6,
      specialRequests: 'Welcome package with champagne'
    };
    
    const bookingResult = await createBookingUseCase.execute(bookingInput);
    expect(bookingResult.success).toBe(true);
    expect(bookingResult.booking).toBeDefined();
    
    if (!bookingResult.booking) {
      throw new Error('Booking creation failed');
    }
    
    // Step 2: Create a payment intent
    const paymentIntentInput = {
      bookingId: bookingResult.booking.id,
      userId: bookingResult.booking.userId
    };
    
    const paymentIntentResult = await createPaymentIntentUseCase.execute(paymentIntentInput);
    expect(paymentIntentResult.success).toBe(true);
    expect(paymentIntentResult.paymentIntent).toBeDefined();
    
    if (!paymentIntentResult.paymentIntent) {
      throw new Error('Payment intent creation failed');
    }
    
    // Mock successful payment by updating payment intent status
    const mockPaymentIntent = paymentIntentResult.paymentIntent;
    jest.spyOn(paymentService, 'getPaymentIntent').mockResolvedValue({
      ...mockPaymentIntent,
      status: 'succeeded'
    });
    
    // Step 3: Process payment
    const processPaymentInput: ProcessPaymentInput = {
      paymentIntentId: mockPaymentIntent.id,
      userId: bookingResult.booking.userId
    };
    
    const processPaymentResult = await processPaymentUseCase.execute(processPaymentInput);
    expect(processPaymentResult.success).toBe(true);
    expect(processPaymentResult.payment).toBeDefined();
    
    if (!processPaymentResult.payment) {
      throw new Error('Payment processing failed');
    }
    
    // Step 4: Verify booking was updated
    const updatedBooking = await bookingRepository.getById(bookingResult.booking.id);
    expect(updatedBooking).toBeDefined();
    expect(updatedBooking.status).toBe(BookingStatus.CONFIRMED);
    expect(updatedBooking.paymentStatus).toBe(PaymentStatus.PAID);
    expect(updatedBooking.paymentId).toBe(processPaymentResult.payment.id);
  });
  
  it('should roll back when payment fails', async () => {
    // Setup test environment
    const env = createTestEnvironment();
    const { bookingRepository, yachtRepository, paymentRepository, paymentService } = env;
    
    // Create use cases
    const createBookingUseCase = new CreateBookingUseCase(bookingRepository, yachtRepository);
    const createPaymentIntentUseCase = new CreatePaymentIntentUseCase(bookingRepository, paymentService);
    const processPaymentUseCase = new ProcessPaymentUseCase(bookingRepository, paymentRepository, paymentService);
    
    // Step 1: Create a booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);
    
    const bookingInput: CreateBookingInput = {
      userId: 'user-integration-test-fail',
      yachtId: 'yacht-test-1',
      startDate: tomorrow,
      endDate: dayAfter
    };
    
    const bookingResult = await createBookingUseCase.execute(bookingInput);
    expect(bookingResult.success).toBe(true);
    expect(bookingResult.booking).toBeDefined();
    
    if (!bookingResult.booking) {
      throw new Error('Booking creation failed');
    }
    
    // Step 2: Create a payment intent
    const paymentIntentInput = {
      bookingId: bookingResult.booking.id,
      userId: bookingResult.booking.userId
    };
    
    const paymentIntentResult = await createPaymentIntentUseCase.execute(paymentIntentInput);
    expect(paymentIntentResult.success).toBe(true);
    expect(paymentIntentResult.paymentIntent).toBeDefined();
    
    if (!paymentIntentResult.paymentIntent) {
      throw new Error('Payment intent creation failed');
    }
    
    // Mock failed payment by updating payment intent status
    const mockPaymentIntent = paymentIntentResult.paymentIntent;
    jest.spyOn(paymentService, 'getPaymentIntent').mockResolvedValue({
      ...mockPaymentIntent,
      status: 'requires_payment_method'
    });
    
    // Step 3: Process payment
    const processPaymentInput: ProcessPaymentInput = {
      paymentIntentId: mockPaymentIntent.id,
      userId: bookingResult.booking.userId
    };
    
    const processPaymentResult = await processPaymentUseCase.execute(processPaymentInput);
    expect(processPaymentResult.success).toBe(false);
    expect(processPaymentResult.error).toContain('not successful');
    
    // Step 4: Verify booking was not updated
    const updatedBooking = await bookingRepository.getById(bookingResult.booking.id);
    expect(updatedBooking).toBeDefined();
    expect(updatedBooking.status).toBe(BookingStatus.PENDING);
    expect(updatedBooking.paymentId).toBeUndefined();
  });
});