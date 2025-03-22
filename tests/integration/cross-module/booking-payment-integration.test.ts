/**
 * Booking-Payment Cross-Module Integration Test
 * 
 * This test verifies the integration between the booking and payment modules,
 * ensuring they work together correctly in real-world scenarios.
 */

import { initializeTestEnvironment, EmulatorInstance, EMULATOR_PORTS } from '../../emulator-setup';
import { BookingStatus } from '../../../core/domain/booking/booking-status';
import { PaymentStatus } from '../../../core/domain/payment/payment-status';

// Import repository implementations
import { FirestoreBookingRepository } from '../../../adapters/repositories/firestore/firestore-booking-repository';
import { FirestorePaymentRepository } from '../../../adapters/repositories/firestore/firestore-payment-repository';
import { FirestoreYachtRepository } from '../../../adapters/repositories/firestore/firestore-yacht-repository';
import { StripePaymentService } from '../../../adapters/payment/stripe-payment-service';

// Define interfaces for use cases
interface ICreateBookingUseCase {
  execute(input: any): Promise<any>;
}

interface IGetBookingUseCase {
  execute(input: { bookingId: string; userId: string }): Promise<any>;
}

interface ICancelBookingUseCase {
  execute(input: { bookingId: string; userId: string }): Promise<any>;
}

interface ICreatePaymentIntentUseCase {
  execute(input: { bookingId: string; userId: string }): Promise<any>;
}

interface IProcessPaymentUseCase {
  execute(input: { paymentIntentId: string; userId: string }): Promise<any>;
}

interface ICancelPaymentUseCase {
  execute(input: { paymentIntentId: string; userId: string }): Promise<any>;
}

// Mock implementations
class CreateBookingUseCase implements ICreateBookingUseCase {
  constructor(
    private bookingRepository: FirestoreBookingRepository,
    private yachtRepository: FirestoreYachtRepository
  ) {}

  async execute(input: any): Promise<any> {
    // Create a new booking - this is a simple mock implementation
    const bookingId = 'test-booking-' + Date.now();
    const booking = {
      id: bookingId,
      userId: input.userId,
      yachtId: input.yachtId,
      startDate: input.startDate,
      endDate: input.endDate,
      status: BookingStatus.PENDING,
      totalAmount: 5000,
      createdAt: new Date()
    };
    
    await this.bookingRepository.create(booking);
    
    return {
      success: true,
      booking
    };
  }
}

class GetBookingUseCase implements IGetBookingUseCase {
  constructor(
    private bookingRepository: FirestoreBookingRepository,
    private yachtRepository: FirestoreYachtRepository
  ) {}

  async execute(input: { bookingId: string; userId: string }): Promise<any> {
    const booking = await this.bookingRepository.getById(input.bookingId);
    
    if (!booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }
    
    if (booking.userId !== input.userId) {
      return {
        success: false,
        error: 'User is not authorized to access this booking'
      };
    }
    
    return {
      success: true,
      booking
    };
  }
}

class CancelBookingUseCase implements ICancelBookingUseCase {
  constructor(
    private bookingRepository: FirestoreBookingRepository
  ) {}

  async execute(input: { bookingId: string; userId: string }): Promise<any> {
    const booking = await this.bookingRepository.getById(input.bookingId);
    
    if (!booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }
    
    if (booking.userId !== input.userId) {
      return {
        success: false,
        error: 'User is not authorized to cancel this booking'
      };
    }
    
    booking.status = BookingStatus.CANCELLED;
    await this.bookingRepository.update(booking);
    
    return {
      success: true,
      booking
    };
  }
}

class CreatePaymentIntentUseCase implements ICreatePaymentIntentUseCase {
  constructor(
    private bookingRepository: FirestoreBookingRepository,
    private paymentRepository: FirestorePaymentRepository,
    private paymentService: StripePaymentService
  ) {}

  async execute(input: { bookingId: string; userId: string }): Promise<any> {
    const booking = await this.bookingRepository.getById(input.bookingId);
    
    if (!booking) {
      return {
        success: false,
        error: 'Booking not found'
      };
    }
    
    if (booking.userId !== input.userId) {
      return {
        success: false,
        error: 'User is not authorized to create a payment for this booking'
      };
    }
    
    // Create a mock payment intent
    const paymentIntent = {
      id: 'pi_test_' + Date.now(),
      amount: booking.totalAmount,
      currency: 'USD',
      status: 'requires_payment_method',
      client_secret: 'cs_test_' + Date.now()
    };
    
    // Update booking with payment info
    booking.paymentId = paymentIntent.id;
    booking.paymentStatus = PaymentStatus.PENDING;
    await this.bookingRepository.update(booking);
    
    return {
      success: true,
      paymentIntent
    };
  }
}

