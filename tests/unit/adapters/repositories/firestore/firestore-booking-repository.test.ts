/**
 * Unit tests for FirestoreBookingRepository
 * 
 * These tests use mocks to simulate Firestore behavior
 */

import { 
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  updateDoc, 
  setDoc, 
  deleteDoc,
  Timestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { jest } from '@jest/globals';

import { FirestoreBookingRepository } from '../../../../../adapters/repositories/firestore/firestore-booking-repository';
import { Booking } from '../../../../../core/domain/booking/booking';
import { TimeSlot } from '../../../../../core/domain/booking/time-slot';
import { BookingStatusType } from '../../../../../core/domain/booking/booking-status';
import { PaymentDetails } from '../../../../../core/domain/booking/payment-details';
import { PaymentStatus } from '../../../../../core/domain/booking/payment-status';

// Mock the firebase/firestore module
jest.mock('firebase/firestore');

// Create mock implementations
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>;
const mockLimit = limit as jest.MockedFunction<typeof limit>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>;

describe('FirestoreBookingRepository', () => {
  // Test subject
  let repository: FirestoreBookingRepository;
  
  // Mock Firestore instance
  const mockFirestore = {} as Firestore;
  
  // Test data
  const mockBookingId = 'booking-123';
  const mockBookingDate = new Date('2023-06-15T10:00:00Z');
  const mockConfirmationCode = 'ABC123';
  
  // Mock documents
  const createMockDoc = (id: string, data: any) => {
    return {
      id,
      exists: () => true,
      data: () => data,
      ref: {
        id,
        path: `bookings/${id}`
      }
    } as unknown as DocumentSnapshot;
  };
  
  // Sample booking data
  const sampleBookingData = {
    id: mockBookingId,
    packageId: 'package-123',
    yachtId: 'yacht-123',
    customerId: 'customer-123',
    customerDetails: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+9715555555'
    },
    bookingDate: Timestamp.fromDate(mockBookingDate),
    status: BookingStatusType.PENDING,
    totalAmount: 1000,
    paymentDetails: {
      method: 'credit_card',
      amount: 1000,
      currency: 'AED',
      status: PaymentStatus.PENDING,
      processingDate: Timestamp.fromDate(new Date())
    },
    confirmationCode: mockConfirmationCode,
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
    timeSlot: {
      type: 'morning',
      name: 'Morning Slot',
      startHour: 9,
      startMinute: 0,
      endHour: 12,
      endMinute: 0
    }
  };
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create repository instance
    repository = new FirestoreBookingRepository(mockFirestore);
  });
  
  describe('findById', () => {
    it('should return booking for valid ID', async () => {
      // Arrange
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(createMockDoc(mockBookingId, sampleBookingData));
      
      // Act
      const result = await repository.findById(mockBookingId);
      
      // Assert
      expect(mockDoc).toHaveBeenCalledWith(mockFirestore, 'bookings', mockBookingId);
      expect(mockGetDoc).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Booking);
      expect(result?.id).toBe(mockBookingId);
      expect(result?.packageId).toBe('package-123');
      expect(result?.yachtId).toBe('yacht-123');
      expect(result?.status).toBe(BookingStatusType.PENDING);
    });
    
    it('should return null for non-existent ID', async () => {
      // Arrange
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
        id: 'non-existent'
      } as unknown as DocumentSnapshot);
      
      // Act
      const result = await repository.findById('non-existent');
      
      // Assert
      expect(mockDoc).toHaveBeenCalledWith(mockFirestore, 'bookings', 'non-existent');
      expect(mockGetDoc).toHaveBeenCalled();
      expect(result).toBeNull();
    });
    
    it('should handle errors correctly', async () => {
      // Arrange
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockRejectedValue(new Error('Database error'));
      
      // Act & Assert
      await expect(repository.findById(mockBookingId)).rejects.toThrow('Database error');
    });
  });
  
  describe('findByConfirmationCode', () => {
    it('should return booking for valid confirmation code', async () => {
      // Arrange
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockLimit.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [createMockDoc(mockBookingId, sampleBookingData)]
      } as any);
      
      // Act
      const result = await repository.findByConfirmationCode(mockConfirmationCode);
      
      // Assert
      expect(mockCollection).toHaveBeenCalledWith(mockFirestore, 'bookings');
      expect(mockWhere).toHaveBeenCalledWith('confirmationCode', '==', mockConfirmationCode);
      expect(mockLimit).toHaveBeenCalledWith(1);
      expect(result).toBeInstanceOf(Booking);
      expect(result?.confirmationCode).toBe(mockConfirmationCode);
    });
    
    it('should return null for non-existent confirmation code', async () => {
      // Arrange
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockLimit.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        empty: true,
        docs: []
      } as any);
      
      // Act
      const result = await repository.findByConfirmationCode('INVALID');
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('save', () => {
    it('should update existing booking', async () => {
      // Arrange
      const booking = Booking.fromObject({
        id: mockBookingId,
        packageId: 'package-123',
        yachtId: 'yacht-123',
        customerId: 'customer-123',
        status: BookingStatusType.PENDING,
        bookingDate: mockBookingDate,
        totalAmount: 1000,
        confirmationCode: mockConfirmationCode,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => sampleBookingData,
        id: mockBookingId
      } as unknown as DocumentSnapshot);
      mockUpdateDoc.mockResolvedValue(undefined);
      
      // Act
      const result = await repository.save(booking);
      
      // Assert
      expect(mockDoc).toHaveBeenCalledWith(mockFirestore, 'bookings', mockBookingId);
      expect(mockGetDoc).toHaveBeenCalled();
      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result).toBe(booking);
    });
    
    it('should create new booking if it does not exist', async () => {
      // Arrange
      const booking = Booking.fromObject({
        id: 'new-booking',
        packageId: 'package-123',
        yachtId: 'yacht-123',
        customerId: 'customer-123',
        status: BookingStatusType.PENDING,
        bookingDate: mockBookingDate,
        totalAmount: 1000,
        confirmationCode: 'NEW123',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        id: 'new-booking'
      } as unknown as DocumentSnapshot);
      mockSetDoc.mockResolvedValue(undefined);
      
      // Act
      const result = await repository.save(booking);
      
      // Assert
      expect(mockDoc).toHaveBeenCalledWith(mockFirestore, 'bookings', 'new-booking');
      expect(mockGetDoc).toHaveBeenCalled();
      expect(mockSetDoc).toHaveBeenCalled();
      expect(result).toBe(booking);
    });
  });
  
  describe('delete', () => {
    it('should delete a booking', async () => {
      // Arrange
      mockDoc.mockReturnValue({} as any);
      mockDeleteDoc.mockResolvedValue(undefined);
      
      // Act
      const result = await repository.delete(mockBookingId);
      
      // Assert
      expect(mockDoc).toHaveBeenCalledWith(mockFirestore, 'bookings', mockBookingId);
      expect(mockDeleteDoc).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should handle errors during deletion', async () => {
      // Arrange
      mockDoc.mockReturnValue({} as any);
      mockDeleteDoc.mockRejectedValue(new Error('Delete error'));
      
      // Act & Assert
      await expect(repository.delete(mockBookingId)).rejects.toThrow('Delete error');
    });
  });
  
  describe('findConflictingBookings', () => {
    it('should find conflicting bookings for a package on a date', async () => {
      // Arrange
      const packageId = 'package-123';
      const date = new Date('2023-06-15');
      
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: [
          createMockDoc('booking-1', {
            ...sampleBookingData,
            id: 'booking-1',
            packageId,
            bookingDate: Timestamp.fromDate(date),
            status: BookingStatusType.CONFIRMED
          }),
          createMockDoc('booking-2', {
            ...sampleBookingData,
            id: 'booking-2',
            packageId,
            bookingDate: Timestamp.fromDate(date),
            status: BookingStatusType.PENDING
          })
        ]
      } as any);
      
      // Act
      const result = await repository.findConflictingBookings(packageId, date);
      
      // Assert
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('booking-1');
      expect(result[1].id).toBe('booking-2');
    });
    
    it('should exclude specified booking ID from conflicts', async () => {
      // Arrange
      const packageId = 'package-123';
      const date = new Date('2023-06-15');
      const excludeId = 'booking-1';
      
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: [
          createMockDoc('booking-1', {
            ...sampleBookingData,
            id: 'booking-1',
            packageId,
            bookingDate: Timestamp.fromDate(date),
            status: BookingStatusType.CONFIRMED
          }),
          createMockDoc('booking-2', {
            ...sampleBookingData,
            id: 'booking-2',
            packageId,
            bookingDate: Timestamp.fromDate(date),
            status: BookingStatusType.PENDING
          })
        ]
      } as any);
      
      // Act
      const result = await repository.findConflictingBookings(packageId, date, undefined, excludeId);
      
      // Assert
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('booking-2');
    });
    
    it('should filter conflicts by time slot', async () => {
      // Arrange
      const packageId = 'package-123';
      const date = new Date('2023-06-15');
      const timeSlot = new TimeSlot('afternoon', 'Afternoon', 13, 0, 17, 0);
      
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: [
          createMockDoc('booking-1', {
            ...sampleBookingData,
            id: 'booking-1',
            packageId,
            bookingDate: Timestamp.fromDate(date),
            status: BookingStatusType.CONFIRMED,
            timeSlot: {
              type: 'morning',
              name: 'Morning',
              startHour: 9,
              startMinute: 0,
              endHour: 12,
              endMinute: 0
            }
          }),
          createMockDoc('booking-2', {
            ...sampleBookingData,
            id: 'booking-2',
            packageId,
            bookingDate: Timestamp.fromDate(date),
            status: BookingStatusType.PENDING,
            timeSlot: {
              type: 'afternoon',
              name: 'Afternoon',
              startHour: 13,
              startMinute: 0,
              endHour: 17,
              endMinute: 0
            }
          })
        ]
      } as any);
      
      // Act
      const result = await repository.findConflictingBookings(packageId, date, timeSlot);
      
      // Assert
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('booking-2');
    });
  });
  
  describe('search', () => {
    it('should search bookings with criteria', async () => {
      // Arrange
      const criteria = {
        customerId: 'customer-123',
        startDate: new Date('2023-06-01'),
        endDate: new Date('2023-06-30'),
        status: [BookingStatusType.CONFIRMED],
        limit: 10,
        offset: 0
      };
      
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockOrderBy.mockReturnValue({} as any);
      mockLimit.mockReturnValue({} as any);
      
      // For total count query
      mockGetDocs.mockResolvedValueOnce({
        size: 15,
        docs: []
      } as any);
      
      // For paginated data query
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          createMockDoc('booking-1', {
            ...sampleBookingData,
            id: 'booking-1',
            customerId: 'customer-123',
            status: BookingStatusType.CONFIRMED
          }),
          createMockDoc('booking-2', {
            ...sampleBookingData,
            id: 'booking-2',
            customerId: 'customer-123',
            status: BookingStatusType.CONFIRMED
          })
        ]
      } as any);
      
      // Act
      const result = await repository.search(criteria);
      
      // Assert
      expect(result.total).toBe(15);
      expect(result.bookings.length).toBe(2);
      expect(result.bookings[0].id).toBe('booking-1');
      expect(result.bookings[1].id).toBe('booking-2');
    });
  });
});