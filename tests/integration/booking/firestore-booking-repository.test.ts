/**
 * Firestore Booking Repository Integration Tests
 * 
 * These tests verify that the FirestoreBookingRepository correctly
 * interacts with the Firestore emulator.
 */

import { initializeTestEnvironment, EmulatorInstance, EMULATOR_PORTS } from '../../emulator-setup';
import { FirestoreBookingRepository } from '../../../adapters/repositories/firestore/firestore-booking-repository';
import { Booking } from '../../../core/domain/booking/booking';
import { BookingStatus } from '../../../core/domain/booking/booking-status';
import { PaymentStatus } from '../../../core/domain/payment/payment-status';

describe('FirestoreBookingRepository', () => {
  let testEnv: EmulatorInstance;
  let repository: FirestoreBookingRepository;
  
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
    
    repository = new FirestoreBookingRepository(testEnv.firestore!);
  });
  
  afterAll(async () => {
    await testEnv.firestore?.terminate();
  });
  
  beforeEach(async () => {
    // Clear data between tests
    const collections = ['bookings'];
    
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
  
  describe('create method', () => {
    it('should create a new booking', async () => {
      // Arrange
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 5000,
        createdAt: now
      });
      
      // Act
      const result = await repository.create(booking);
      
      // Assert
      expect(result).toBeTruthy();
      expect(result.id).toBe('booking-123');
      expect(result.userId).toBe('user-456');
      expect(result.yachtId).toBe('yacht-789');
      expect(result.status).toBe(BookingStatus.PENDING);
      expect(result.totalAmount).toBe(5000);
      
      // Verify the document was saved
      const doc = await testEnv.firestore?.collection('bookings').doc(booking.id).get();
      expect(doc?.exists).toBe(true);
      expect(doc?.data()?.userId).toBe('user-456');
      expect(doc?.data()?.yachtId).toBe('yacht-789');
    });
  });
  
  describe('update method', () => {
    it('should update an existing booking', async () => {
      // Arrange
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 5000,
        createdAt: now
      });
      
      await repository.create(booking);
      
      const updatedBooking = booking.update({
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        paymentId: 'pi_123456789'
      });
      
      // Act
      const result = await repository.update(updatedBooking);
      
      // Assert
      expect(result).toBeTruthy();
      expect(result.id).toBe('booking-123');
      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
      expect(result.paymentId).toBe('pi_123456789');
      
      // Verify the document was updated
      const doc = await testEnv.firestore?.collection('bookings').doc(booking.id).get();
      expect(doc?.exists).toBe(true);
      expect(doc?.data()?.status).toBe(BookingStatus.CONFIRMED);
      expect(doc?.data()?.paymentStatus).toBe(PaymentStatus.PAID);
    });
    
    it('should return null when trying to update a non-existent booking', async () => {
      // Arrange
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const nonExistentBooking = new Booking({
        id: 'booking-nonexistent',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.CONFIRMED,
        createdAt: now
      });
      
      // Act
      const result = await repository.update(nonExistentBooking);
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('getById method', () => {
    it('should return booking by id', async () => {
      // Arrange
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 5000,
        createdAt: now
      });
      
      await repository.create(booking);
      
      // Act
      const result = await repository.getById('booking-123');
      
      // Assert
      expect(result).toBeTruthy();
      expect(result?.id).toBe('booking-123');
      expect(result?.userId).toBe('user-456');
      expect(result?.yachtId).toBe('yacht-789');
      expect(result?.status).toBe(BookingStatus.PENDING);
    });
    
    it('should return null for non-existent id', async () => {
      // Act
      const result = await repository.getById('booking-nonexistent');
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('delete method', () => {
    it('should delete booking by id', async () => {
      // Arrange
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 5000,
        createdAt: now
      });
      
      await repository.create(booking);
      
      // Act
      const result = await repository.delete('booking-123');
      
      // Assert
      expect(result).toBe(true);
      
      // Verify the document was deleted
      const doc = await testEnv.firestore?.collection('bookings').doc('booking-123').get();
      expect(doc?.exists).toBe(false);
    });
    
    it('should return false when trying to delete a non-existent booking', async () => {
      // Act
      const result = await repository.delete('booking-nonexistent');
      
      // Assert
      expect(result).toBe(false);
    });
  });
  
  describe('getByUser method', () => {
    it('should return bookings for a user', async () => {
      // Arrange
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking1 = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 5000,
        createdAt: now
      });
      
      const booking2 = new Booking({
        id: 'booking-456',
        userId: 'user-456',
        yachtId: 'yacht-123',
        startDate: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
        endDate: new Date(endDate.getTime() + 24 * 60 * 60 * 1000),
        status: BookingStatus.CONFIRMED,
        totalAmount: 7000,
        createdAt: new Date(now.getTime() + 1000) // Created slightly later
      });
      
      const booking3 = new Booking({
        id: 'booking-789',
        userId: 'user-789', // Different user
        yachtId: 'yacht-123',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 3000,
        createdAt: now
      });
      
      await repository.create(booking1);
      await repository.create(booking2);
      await repository.create(booking3);
      
      // Act
      const results = await repository.getByUser('user-456');
      
      // Assert
      expect(results).toBeTruthy();
      expect(results.length).toBe(2);
      
      // Results should be sorted by creation time (newest first)
      expect(results[0].id).toBe('booking-456');
      expect(results[1].id).toBe('booking-123');
    });
    
    it('should return empty array for user with no bookings', async () => {
      // Act
      const results = await repository.getByUser('user-nonexistent');
      
      // Assert
      expect(results).toEqual([]);
    });
  });
  
  describe('getByYacht method', () => {
    it('should return bookings for a yacht', async () => {
      // Arrange
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking1 = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 5000,
        createdAt: now
      });
      
      const booking2 = new Booking({
        id: 'booking-456',
        userId: 'user-123',
        yachtId: 'yacht-789',
        startDate: new Date(startDate.getTime() + 72 * 60 * 60 * 1000),
        endDate: new Date(endDate.getTime() + 72 * 60 * 60 * 1000),
        status: BookingStatus.CONFIRMED,
        totalAmount: 7000,
        createdAt: new Date(now.getTime() + 1000) // Created slightly later
      });
      
      const booking3 = new Booking({
        id: 'booking-789',
        userId: 'user-789',
        yachtId: 'yacht-123', // Different yacht
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 3000,
        createdAt: now
      });
      
      await repository.create(booking1);
      await repository.create(booking2);
      await repository.create(booking3);
      
      // Act
      const results = await repository.getByYacht('yacht-789');
      
      // Assert
      expect(results).toBeTruthy();
      expect(results.length).toBe(2);
      
      // Results should be sorted by creation time (newest first)
      expect(results[0].id).toBe('booking-456');
      expect(results[1].id).toBe('booking-123');
    });
    
    it('should return empty array for yacht with no bookings', async () => {
      // Act
      const results = await repository.getByYacht('yacht-nonexistent');
      
      // Assert
      expect(results).toEqual([]);
    });
  });
  
  describe('getByStatus method', () => {
    it('should return bookings by status', async () => {
      // Arrange
      const now = new Date();
      const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      
      const booking1 = new Booking({
        id: 'booking-123',
        userId: 'user-456',
        yachtId: 'yacht-789',
        startDate,
        endDate,
        status: BookingStatus.PENDING,
        totalAmount: 5000,
        createdAt: now
      });
      
      const booking2 = new Booking({
        id: 'booking-456',
        userId: 'user-123',
        yachtId: 'yacht-789',
        startDate: new Date(startDate.getTime() + 72 * 60 * 60 * 1000),
        endDate: new Date(endDate.getTime() + 72 * 60 * 60 * 1000),
        status: BookingStatus.CONFIRMED,
        totalAmount: 7000,
        createdAt: new Date(now.getTime() + 1000)
      });
      
      const booking3 = new Booking({
        id: 'booking-789',
        userId: 'user-789',
        yachtId: 'yacht-123',
        startDate,
        endDate,
        status: BookingStatus.PENDING, // Same status as booking1
        totalAmount: 3000,
        createdAt: new Date(now.getTime() + 2000) // Created latest
      });
      
      await repository.create(booking1);
      await repository.create(booking2);
      await repository.create(booking3);
      
      // Act
      const results = await repository.getByStatus(BookingStatus.PENDING);
      
      // Assert
      expect(results).toBeTruthy();
      expect(results.length).toBe(2);
      
      // Results should be sorted by creation time (newest first)
      expect(results[0].id).toBe('booking-789');
      expect(results[1].id).toBe('booking-123');
    });
    
    it('should return empty array for status with no bookings', async () => {
      // Act
      const results = await repository.getByStatus(BookingStatus.CANCELLED);
      
      // Assert
      expect(results).toEqual([]);
    });
  });
});