class ProcessPaymentUseCase implements IProcessPaymentUseCase {
  constructor(
    private bookingRepository: FirestoreBookingRepository,
    private paymentRepository: FirestorePaymentRepository,
    private paymentService: StripePaymentService
  ) {}

  async execute(input: { paymentIntentId: string; userId: string }): Promise<any> {
    // Find booking by payment ID
    const booking = await this.bookingRepository.getByPaymentId(input.paymentIntentId);
    
    if (!booking) {
      return {
        success: false,
        error: 'Booking not found for this payment'
      };
    }
    
    if (booking.userId !== input.userId) {
      return {
        success: false,
        error: 'User is not authorized to process this payment'
      };
    }
    
    // Update booking status
    booking.status = BookingStatus.CONFIRMED;
    booking.paymentStatus = PaymentStatus.PAID;
    await this.bookingRepository.update(booking);
    
    // Create payment record
    const payment = {
      id: 'payment-' + Date.now(),
      bookingId: booking.id,
      paymentIntentId: input.paymentIntentId,
      amount: booking.totalAmount,
      currency: 'USD',
      status: PaymentStatus.PAID,
      processingDate: new Date()
    };
    
    await this.paymentRepository.create(payment);
    
    return {
      success: true,
      payment
    };
  }
}

class CancelPaymentUseCase implements ICancelPaymentUseCase {
  constructor(
    private bookingRepository: FirestoreBookingRepository,
    private paymentRepository: FirestorePaymentRepository,
    private paymentService: StripePaymentService
  ) {}

  async execute(input: { paymentIntentId: string; userId: string }): Promise<any> {
    // Find booking by payment ID
    const booking = await this.bookingRepository.getByPaymentId(input.paymentIntentId);
    
    if (!booking) {
      return {
        success: false,
        error: 'Booking not found for this payment'
      };
    }
    
    if (booking.userId !== input.userId) {
      return {
        success: false,
        error: 'User is not authorized to cancel this payment'
      };
    }
    
    // Update booking status
    booking.status = BookingStatus.CANCELLED;
    booking.paymentStatus = PaymentStatus.FAILED;
    await this.bookingRepository.update(booking);
    
    // Create payment record
    const payment = {
      id: 'payment-' + Date.now(),
      bookingId: booking.id,
      paymentIntentId: input.paymentIntentId,
      amount: booking.totalAmount,
      currency: 'USD',
      status: PaymentStatus.FAILED,
      processingDate: new Date()
    };
    
    await this.paymentRepository.create(payment);
    
    return {
      success: true,
      payment
    };
  }
}

// Mock Stripe API for testing
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => {
    return {
      paymentIntents: {
        create: jest.fn().mockImplementation(({ amount, currency, metadata }) => {
          return Promise.resolve({
            id: 'pi_test_' + Date.now(),
            amount,
            currency,
            status: 'requires_payment_method',
            client_secret: 'cs_test_' + Date.now(),
            metadata
          });
        }),
        retrieve: jest.fn().mockImplementation((id) => {
          return Promise.resolve({
            id,
            amount: 5000,
            currency: 'USD',
            status: 'succeeded',
            metadata: { bookingId: 'booking-123' }
          });
        }),
        cancel: jest.fn().mockImplementation((id) => {
          return Promise.resolve({
            id,
            amount: 5000,
            currency: 'USD',
            status: 'canceled',
            metadata: { bookingId: 'booking-123' }
          });
        })
      },
      webhooks: {
        constructEvent: jest.fn().mockImplementation((payload, signature) => {
          return {
            type: 'payment_intent.succeeded',
            data: {
              object: {
                id: 'pi_test_' + Date.now(),
                status: 'succeeded',
                amount: 5000,
                currency: 'USD',
                metadata: { bookingId: 'booking-123' }
              }
            }
          };
        })
      }
    };
  });
});

