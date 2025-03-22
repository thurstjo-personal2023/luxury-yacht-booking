/**
 * Payment Flow End-to-End Test
 * 
 * This test verifies the complete payment flow from a booking
 * to successful payment processing against the Firebase emulator.
 */

import { initializeTestEnvironment, cleanupTestEnvironment } from '../../emulator-setup';
import { Firestore } from 'firebase/firestore';
import { Auth, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  BookingStatus, 
  PaymentStatus 
} from '../../common/domain-types';

// Mock implementation - replace with actual implementations when available
interface MockBookingRepository {
  create: (booking: any) => Promise<any>;
  getById: (id: string) => Promise<any>;
  update: (booking: any) => Promise<any>;
}

interface MockPaymentRepository {
  create: (payment: any) => Promise<any>;
  getById: (id: string) => Promise<any>;
  getByBookingId: (bookingId: string) => Promise<any>;
  update: (payment: any) => Promise<any>;
}

// Mock implementation of the payment service
class MockStripePaymentService {
  constructor(private apiKey: string) {}

  async createPaymentIntent(bookingInfo: any): Promise<any> {
    return {
      id: `pi_test_${Date.now()}`,
      client_secret: `cs_test_${Date.now()}`,
      amount: bookingInfo.amount,
      currency: bookingInfo.currency || 'USD',
      status: 'requires_payment_method',
      metadata: bookingInfo.metadata || {}
    };
  }

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId: string): Promise<any> {
    return {
      id: paymentIntentId,
      status: 'succeeded',
      amount: 5000,
      currency: 'USD'
    };
  }

  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    return {
      id: paymentIntentId,
      status: 'succeeded',
      amount: 5000,
      currency: 'USD'
    };
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<any> {
    return {
      id: paymentIntentId,
      status: 'canceled',
      amount: 5000,
      currency: 'USD'
    };
  }
}

// Mock express app for API routes
class MockExpressApp {
  private routes: Map<string, Map<string, Function>> = new Map();

  constructor() {
    this.routes.set('get', new Map());
    this.routes.set('post', new Map());
    this.routes.set('put', new Map());
    this.routes.set('delete', new Map());
  }

  get(path: string, handler: Function) {
    this.routes.get('get')!.set(path, handler);
    return this;
  }

  post(path: string, handler: Function) {
    this.routes.get('post')!.set(path, handler);
    return this;
  }

  put(path: string, handler: Function) {
    this.routes.get('put')!.set(path, handler);
    return this;
  }

  delete(path: string, handler: Function) {
    this.routes.get('delete')!.set(path, handler);
    return this;
  }

  async executeRequest(method: string, path: string, body: any = {}, headers: any = {}): Promise<any> {
    const handler = this.routes.get(method.toLowerCase())?.get(path);
    if (!handler) {
      throw new Error(`No handler found for ${method} ${path}`);
    }

    const req = {
      body,
      headers,
      params: {},
      query: {},
      user: { uid: 'test-user-id' }
    };

    let statusCode: number | undefined;
    let responseBody: any;

    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        responseBody = data;
        return res;
      },
      send: (data: any) => {
        responseBody = data;
        return res;
      }
    };

    await handler(req, res);

    return {
      status: statusCode || 200,
      body: responseBody
    };
  }
}

