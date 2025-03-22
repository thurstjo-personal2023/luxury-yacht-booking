/**
 * Booking Flow End-to-End Test
 * 
 * This test verifies the complete booking flow from searching for a yacht
 * to creating a booking, using the Firebase emulator.
 */

import { initializeTestEnvironment, cleanupTestEnvironment } from '../../emulator-setup';
import { Firestore } from 'firebase/firestore';
import { Auth, createUserWithEmailAndPassword } from 'firebase/auth';
import { BookingStatus } from '../../common/domain-types';

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
      user: { uid: headers.Authorization ? headers.Authorization.split('-').pop() : 'anonymous' }
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

describe('Booking Flow (E2E)', () => {
  let db: Firestore;
  let auth: Auth;
  let app: MockExpressApp;
  let testEnv: any;
  let consumerUid: string;
  let producerUid: string;
  let testYachtId: string;

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

    // Create test yachts
    testYachtId = `yacht-test-${Date.now()}`;
    await db.collection('yacht_profiles').doc(testYachtId).set({
      id: testYachtId,
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

    // Create a second yacht that is unavailable
    const unavailableYachtId = `yacht-unavailable-${Date.now()}`;
    await db.collection('yacht_profiles').doc(unavailableYachtId).set({
      id: unavailableYachtId,
      name: 'Unavailable Yacht',
      producerId: producerUid,
      description: 'An unavailable yacht for testing',
      location: 'Test Marina',
      capacity: 8,
      pricePerDay: 4000,
      available: false,
      images: [{ url: 'https://example.com/unavailable-yacht.jpg', type: 'image' }],
      features: ['WiFi', 'Air Conditioning'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Initialize mock express app
    app = new MockExpressApp();

    // Setup booking API routes
    app.get('/api/yachts/search', async (req, res) => {
      try {
        const { location, startDate, endDate, capacity } = req.query;
        
        // Basic validation
        if (!location) {
          return res.status(400).json({ error: 'Location is required' });
        }

        // Query yachts from Firestore
        let query = db.collection('yacht_profiles');
        
        // Apply filters
        if (location) {
          query = query.where('location', '==', location);
        }
        
        if (capacity) {
          query = query.where('capacity', '>=', parseInt(capacity as string));
        }
        
        // Only get available yachts
        query = query.where('available', '==', true);
        
        const snapshot = await query.get();
        const yachts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        res.json({ success: true, yachts });
      } catch (error) {
        console.error('Error searching yachts:', error);
        res.status(500).json({ error: 'Failed to search yachts' });
      }
    });

    app.get('/api/yachts/:id', async (req, res) => {
      try {
        const { id } = req.params;
        
        // Get yacht from Firestore
        const doc = await db.collection('yacht_profiles').doc(id).get();
        if (!doc.exists) {
          return res.status(404).json({ error: 'Yacht not found' });
        }
        
        const yacht = { id: doc.id, ...doc.data() };
        res.json({ success: true, yacht });
      } catch (error) {
        console.error('Error getting yacht:', error);
        res.status(500).json({ error: 'Failed to get yacht' });
      }
    });

    app.post('/api/bookings/check-availability', async (req, res) => {
      try {
        const { yachtId, startDate, endDate } = req.body;
        
        // Basic validation
        if (!yachtId || !startDate || !endDate) {
          return res.status(400).json({ error: 'Yacht ID, start date, and end date are required' });
        }
        
        // Parse dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Get yacht from Firestore
        const doc = await db.collection('yacht_profiles').doc(yachtId).get();
        if (!doc.exists) {
          return res.status(404).json({ error: 'Yacht not found' });
        }
        
        const yacht = { id: doc.id, ...doc.data() };
        
        // Check if yacht is available
        if (!yacht.available) {
          return res.json({ success: true, available: false, reason: 'Yacht is marked as unavailable' });
        }
        
        // Check for overlapping bookings
        const snapshot = await db.collection('bookings')
          .where('yachtId', '==', yachtId)
          .where('status', 'in', [BookingStatus.PENDING, BookingStatus.CONFIRMED])
          .get();
        
        const conflicts = snapshot.docs.filter(doc => {
          const booking = doc.data();
          const bookingStart = booking.startDate.toDate();
          const bookingEnd = booking.endDate.toDate();
          
          // Check for overlap
          return (
            (start <= bookingEnd && end >= bookingStart) ||
            (bookingStart <= end && bookingEnd >= start)
          );
        });
        
        const available = conflicts.length === 0;
        
        res.json({ 
          success: true, 
          available,
          conflicts: available ? [] : conflicts.map(doc => ({ id: doc.id, ...doc.data() }))
        });
      } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({ error: 'Failed to check availability' });
      }
    });

    app.post('/api/bookings', async (req, res) => {
      try {
        const { yachtId, startDate, endDate, guestCount, specialRequests } = req.body;
        
        // Basic validation
        if (!yachtId || !startDate || !endDate) {
          return res.status(400).json({ error: 'Yacht ID, start date, and end date are required' });
        }
        
        // Check if user is authenticated
        if (!req.user || !req.user.uid) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Parse dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Get yacht from Firestore
        const yachtDoc = await db.collection('yacht_profiles').doc(yachtId).get();
        if (!yachtDoc.exists) {
          return res.status(404).json({ error: 'Yacht not found' });
        }
        
        const yacht = { id: yachtDoc.id, ...yachtDoc.data() };
        
        // Check availability
        if (!yacht.available) {
          return res.status(400).json({ error: 'Yacht is not available' });
        }
        
        // Check for overlapping bookings
        const snapshot = await db.collection('bookings')
          .where('yachtId', '==', yachtId)
          .where('status', 'in', [BookingStatus.PENDING, BookingStatus.CONFIRMED])
          .get();
        
        const conflicts = snapshot.docs.filter(doc => {
          const booking = doc.data();
          const bookingStart = booking.startDate.toDate();
          const bookingEnd = booking.endDate.toDate();
          
          // Check for overlap
          return (
            (start <= bookingEnd && end >= bookingStart) ||
            (bookingStart <= end && bookingEnd >= start)
          );
        });
        
        if (conflicts.length > 0) {
          return res.status(400).json({ 
            error: 'Yacht is not available for the selected dates',
            conflicts: conflicts.map(doc => ({ id: doc.id, ...doc.data() }))
          });
        }
        
        // Calculate total amount
        const daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const totalAmount = yacht.pricePerDay * daysCount;
        
        // Create booking
        const bookingId = `booking-${Date.now()}`;
        const booking = {
          id: bookingId,
          userId: req.user.uid,
          yachtId,
          startDate: start,
          endDate: end,
          status: BookingStatus.PENDING,
          totalAmount,
          guestCount: guestCount || 1,
          specialRequests: specialRequests || '',
          createdAt: new Date()
        };
        
        // Save booking to Firestore
        await db.collection('bookings').doc(bookingId).set(booking);
        
        res.json({ success: true, booking });
      } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
      }
    });

    app.get('/api/bookings/:id', async (req, res) => {
      try {
        const { id } = req.params;
        
        // Get booking from Firestore
        const doc = await db.collection('bookings').doc(id).get();
        if (!doc.exists) {
          return res.status(404).json({ error: 'Booking not found' });
        }
        
        const booking = { id: doc.id, ...doc.data() };
        
        // Check authorization
        if (booking.userId !== req.user.uid) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
        
        res.json({ success: true, booking });
      } catch (error) {
        console.error('Error getting booking:', error);
        res.status(500).json({ error: 'Failed to get booking' });
      }
    });

    app.post('/api/bookings/:id/cancel', async (req, res) => {
      try {
        const { id } = req.params;
        
        // Get booking from Firestore
        const doc = await db.collection('bookings').doc(id).get();
        if (!doc.exists) {
          return res.status(404).json({ error: 'Booking not found' });
        }
        
        const booking = { id: doc.id, ...doc.data() };
        
        // Check authorization
        if (booking.userId !== req.user.uid) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Check if booking can be cancelled
        if (booking.status === BookingStatus.CANCELLED) {
          return res.status(400).json({ error: 'Booking is already cancelled' });
        }
        
        if (booking.status === BookingStatus.COMPLETED) {
          return res.status(400).json({ error: 'Completed bookings cannot be cancelled' });
        }
        
        // Update booking status
        booking.status = BookingStatus.CANCELLED;
        booking.cancelledAt = new Date();
        
        // Save updated booking
        await db.collection('bookings').doc(id).update({
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date()
        });
        
        res.json({ success: true, booking });
      } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ error: 'Failed to cancel booking' });
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

    // Delete test yachts
    const yachts = await db.collection('yacht_profiles').get();
    yachts.forEach(doc => {
      if (doc.id.startsWith('yacht-test-') || doc.id.startsWith('yacht-unavailable-')) {
        batch.delete(doc.ref);
      }
    });

    // Delete test bookings
    const bookings = await db.collection('bookings').get();
    bookings.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Clean up environment
    await cleanupTestEnvironment(testEnv);
  });

  it('should search for available yachts', async () => {
    // Execute search request
    const searchResponse = await app.executeRequest('get', '/api/yachts/search', {}, {
      query: {
        location: 'Test Marina',
        capacity: 5
      }
    });
    
    // Verify
    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.success).toBe(true);
    expect(searchResponse.body.yachts).toBeDefined();
    expect(Array.isArray(searchResponse.body.yachts)).toBe(true);
    
    // There should be at least one yacht (our test yacht)
    expect(searchResponse.body.yachts.length).toBeGreaterThan(0);
    
    // Verify the yacht is in the results
    const foundYacht = searchResponse.body.yachts.find((yacht: any) => yacht.id === testYachtId);
    expect(foundYacht).toBeDefined();
  });
  
  it('should retrieve yacht details', async () => {
    // Execute get yacht request
    const getYachtResponse = await app.executeRequest('get', `/api/yachts/${testYachtId}`);
    
    // Verify
    expect(getYachtResponse.status).toBe(200);
    expect(getYachtResponse.body.success).toBe(true);
    expect(getYachtResponse.body.yacht).toBeDefined();
    expect(getYachtResponse.body.yacht.id).toBe(testYachtId);
    expect(getYachtResponse.body.yacht.name).toBe('Test Luxury Yacht');
    expect(getYachtResponse.body.yacht.producerId).toBe(producerUid);
  });
  
  it('should check yacht availability', async () => {
    // Setup dates for availability check
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);
    
    // Execute check availability request
    const checkAvailabilityResponse = await app.executeRequest('post', '/api/bookings/check-availability', {
      yachtId: testYachtId,
      startDate: tomorrow.toISOString(),
      endDate: dayAfter.toISOString()
    });
    
    // Verify
    expect(checkAvailabilityResponse.status).toBe(200);
    expect(checkAvailabilityResponse.body.success).toBe(true);
    expect(checkAvailabilityResponse.body.available).toBe(true);
    expect(checkAvailabilityResponse.body.conflicts).toEqual([]);
  });
  
  it('should create a booking', async () => {
    // Setup dates for booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);
    
    // Execute create booking request
    const createBookingResponse = await app.executeRequest('post', '/api/bookings', {
      yachtId: testYachtId,
      startDate: tomorrow.toISOString(),
      endDate: dayAfter.toISOString(),
      guestCount: 5,
      specialRequests: 'Special welcome package'
    }, {
      Authorization: `Bearer token-for-${consumerUid}`
    });
    
    // Verify
    expect(createBookingResponse.status).toBe(200);
    expect(createBookingResponse.body.success).toBe(true);
    expect(createBookingResponse.body.booking).toBeDefined();
    
    const booking = createBookingResponse.body.booking;
    expect(booking.userId).toBe(consumerUid);
    expect(booking.yachtId).toBe(testYachtId);
    expect(booking.status).toBe(BookingStatus.PENDING);
    expect(booking.guestCount).toBe(5);
    expect(booking.specialRequests).toBe('Special welcome package');
    
    // Verify booking creation in Firestore
    const bookingDoc = await db.collection('bookings').doc(booking.id).get();
    expect(bookingDoc.exists).toBe(true);
    
    // Check conflict detection after booking is created
    const checkAvailabilityResponse = await app.executeRequest('post', '/api/bookings/check-availability', {
      yachtId: testYachtId,
      startDate: tomorrow.toISOString(),
      endDate: dayAfter.toISOString()
    });
    
    expect(checkAvailabilityResponse.status).toBe(200);
    expect(checkAvailabilityResponse.body.success).toBe(true);
    expect(checkAvailabilityResponse.body.available).toBe(false);
    expect(checkAvailabilityResponse.body.conflicts.length).toBeGreaterThan(0);
  });
  
  it('should retrieve booking details', async () => {
    // First create a booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);
    
    const createBookingResponse = await app.executeRequest('post', '/api/bookings', {
      yachtId: testYachtId,
      startDate: tomorrow.toISOString(),
      endDate: dayAfter.toISOString(),
      guestCount: 3
    }, {
      Authorization: `Bearer token-for-${consumerUid}`
    });
    
    const bookingId = createBookingResponse.body.booking.id;
    
    // Get booking details
    const getBookingResponse = await app.executeRequest('get', `/api/bookings/${bookingId}`, {}, {
      Authorization: `Bearer token-for-${consumerUid}`
    });
    
    // Verify
    expect(getBookingResponse.status).toBe(200);
    expect(getBookingResponse.body.success).toBe(true);
    expect(getBookingResponse.body.booking).toBeDefined();
    expect(getBookingResponse.body.booking.id).toBe(bookingId);
    expect(getBookingResponse.body.booking.userId).toBe(consumerUid);
    expect(getBookingResponse.body.booking.yachtId).toBe(testYachtId);
  });
  
  it('should cancel a booking', async () => {
    // First create a booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 3);
    
    const createBookingResponse = await app.executeRequest('post', '/api/bookings', {
      yachtId: testYachtId,
      startDate: tomorrow.toISOString(),
      endDate: dayAfter.toISOString(),
      guestCount: 2
    }, {
      Authorization: `Bearer token-for-${consumerUid}`
    });
    
    const bookingId = createBookingResponse.body.booking.id;
    
    // Cancel the booking
    const cancelBookingResponse = await app.executeRequest('post', `/api/bookings/${bookingId}/cancel`, {}, {
      Authorization: `Bearer token-for-${consumerUid}`
    });
    
    // Verify
    expect(cancelBookingResponse.status).toBe(200);
    expect(cancelBookingResponse.body.success).toBe(true);
    expect(cancelBookingResponse.body.booking).toBeDefined();
    expect(cancelBookingResponse.body.booking.status).toBe(BookingStatus.CANCELLED);
    
    // Verify in Firestore
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    expect(bookingDoc.exists).toBe(true);
    expect(bookingDoc.data()?.status).toBe(BookingStatus.CANCELLED);
    
    // Check that cancelling makes the dates available again
    const checkAvailabilityResponse = await app.executeRequest('post', '/api/bookings/check-availability', {
      yachtId: testYachtId,
      startDate: tomorrow.toISOString(),
      endDate: dayAfter.toISOString()
    });
    
    expect(checkAvailabilityResponse.body.available).toBe(true);
  });
});