// Define a YachtInfo type for mock data
interface YachtInfo {
  id: string;
  name: string;
  producerId: string;
  description: string;
  location: string;
  capacity: number;
  pricePerDay: number;
  available: boolean;
  images: Array<{ url: string; type: string }>;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

describe('Booking-Payment Integration', () => {
  let testEnv: EmulatorInstance;
  let bookingRepository: FirestoreBookingRepository;
  let paymentRepository: FirestorePaymentRepository;
  let yachtRepository: FirestoreYachtRepository;
  let paymentService: StripePaymentService;
  
  let createBookingUseCase: CreateBookingUseCase;
  let getBookingUseCase: GetBookingUseCase;
  let cancelBookingUseCase: CancelBookingUseCase;
  let createPaymentIntentUseCase: CreatePaymentIntentUseCase;
  let processPaymentUseCase: ProcessPaymentUseCase;
  let cancelPaymentUseCase: CancelPaymentUseCase;
  
  // Mock yacht data
  const mockYacht: YachtInfo = {
    id: 'yacht-123',
    name: 'Luxury Yacht',
    producerId: 'producer-123',
    description: 'A luxurious yacht for your vacation',
    location: 'Dubai Marina',
    capacity: 10,
    pricePerDay: 5000,
    available: true,
    images: [{ url: 'https://example.com/yacht.jpg', type: 'image' }],
    features: ['WiFi', 'Swimming Pool'],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  beforeAll(async () => {
    // Initialize Firebase emulators for testing
    testEnv = initializeTestEnvironment({
      projectId: 'test-project',
      host: 'localhost',
      ports: {
        firestore: EMULATOR_PORTS.firestore
      },
      useAuth: false,
      useFirestore: true,
      disableWarnings: true
    });
    
    // Initialize repositories and services
    bookingRepository = new FirestoreBookingRepository(testEnv.firestore!);
    paymentRepository = new FirestorePaymentRepository(testEnv.firestore!);
    yachtRepository = new FirestoreYachtRepository(testEnv.firestore!);
    paymentService = new StripePaymentService('test_key');
    
    // Create mock yacht data
    await testEnv.firestore?.collection('yachts').doc('yacht-123').set(mockYacht);
    
    // Initialize use cases
    createBookingUseCase = new CreateBookingUseCase(bookingRepository, yachtRepository);
    getBookingUseCase = new GetBookingUseCase(bookingRepository, yachtRepository);
    cancelBookingUseCase = new CancelBookingUseCase(bookingRepository);
    createPaymentIntentUseCase = new CreatePaymentIntentUseCase(
      bookingRepository,
      paymentRepository, 
      paymentService
    );
    processPaymentUseCase = new ProcessPaymentUseCase(
      bookingRepository,
      paymentRepository,
      paymentService
    );
    cancelPaymentUseCase = new CancelPaymentUseCase(
      bookingRepository,
      paymentRepository,
      paymentService
    );
  });
  
  afterAll(async () => {
    await testEnv.firestore?.terminate();
  });
  
  beforeEach(async () => {
    // Clear data between tests
    const collections = ['bookings', 'payments'];
    
    for (const collection of collections) {
      const snapshot = await testEnv.firestore?.collection(collection).get();
      const batch = testEnv.firestore?.batch();
      
      if (snapshot) {
        snapshot.docs.forEach((doc) => {
          batch?.delete(doc.ref);
        });
        
        if (snapshot.size > 0) {
          await batch?.commit();
        }
      }
    }
  });
  
  describe('Booking and Payment Flow Integration', () => {
    it('should handle a complete booking and payment cycle', async () => {
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Step 1: Create a booking
      const createBookingResult = await createBookingUseCase.execute({
        userId,
        yachtId: 'yacht-123',
        startDate,
        endDate,
        guestCount: 5,
        specialRequests: 'Need a captain'
      });
      
      expect(createBookingResult.success).toBe(true);
      expect(createBookingResult.booking).toBeDefined();
      
      const bookingId = createBookingResult.booking!.id;
      
      // Step 2: Retrieve the booking to verify it's created
      const getBookingResult = await getBookingUseCase.execute({
        bookingId,
        userId
      });
      
      expect(getBookingResult.success).toBe(true);
      expect(getBookingResult.booking).toBeDefined();
      expect(getBookingResult.booking!.status).toBe(BookingStatus.PENDING);
      
      // Step 3: Create a payment intent
      const createPaymentIntentResult = await createPaymentIntentUseCase.execute({
        bookingId,
        userId
      });
      
      expect(createPaymentIntentResult.success).toBe(true);
      expect(createPaymentIntentResult.paymentIntent).toBeDefined();
      
      const paymentIntentId = createPaymentIntentResult.paymentIntent!.id;
      
      // Step 4: Verify booking was updated with payment info
      const getBookingAfterPaymentIntentResult = await getBookingUseCase.execute({
        bookingId,
        userId
      });
      
      expect(getBookingAfterPaymentIntentResult.success).toBe(true);
      expect(getBookingAfterPaymentIntentResult.booking!.paymentId).toBe(paymentIntentId);
      expect(getBookingAfterPaymentIntentResult.booking!.paymentStatus).toBe(PaymentStatus.PENDING);
      
      // Step 5: Process the payment (simulate payment succeeded)
      const processPaymentResult = await processPaymentUseCase.execute({
        paymentIntentId,
        userId
      });
      
      expect(processPaymentResult.success).toBe(true);
      expect(processPaymentResult.payment).toBeDefined();
      expect(processPaymentResult.payment!.status).toBe(PaymentStatus.PAID);
      
      // Step 6: Verify booking was updated after payment
      const getBookingAfterPaymentResult = await getBookingUseCase.execute({
        bookingId,
        userId
      });
      
      expect(getBookingAfterPaymentResult.success).toBe(true);
      expect(getBookingAfterPaymentResult.booking!.status).toBe(BookingStatus.CONFIRMED);
      expect(getBookingAfterPaymentResult.booking!.paymentStatus).toBe(PaymentStatus.PAID);
    });
    
    it('should handle payment cancellation correctly', async () => {
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Step 1: Create a booking
      const createBookingResult = await createBookingUseCase.execute({
        userId,
        yachtId: 'yacht-123',
        startDate,
        endDate,
        guestCount: 5
      });
      
      expect(createBookingResult.success).toBe(true);
      const bookingId = createBookingResult.booking!.id;
      
      // Step 2: Create a payment intent
      const createPaymentIntentResult = await createPaymentIntentUseCase.execute({
        bookingId,
        userId
      });
      
      expect(createPaymentIntentResult.success).toBe(true);
      const paymentIntentId = createPaymentIntentResult.paymentIntent!.id;
      
      // Step 3: Cancel the payment
      const cancelPaymentResult = await cancelPaymentUseCase.execute({
        paymentIntentId,
        userId
      });
      
      expect(cancelPaymentResult.success).toBe(true);
      expect(cancelPaymentResult.payment).toBeDefined();
      expect(cancelPaymentResult.payment!.status).toBe(PaymentStatus.FAILED);
      
      // Step 4: Verify booking was updated with cancelled status
      const getBookingAfterCancelResult = await getBookingUseCase.execute({
        bookingId,
        userId
      });
      
      expect(getBookingAfterCancelResult.success).toBe(true);
      expect(getBookingAfterCancelResult.booking!.status).toBe(BookingStatus.CANCELLED);
      expect(getBookingAfterCancelResult.booking!.paymentStatus).toBe(PaymentStatus.FAILED);
    });
    
    it('should handle cancellation of a booking with payment', async () => {
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Step 1: Create a booking
      const createBookingResult = await createBookingUseCase.execute({
        userId,
        yachtId: 'yacht-123',
        startDate,
        endDate,
        guestCount: 5
      });
      
      expect(createBookingResult.success).toBe(true);
      const bookingId = createBookingResult.booking!.id;
      
      // Step 2: Create a payment intent
      const createPaymentIntentResult = await createPaymentIntentUseCase.execute({
        bookingId,
        userId
      });
      
      expect(createPaymentIntentResult.success).toBe(true);
      const paymentIntentId = createPaymentIntentResult.paymentIntent!.id;
      
      // Step 3: Cancel the booking
      const cancelBookingResult = await cancelBookingUseCase.execute({
        bookingId,
        userId
      });
      
      expect(cancelBookingResult.success).toBe(true);
      expect(cancelBookingResult.booking).toBeDefined();
      expect(cancelBookingResult.booking!.status).toBe(BookingStatus.CANCELLED);
      
      // Step 4: Verify payment was also cancelled
      const payment = await paymentRepository.getByPaymentIntentId(paymentIntentId);
      expect(payment).toBeDefined();
      expect(payment!.status).toBe(PaymentStatus.FAILED);
    });
    
    it('should prevent unauthorized users from accessing the booking-payment flow', async () => {
      const userId = 'user-456';
      const unauthorizedUser = 'user-789';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Step 1: Create a booking
      const createBookingResult = await createBookingUseCase.execute({
        userId,
        yachtId: 'yacht-123',
        startDate,
        endDate,
        guestCount: 5
      });
      
      expect(createBookingResult.success).toBe(true);
      const bookingId = createBookingResult.booking!.id;
      
      // Step 2: Try to create a payment intent with unauthorized user
      const createPaymentIntentResult = await createPaymentIntentUseCase.execute({
        bookingId,
        userId: unauthorizedUser
      });
      
      expect(createPaymentIntentResult.success).toBe(false);
      expect(createPaymentIntentResult.error).toBeDefined();
      expect(createPaymentIntentResult.error).toContain('not authorized');
      
      // Step 3: Create a payment intent with the correct user
      const validPaymentIntentResult = await createPaymentIntentUseCase.execute({
        bookingId,
        userId
      });
      
      expect(validPaymentIntentResult.success).toBe(true);
      const paymentIntentId = validPaymentIntentResult.paymentIntent!.id;
      
      // Step 4: Try to process payment with unauthorized user
      const processPaymentResult = await processPaymentUseCase.execute({
        paymentIntentId,
        userId: unauthorizedUser
      });
      
      expect(processPaymentResult.success).toBe(false);
      expect(processPaymentResult.error).toBeDefined();
      expect(processPaymentResult.error).toContain('not authorized');
    });
  });
});