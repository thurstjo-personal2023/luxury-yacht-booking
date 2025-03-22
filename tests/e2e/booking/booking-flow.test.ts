/**
 * End-to-End Booking Flow Test
 * 
 * This test verifies the complete booking flow from creating a booking,
 * checking availability, confirming, and cancelling bookings.
 */

import express, { Express, Request, Response } from 'express';
import request from 'supertest';
import { Server } from 'http';
import bodyParser from 'body-parser';
import { initializeTestEnvironment, EmulatorInstance, EMULATOR_PORTS } from '../../emulator-setup';
import { FirestoreBookingRepository } from '../../../adapters/repositories/firestore/firestore-booking-repository';
import { FirestoreYachtRepository } from '../../../adapters/repositories/firestore/firestore-yacht-repository';
import { CreateBookingUseCase } from '../../../core/application/use-cases/booking/create-booking-use-case';
import { GetBookingUseCase } from '../../../core/application/use-cases/booking/get-booking-use-case';
import { CancelBookingUseCase } from '../../../core/application/use-cases/booking/cancel-booking-use-case';
import { CheckAvailabilityUseCase } from '../../../core/application/use-cases/booking/check-availability-use-case';
import { SearchBookingsUseCase } from '../../../core/application/use-cases/booking/search-bookings-use-case';
import { BookingStatus } from '../../../core/domain/booking/booking-status';
import { YachtInfo } from '../../../core/domain/yacht/yacht-info';

