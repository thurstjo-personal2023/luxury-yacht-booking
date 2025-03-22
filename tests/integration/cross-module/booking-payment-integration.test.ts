/**
 * Booking-Payment Cross-Module Integration Test
 * 
 * This test verifies the integration between the booking and payment modules,
 * ensuring they work together correctly in real-world scenarios.
 */

import { initializeTestEnvironment, EmulatorInstance, EMULATOR_PORTS } from '../../emulator-setup';
import { FirestoreBookingRepository } from '../../../adapters/repositories/firestore/firestore-booking-repository';
import { FirestorePaymentRepository } from '../../../adapters/repositories/firestore/firestore-payment-repository';
import { FirestoreYachtRepository } from '../../../adapters/repositories/firestore/firestore-yacht-repository';
import { StripePaymentService } from '../../../adapters/payment/stripe-payment-service';
import { CreateBookingUseCase } from '../../../core/application/use-cases/booking/create-booking-use-case';
import { GetBookingUseCase } from '../../../core/application/use-cases/booking/get-booking-use-case';
import { CancelBookingUseCase } from '../../../core/application/use-cases/booking/cancel-booking-use-case';
import { CreatePaymentIntentUseCase } from '../../../core/application/use-cases/payment/create-payment-intent-use-case';
import { ProcessPaymentUseCase } from '../../../core/application/use-cases/payment/process-payment-use-case';
import { CancelPaymentUseCase } from '../../../core/application/use-cases/payment/cancel-payment-use-case';
import { YachtInfo } from '../../../core/domain/yacht/yacht-info';
import { BookingStatus } from '../../../core/domain/booking/booking-status';
import { PaymentStatus } from '../../../core/domain/payment/payment-status';

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