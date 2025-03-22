/**
 * Firestore Payment Repository Integration Tests
 * 
 * These tests verify that the FirestorePaymentRepository correctly
 * interacts with the Firestore emulator.
 */

import { initializeTestEnvironment, EmulatorInstance, EMULATOR_PORTS } from '../../emulator-setup';
import { FirestorePaymentRepository } from '../../../adapters/repositories/firestore/firestore-payment-repository';
import { PaymentDetails } from '../../../core/domain/payment/payment-details';
import { PaymentStatus } from '../../../core/domain/payment/payment-status';

describe('FirestorePaymentRepository', () => {
  let testEnv: EmulatorInstance;
  let repository: FirestorePaymentRepository;
  
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
    
    repository = new FirestorePaymentRepository(testEnv.firestore!);
  });
  
  afterAll(async () => {
    await testEnv.firestore?.terminate();
  });
  
  beforeEach(async () => {
    // Clear data between tests
    const collections = ['payments'];
    
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
  
  describe('save method', () => {
    it('should save a new payment details', async () => {
      // Arrange
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 5000,
        currency: 'USD'
      });
      
      // Act
      const result = await repository.save(paymentDetails);
      
      // Assert
      expect(result).toBeTruthy();
      expect(result.bookingId).toBe('booking-123');
      expect(result.paymentIntentId).toBe('pi_123456789');
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.amount).toBe(5000);
      expect(result.currency).toBe('USD');
      
      // Verify the document was saved
      const doc = await testEnv.firestore?.collection('payments').doc(paymentDetails.paymentIntentId).get();
      expect(doc?.exists).toBe(true);
      expect(doc?.data()?.bookingId).toBe('booking-123');
    });
  });
  
  describe('update method', () => {
    it('should update an existing payment details', async () => {
      // Arrange
      const initialPayment = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 5000,
        currency: 'USD'
      });
      
      await repository.save(initialPayment);
      
      const updatedPayment = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PAID,
        amount: 5000,
        currency: 'USD',
        processingDate: new Date()
      });
      
      // Act
      const result = await repository.update(updatedPayment);
      
      // Assert
      expect(result).toBeTruthy();
      expect(result.status).toBe(PaymentStatus.PAID);
      expect(result.processingDate).toBeDefined();
      
      // Verify the document was updated
      const doc = await testEnv.firestore?.collection('payments').doc(updatedPayment.paymentIntentId).get();
      expect(doc?.exists).toBe(true);
      expect(doc?.data()?.status).toBe(PaymentStatus.PAID);
    });
    
    it('should return null when trying to update a non-existent payment', async () => {
      // Arrange
      const nonExistentPayment = new PaymentDetails({
        bookingId: 'booking-nonexistent',
        paymentIntentId: 'pi_nonexistent',
        status: PaymentStatus.PAID,
        amount: 5000,
        currency: 'USD'
      });
      
      // Act
      const result = await repository.update(nonExistentPayment);
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('getByPaymentIntentId method', () => {
    it('should return payment details by paymentIntentId', async () => {
      // Arrange
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 5000,
        currency: 'USD'
      });
      
      await repository.save(paymentDetails);
      
      // Act
      const result = await repository.getByPaymentIntentId('pi_123456789');
      
      // Assert
      expect(result).toBeTruthy();
      expect(result?.bookingId).toBe('booking-123');
      expect(result?.paymentIntentId).toBe('pi_123456789');
      expect(result?.status).toBe(PaymentStatus.PENDING);
    });
    
    it('should return null for non-existent paymentIntentId', async () => {
      // Act
      const result = await repository.getByPaymentIntentId('pi_nonexistent');
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('getByBookingId method', () => {
    it('should return payment details by bookingId', async () => {
      // Arrange
      const paymentDetails1 = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 5000,
        currency: 'USD'
      });
      
      const paymentDetails2 = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_987654321',
        status: PaymentStatus.PAID,
        amount: 5000,
        currency: 'USD'
      });
      
      await repository.save(paymentDetails1);
      await repository.save(paymentDetails2);
      
      // Act
      const results = await repository.getByBookingId('booking-123');
      
      // Assert
      expect(results).toBeTruthy();
      expect(results.length).toBe(2);
      
      // Results should be sorted by creation time (newest first)
      expect(results[0].paymentIntentId).toBe('pi_987654321');
      expect(results[1].paymentIntentId).toBe('pi_123456789');
    });
    
    it('should return empty array for non-existent bookingId', async () => {
      // Act
      const results = await repository.getByBookingId('booking-nonexistent');
      
      // Assert
      expect(results).toEqual([]);
    });
  });
  
  describe('delete method', () => {
    it('should delete payment details by paymentIntentId', async () => {
      // Arrange
      const paymentDetails = new PaymentDetails({
        bookingId: 'booking-123',
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.PENDING,
        amount: 5000,
        currency: 'USD'
      });
      
      await repository.save(paymentDetails);
      
      // Act
      const result = await repository.delete('pi_123456789');
      
      // Assert
      expect(result).toBe(true);
      
      // Verify the document was deleted
      const doc = await testEnv.firestore?.collection('payments').doc('pi_123456789').get();
      expect(doc?.exists).toBe(false);
    });
    
    it('should return false when trying to delete a non-existent payment', async () => {
      // Act
      const result = await repository.delete('pi_nonexistent');
      
      // Assert
      expect(result).toBe(false);
    });
  });
});