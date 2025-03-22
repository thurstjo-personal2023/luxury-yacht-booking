/**
 * End-to-End Payment Flow Test
 * 
 * This test verifies the complete payment flow from creating a booking,
 * to creating a payment intent, processing the payment, and completing the booking.
 */

import express, { Express, Request, Response } from 'express';
import request from 'supertest';
import { Server } from 'http';
import bodyParser from 'body-parser';
import { initializeTestEnvironment, EmulatorInstance, EMULATOR_PORTS } from '../../emulator-setup';
import { FirestoreBookingRepository } from '../../../adapters/repositories/firestore/firestore-booking-repository';
import { FirestorePaymentRepository } from '../../../adapters/repositories/firestore/firestore-payment-repository';
import { StripePaymentService } from '../../../adapters/payment/stripe-payment-service';
import { CreatePaymentIntentUseCase } from '../../../core/application/use-cases/payment/create-payment-intent-use-case';
import { ProcessPaymentUseCase } from '../../../core/application/use-cases/payment/process-payment-use-case';
import { CancelPaymentUseCase } from '../../../core/application/use-cases/payment/cancel-payment-use-case';
import { Booking } from '../../../core/domain/booking/booking';
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

describe('Payment Flow E2E', () => {
  let testEnv: EmulatorInstance;
  let app: Express;
  let server: Server;
  let bookingRepository: FirestoreBookingRepository;
  let paymentRepository: FirestorePaymentRepository;
  let paymentService: StripePaymentService;
  let createPaymentIntentUseCase: CreatePaymentIntentUseCase;
  let processPaymentUseCase: ProcessPaymentUseCase;
  let cancelPaymentUseCase: CancelPaymentUseCase;
  
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
    paymentService = new StripePaymentService('test_key');
    
    // Initialize use cases
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
    
    // Set up Express server with API routes
    app = express();
    app.use(bodyParser.json());
    
    // Create payment intent route
    app.post('/api/payments/create-intent', async (req: Request, res: Response) => {
      const { bookingId, userId } = req.body;
      
      try {
        const result = await createPaymentIntentUseCase.execute({
          bookingId,
          userId
        });
        
        if (result.success) {
          res.status(200).json(result);
        } else {
          res.status(400).json({ error: result.error });
        }
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Process payment route
    app.post('/api/payments/process', async (req: Request, res: Response) => {
      const { paymentIntentId, userId } = req.body;
      
      try {
        const result = await processPaymentUseCase.execute({
          paymentIntentId,
          userId
        });
        
        if (result.success) {
          res.status(200).json(result);
        } else {
          res.status(400).json({ error: result.error });
        }
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Cancel payment route
    app.post('/api/payments/cancel', async (req: Request, res: Response) => {
      const { paymentIntentId, userId } = req.body;
      
      try {
        const result = await cancelPaymentUseCase.execute({
          paymentIntentId,
          userId
        });
        
        if (result.success) {
          res.status(200).json(result);
        } else {
          res.status(400).json({ error: result.error });
        }
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Start the server
    server = app.listen(3001);
  });
  
  afterAll(async () => {
    // Close server and clean up resources
    if (server) {
      server.close();
    }
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
  
  describe('Complete payment flow', () => {
    it('should create, process, and complete a payment', async () => {
      // Step 1: Create a booking
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId,
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 5000,
        createdAt: now
      });
      
      await bookingRepository.create(booking);
      
      // Step 2: Create a payment intent
      const createResponse = await request(app)
        .post('/api/payments/create-intent')
        .send({
          bookingId: 'booking-123',
          userId
        });
      
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.paymentIntent).toBeDefined();
      
      const { paymentIntent } = createResponse.body;
      
      // Step 3: Verify booking was updated with payment info
      const bookingAfterIntent = await bookingRepository.getById('booking-123');
      expect(bookingAfterIntent).toBeDefined();
      expect(bookingAfterIntent?.paymentId).toBe(paymentIntent.id);
      expect(bookingAfterIntent?.paymentStatus).toBe(PaymentStatus.PENDING);
      
      // Step 4: Process the payment
      const processResponse = await request(app)
        .post('/api/payments/process')
        .send({
          paymentIntentId: paymentIntent.id,
          userId
        });
      
      expect(processResponse.status).toBe(200);
      expect(processResponse.body.success).toBe(true);
      
      // Step 5: Verify booking was updated with payment status
      const bookingAfterPayment = await bookingRepository.getById('booking-123');
      expect(bookingAfterPayment).toBeDefined();
      expect(bookingAfterPayment?.status).toBe(BookingStatus.CONFIRMED);
      expect(bookingAfterPayment?.paymentStatus).toBe(PaymentStatus.PAID);
      
      // Step 6: Verify payment details were saved
      const payment = await paymentRepository.getByPaymentIntentId(paymentIntent.id);
      expect(payment).toBeDefined();
      expect(payment?.status).toBe(PaymentStatus.PAID);
      expect(payment?.processingDate).toBeDefined();
    });
    
    it('should create and cancel a payment', async () => {
      // Step 1: Create a booking
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId,
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 5000,
        createdAt: now
      });
      
      await bookingRepository.create(booking);
      
      // Step 2: Create a payment intent
      const createResponse = await request(app)
        .post('/api/payments/create-intent')
        .send({
          bookingId: 'booking-123',
          userId
        });
      
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.success).toBe(true);
      
      const { paymentIntent } = createResponse.body;
      
      // Step 3: Cancel the payment
      const cancelResponse = await request(app)
        .post('/api/payments/cancel')
        .send({
          paymentIntentId: paymentIntent.id,
          userId
        });
      
      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.success).toBe(true);
      
      // Step 4: Verify booking was updated with cancelled status
      const bookingAfterCancel = await bookingRepository.getById('booking-123');
      expect(bookingAfterCancel).toBeDefined();
      expect(bookingAfterCancel?.status).toBe(BookingStatus.CANCELLED);
      expect(bookingAfterCancel?.paymentStatus).toBe(PaymentStatus.FAILED);
      
      // Step 5: Verify payment details were updated
      const payment = await paymentRepository.getByPaymentIntentId(paymentIntent.id);
      expect(payment).toBeDefined();
      expect(payment?.status).toBe(PaymentStatus.FAILED);
    });
    
    it('should reject payment if user is not authorized', async () => {
      // Step 1: Create a booking
      const userId = 'user-456';
      const wrongUserId = 'user-789';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId,
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 5000,
        createdAt: now
      });
      
      await bookingRepository.create(booking);
      
      // Step 2: Attempt to create a payment intent with wrong user
      const createResponse = await request(app)
        .post('/api/payments/create-intent')
        .send({
          bookingId: 'booking-123',
          userId: wrongUserId
        });
      
      expect(createResponse.status).toBe(400);
      expect(createResponse.body.error).toBeDefined();
      expect(createResponse.body.error).toContain('not authorized');
      
      // Step 3: Verify booking was not updated
      const bookingAfterAttempt = await bookingRepository.getById('booking-123');
      expect(bookingAfterAttempt).toBeDefined();
      expect(bookingAfterAttempt?.paymentId).toBeUndefined();
      expect(bookingAfterAttempt?.status).toBe(BookingStatus.PENDING);
    });
  });
});