describe('Booking Flow E2E', () => {
  let testEnv: EmulatorInstance;
  let app: Express;
  let server: Server;
  let bookingRepository: FirestoreBookingRepository;
  let yachtRepository: FirestoreYachtRepository;
  let createBookingUseCase: CreateBookingUseCase;
  let getBookingUseCase: GetBookingUseCase;
  let cancelBookingUseCase: CancelBookingUseCase;
  let checkAvailabilityUseCase: CheckAvailabilityUseCase;
  let searchBookingsUseCase: SearchBookingsUseCase;
  
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
    yachtRepository = new FirestoreYachtRepository(testEnv.firestore!);
    
    // Create mock yacht data
    await testEnv.firestore?.collection('yachts').doc('yacht-123').set(mockYacht);
    
    // Initialize use cases
    createBookingUseCase = new CreateBookingUseCase(bookingRepository, yachtRepository);
    getBookingUseCase = new GetBookingUseCase(bookingRepository, yachtRepository);
    cancelBookingUseCase = new CancelBookingUseCase(bookingRepository);
    checkAvailabilityUseCase = new CheckAvailabilityUseCase(bookingRepository, yachtRepository);
    searchBookingsUseCase = new SearchBookingsUseCase(bookingRepository);
    
    // Set up Express server with API routes
    app = express();
    app.use(bodyParser.json());
    
    // Create booking route
    app.post('/api/bookings', async (req: Request, res: Response) => {
      const { userId, yachtId, startDate, endDate, guestCount, specialRequests } = req.body;
      
      try {
        const result = await createBookingUseCase.execute({
          userId,
          yachtId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          guestCount,
          specialRequests
        });
        
        if (result.success) {
          res.status(201).json(result);
        } else {
          res.status(400).json({ error: result.error });
        }
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Get booking route
    app.get('/api/bookings/:id', async (req: Request, res: Response) => {
      const { id } = req.params;
      const { userId } = req.query;
      
      try {
        const result = await getBookingUseCase.execute({
          bookingId: id,
          userId: userId as string
        });
        
        if (result.success) {
          res.status(200).json(result);
        } else {
          res.status(404).json({ error: result.error });
        }
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Cancel booking route
    app.post('/api/bookings/:id/cancel', async (req: Request, res: Response) => {
      const { id } = req.params;
      const { userId } = req.body;
      
      try {
        const result = await cancelBookingUseCase.execute({
          bookingId: id,
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
    
    // Check availability route
    app.post('/api/bookings/check-availability', async (req: Request, res: Response) => {
      const { yachtId, startDate, endDate } = req.body;
      
      try {
        const result = await checkAvailabilityUseCase.execute({
          yachtId,
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        });
        
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Search bookings route
    app.get('/api/bookings', async (req: Request, res: Response) => {
      const { userId, yachtId, status } = req.query;
      
      try {
        const result = await searchBookingsUseCase.execute({
          userId: userId as string,
          yachtId: yachtId as string,
          status: status as BookingStatus
        });
        
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Start the server
    server = app.listen(3002);
  });
  
  afterAll(async () => {
    // Close server and clean up resources
    if (server) {
      server.close();
    }
    await testEnv.firestore?.terminate();
  });
  
  beforeEach(async () => {
    // Clear booking data between tests
    const snapshot = await testEnv.firestore?.collection('bookings').get();
    const batch = testEnv.firestore?.batch();
    
    if (snapshot) {
      snapshot.docs.forEach((doc) => {
        batch?.delete(doc.ref);
      });
      
      if (snapshot.size > 0) {
        await batch?.commit();
      }
    }
  });
  
  describe('Complete booking flow', () => {
    it('should check availability, create, and cancel a booking', async () => {
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Step 1: Check availability
      const availabilityResponse = await request(app)
        .post('/api/bookings/check-availability')
        .send({
          yachtId: 'yacht-123',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
      
      expect(availabilityResponse.status).toBe(200);
      expect(availabilityResponse.body.isAvailable).toBe(true);
      
      // Step 2: Create a booking
      const createResponse = await request(app)
        .post('/api/bookings')
        .send({
          userId,
          yachtId: 'yacht-123',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          guestCount: 5,
          specialRequests: 'Need a captain'
        });
      
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.booking).toBeDefined();
      
      const { booking } = createResponse.body;
      
      // Step 3: Get the booking
      const getResponse = await request(app)
        .get(`/api/bookings/${booking.id}`)
        .query({ userId });
      
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.booking).toBeDefined();
      expect(getResponse.body.booking.id).toBe(booking.id);
      expect(getResponse.body.booking.userId).toBe(userId);
      expect(getResponse.body.booking.status).toBe(BookingStatus.PENDING);
      
      // Step 4: Search for user's bookings
      const searchResponse = await request(app)
        .get('/api/bookings')
        .query({ userId });
      
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.bookings).toBeDefined();
      expect(searchResponse.body.bookings.length).toBe(1);
      expect(searchResponse.body.bookings[0].id).toBe(booking.id);
      
      // Step 5: Cancel the booking
      const cancelResponse = await request(app)
        .post(`/api/bookings/${booking.id}/cancel`)
        .send({ userId });
      
      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.booking).toBeDefined();
      expect(cancelResponse.body.booking.status).toBe(BookingStatus.CANCELLED);
      
      // Step 6: Verify the cancelled booking
      const getAfterCancelResponse = await request(app)
        .get(`/api/bookings/${booking.id}`)
        .query({ userId });
      
      expect(getAfterCancelResponse.status).toBe(200);
      expect(getAfterCancelResponse.body.booking.status).toBe(BookingStatus.CANCELLED);
    });
    
    it('should detect availability conflicts', async () => {
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Step 1: Create a booking
      const createResponse = await request(app)
        .post('/api/bookings')
        .send({
          userId,
          yachtId: 'yacht-123',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          guestCount: 5
        });
      
      expect(createResponse.status).toBe(201);
      
      // Step 2: Check availability for same period
      const availabilityResponse = await request(app)
        .post('/api/bookings/check-availability')
        .send({
          yachtId: 'yacht-123',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
      
      expect(availabilityResponse.status).toBe(200);
      expect(availabilityResponse.body.isAvailable).toBe(false);
      expect(availabilityResponse.body.conflicts).toBeDefined();
      expect(availabilityResponse.body.conflicts.length).toBe(1);
    });
    
    it('should reject booking creation for unavailable dates', async () => {
      const userId = 'user-456';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Step 1: Create a booking
      await request(app)
        .post('/api/bookings')
        .send({
          userId,
          yachtId: 'yacht-123',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          guestCount: 5
        });
      
      // Step 2: Try to create another booking for the same period
      const secondCreateResponse = await request(app)
        .post('/api/bookings')
        .send({
          userId: 'user-789', // Different user
          yachtId: 'yacht-123',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          guestCount: 3
        });
      
      expect(secondCreateResponse.status).toBe(400);
      expect(secondCreateResponse.body.error).toBeDefined();
      expect(secondCreateResponse.body.error).toContain('not available');
    });
    
    it('should reject unauthorized access to bookings', async () => {
      const userId = 'user-456';
      const wrongUserId = 'user-789';
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      // Step 1: Create a booking
      const createResponse = await request(app)
        .post('/api/bookings')
        .send({
          userId,
          yachtId: 'yacht-123',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          guestCount: 5
        });
      
      expect(createResponse.status).toBe(201);
      const { booking } = createResponse.body;
      
      // Step 2: Try to access the booking with a different user
      const getResponse = await request(app)
        .get(`/api/bookings/${booking.id}`)
        .query({ userId: wrongUserId });
      
      expect(getResponse.status).toBe(404);
      expect(getResponse.body.error).toBeDefined();
      
      // Step 3: Try to cancel the booking with a different user
      const cancelResponse = await request(app)
        .post(`/api/bookings/${booking.id}/cancel`)
        .send({ userId: wrongUserId });
      
      expect(cancelResponse.status).toBe(400);
      expect(cancelResponse.body.error).toBeDefined();
      expect(cancelResponse.body.error).toContain('not authorized');
    });
  });
});