describe('Payment Flow (E2E)', () => {
  let db: Firestore;
  let auth: Auth;
  let app: MockExpressApp;
  let bookingRepository: MockBookingRepository;
  let paymentRepository: MockPaymentRepository;
  let paymentService: MockStripePaymentService;
  let testEnv: any;
  let consumerUid: string;
  let producerUid: string;

  beforeAll(async () => {
    // Initialize emulator environment
    testEnv = await initializeTestEnvironment({
      projectId: 'test-project',
      useAuth: true,
      useFirestore: true
    });

    db = testEnv.firestore;
    auth = testEnv.auth;

    // Create test users
    const consumerEmail = `consumer-${Date.now()}@example.com`;
    const consumerCred = await createUserWithEmailAndPassword(
      auth, consumerEmail, 'password123'
    );
    consumerUid = consumerCred.user.uid;

    const producerEmail = `producer-${Date.now()}@example.com`;
    const producerCred = await createUserWithEmailAndPassword(
      auth, producerEmail, 'password123'
    );
    producerUid = producerCred.user.uid;

    // Create user documents in Firestore
    await db.collection('users').doc(consumerUid).set({
      email: consumerEmail,
      role: 'consumer',
      createdAt: new Date()
    });

    await db.collection('users').doc(producerUid).set({
      email: producerEmail,
      role: 'producer',
      createdAt: new Date()
    });

    // Create a test yacht
    const yachtId = `yacht-test-${Date.now()}`;
    await db.collection('yacht_profiles').doc(yachtId).set({
      id: yachtId,
      name: 'Test Luxury Yacht',
      producerId: producerUid,
      description: 'A luxury yacht for end-to-end testing',
      location: 'Test Marina',
      capacity: 10,
      pricePerDay: 5000,
      available: true,
      images: [{ url: 'https://example.com/test-yacht.jpg', type: 'image' }],
      features: ['WiFi', 'Air Conditioning', 'Swimming Pool'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Initialize mocks
    app = new MockExpressApp();
    
    // Create mock repositories that use Firestore
    bookingRepository = {
      create: async (booking: any) => {
        const bookingRef = db.collection('bookings').doc(booking.id);
        await bookingRef.set({
          ...booking,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return booking;
      },
      getById: async (id: string) => {
        const doc = await db.collection('bookings').doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
      },
      update: async (booking: any) => {
        const bookingRef = db.collection('bookings').doc(booking.id);
        await bookingRef.update({
          ...booking,
          updatedAt: new Date()
        });
        return booking;
      }
    };

    paymentRepository = {
      create: async (payment: any) => {
        const paymentRef = db.collection('payments').doc(payment.id);
        await paymentRef.set({
          ...payment,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return payment;
      },
      getById: async (id: string) => {
        const doc = await db.collection('payments').doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
      },
      getByBookingId: async (bookingId: string) => {
        const snapshot = await db.collection('payments')
          .where('bookingId', '==', bookingId)
          .limit(1)
          .get();
        return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      },
      update: async (payment: any) => {
        const paymentRef = db.collection('payments').doc(payment.id);
        await paymentRef.update({
          ...payment,
          updatedAt: new Date()
        });
        return payment;
      }
    };

    // Initialize payment service with test key
    paymentService = new MockStripePaymentService('sk_test_mock_key');

    // Setup payment routes
    app.post('/api/payments/create-intent', async (req, res) => {
      try {
        const { bookingId } = req.body;
        if (!bookingId) {
          return res.status(400).json({ error: 'Booking ID is required' });
        }

        // Get booking details
        const booking = await bookingRepository.getById(bookingId);
        if (!booking) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        // Check authorization
        if (booking.userId !== req.user.uid) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Create payment intent
        const paymentIntent = await paymentService.createPaymentIntent({
          amount: booking.totalAmount,
          currency: 'USD',
          metadata: {
            bookingId: booking.id,
            userId: booking.userId,
            yachtId: booking.yachtId
          }
        });

        res.json({ success: true, paymentIntent });
      } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
      }
    });

    app.post('/api/payments/confirm', async (req, res) => {
      try {
        const { paymentIntentId, paymentMethodId } = req.body;
        if (!paymentIntentId || !paymentMethodId) {
          return res.status(400).json({ error: 'Payment intent ID and payment method ID are required' });
        }

        // Confirm the payment
        const result = await paymentService.confirmPaymentIntent(paymentIntentId, paymentMethodId);

        // Get payment intent details to get the booking ID
        const paymentIntent = await paymentService.getPaymentIntent(paymentIntentId);
        const bookingId = paymentIntent.metadata?.bookingId;

        if (!bookingId) {
          return res.status(400).json({ error: 'Booking ID not found in payment metadata' });
        }

        // Get the booking
        const booking = await bookingRepository.getById(bookingId);
        if (!booking) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        // Create a payment record
        const payment = {
          id: `payment-${Date.now()}`,
          bookingId: booking.id,
          paymentIntentId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: PaymentStatus.PAID,
          processingDate: new Date(),
          metadata: paymentIntent.metadata
        };

        // Save the payment
        const savedPayment = await paymentRepository.create(payment);

        // Update the booking status
        booking.paymentId = savedPayment.id;
        booking.paymentStatus = PaymentStatus.PAID;
        booking.status = BookingStatus.CONFIRMED;
        await bookingRepository.update(booking);

        res.json({ success: true, payment: savedPayment });
      } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({ error: 'Failed to confirm payment' });
      }
    });

    app.post('/api/payments/cancel', async (req, res) => {
      try {
        const { paymentIntentId } = req.body;
        if (!paymentIntentId) {
          return res.status(400).json({ error: 'Payment intent ID is required' });
        }

        // Cancel the payment intent
        const result = await paymentService.cancelPaymentIntent(paymentIntentId);

        // Get payment intent details to get the booking ID
        const paymentIntent = await paymentService.getPaymentIntent(paymentIntentId);
        const bookingId = paymentIntent.metadata?.bookingId;

        if (!bookingId) {
          return res.status(400).json({ error: 'Booking ID not found in payment metadata' });
        }

        // Get the booking
        const booking = await bookingRepository.getById(bookingId);
        if (!booking) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        // Update the booking status
        booking.status = BookingStatus.CANCELLED;
        booking.cancelledAt = new Date();
        await bookingRepository.update(booking);

        res.json({ success: true, booking });
      } catch (error) {
        console.error('Error cancelling payment:', error);
        res.status(500).json({ error: 'Failed to cancel payment' });
      }
    });
  });

  afterAll(async () => {
    // Clean up Firestore data
    const batch = db.batch();

    // Delete test users
    if (consumerUid) {
      batch.delete(db.collection('users').doc(consumerUid));
    }
    if (producerUid) {
      batch.delete(db.collection('users').doc(producerUid));
    }

    // Delete test bookings
    const bookings = await db.collection('bookings').get();
    bookings.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete test payments
    const payments = await db.collection('payments').get();
    payments.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Clean up environment
    await cleanupTestEnvironment(testEnv);
  });

  it('should process a successful payment flow', async () => {
    // Create a booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);
    
    const bookingId = `booking-${Date.now()}`;
    const booking = {
      id: bookingId,
      userId: consumerUid,
      yachtId: `yacht-test-${Date.now()}`,
      startDate: tomorrow,
      endDate: dayAfter,
      status: BookingStatus.PENDING,
      totalAmount: 10000,
      guestCount: 5,
      specialRequests: 'Special welcome package',
      createdAt: new Date()
    };
    
    await bookingRepository.create(booking);
    
    // Create payment intent
    const createIntentResponse = await app.executeRequest('post', '/api/payments/create-intent', {
      bookingId: booking.id
    }, {
      Authorization: `Bearer token-for-${consumerUid}`
    });
    
    expect(createIntentResponse.status).toBe(200);
    expect(createIntentResponse.body.success).toBe(true);
    expect(createIntentResponse.body.paymentIntent).toBeDefined();
    
    const { paymentIntent } = createIntentResponse.body;
    
    // Confirm payment with a test payment method
    const confirmResponse = await app.executeRequest('post', '/api/payments/confirm', {
      paymentIntentId: paymentIntent.id,
      paymentMethodId: 'pm_test_card_visa'
    }, {
      Authorization: `Bearer token-for-${consumerUid}`
    });
    
    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.success).toBe(true);
    expect(confirmResponse.body.payment).toBeDefined();
    
    // Check that booking was updated
    const updatedBooking = await bookingRepository.getById(booking.id);
    expect(updatedBooking).toBeDefined();
    expect(updatedBooking.status).toBe(BookingStatus.CONFIRMED);
    expect(updatedBooking.paymentStatus).toBe(PaymentStatus.PAID);
    expect(updatedBooking.paymentId).toBeDefined();
    
    // Check payment record
    const payment = await paymentRepository.getByBookingId(booking.id);
    expect(payment).toBeDefined();
    expect(payment.paymentIntentId).toBe(paymentIntent.id);
    expect(payment.status).toBe(PaymentStatus.PAID);
  });
  
  it('should handle payment cancellation', async () => {
    // Create a booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);
    
    const bookingId = `booking-cancel-${Date.now()}`;
    const booking = {
      id: bookingId,
      userId: consumerUid,
      yachtId: `yacht-test-${Date.now()}`,
      startDate: tomorrow,
      endDate: dayAfter,
      status: BookingStatus.PENDING,
      totalAmount: 10000,
      guestCount: 5,
      createdAt: new Date()
    };
    
    await bookingRepository.create(booking);
    
    // Create payment intent
    const createIntentResponse = await app.executeRequest('post', '/api/payments/create-intent', {
      bookingId: booking.id
    }, {
      Authorization: `Bearer token-for-${consumerUid}`
    });
    
    expect(createIntentResponse.status).toBe(200);
    expect(createIntentResponse.body.success).toBe(true);
    expect(createIntentResponse.body.paymentIntent).toBeDefined();
    
    const { paymentIntent } = createIntentResponse.body;
    
    // Cancel payment
    const cancelResponse = await app.executeRequest('post', '/api/payments/cancel', {
      paymentIntentId: paymentIntent.id
    }, {
      Authorization: `Bearer token-for-${consumerUid}`
    });
    
    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.success).toBe(true);
    
    // Check that booking was updated
    const updatedBooking = await bookingRepository.getById(booking.id);
    expect(updatedBooking).toBeDefined();
    expect(updatedBooking.status).toBe(BookingStatus.CANCELLED);
  });
  
  it('should fail when booking does not exist', async () => {
    // Try to create payment intent for non-existent booking
    const createIntentResponse = await app.executeRequest('post', '/api/payments/create-intent', {
      bookingId: 'booking-does-not-exist'
    }, {
      Authorization: `Bearer token-for-${consumerUid}`
    });
    
    expect(createIntentResponse.status).toBe(404);
    expect(createIntentResponse.body.error).toContain('not found');
  });
});