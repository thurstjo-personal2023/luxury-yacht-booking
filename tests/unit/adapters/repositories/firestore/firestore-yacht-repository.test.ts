/**
 * Unit tests for FirestoreYachtRepository
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
  Timestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { jest } from '@jest/globals';

import { FirestoreYachtRepository } from '../../../../../adapters/repositories/firestore/firestore-yacht-repository';
import { YachtInfo, YachtPackageInfo } from '../../../../../core/domain/repositories/yacht-repository';

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

describe('FirestoreYachtRepository', () => {
  // Test subject
  let repository: FirestoreYachtRepository;
  
  // Mock Firestore instance
  const mockFirestore = {} as Firestore;
  
  // Test data
  const mockYachtId = 'yacht-123';
  const mockPackageId = 'package-123';
  const mockProducerId = 'producer-123';
  
  // Mock documents
  const createMockDoc = (id: string, data: any) => {
    return {
      id,
      exists: () => true,
      data: () => data,
      ref: {
        id,
        path: `yacht_profiles/${id}`
      }
    } as unknown as DocumentSnapshot;
  };
  
  // Sample yacht data
  const sampleYachtData = {
    yacht_id: mockYachtId,
    name: 'Luxury Yacht',
    model: 'Cruiser 500',
    year: 2020,
    length: 50,
    beam: 15,
    max_guests: 12,
    crew_size: 4,
    price: 5000,
    location: {
      latitude: 25.2048,
      longitude: 55.2708,
      address: 'Dubai Marina',
      region: 'dubai',
      port_marina: 'Dubai Marina'
    },
    producerId: mockProducerId,
    availability_status: true,
    features: ['WiFi', 'Bar', 'Jacuzzi'],
    created_date: Timestamp.fromDate(new Date()),
    last_updated_date: Timestamp.fromDate(new Date())
  };
  
  // Sample yacht package data
  const samplePackageData = {
    id: mockPackageId,
    title: 'Dubai Marina Tour',
    description: 'Beautiful tour of Dubai Marina',
    category: 'Day Trip',
    pricing: 3000,
    capacity: 10,
    duration: 4,
    availability_status: true,
    producerId: mockProducerId,
    yachtId: mockYachtId,
    location: {
      latitude: 25.2048,
      longitude: 55.2708,
      address: 'Dubai Marina',
      region: 'dubai',
      port_marina: 'Dubai Marina'
    },
    tags: ['Luxury', 'Family', 'Day Trip'],
    created_date: Timestamp.fromDate(new Date()),
    last_updated_date: Timestamp.fromDate(new Date())
  };
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create repository instance
    repository = new FirestoreYachtRepository(mockFirestore);
  });
  
  describe('findYachtById', () => {
    it('should return yacht info for valid ID', async () => {
      // Arrange
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(createMockDoc(mockYachtId, sampleYachtData));
      
      // Act
      const result = await repository.findYachtById(mockYachtId);
      
      // Assert
      expect(mockDoc).toHaveBeenCalledWith(mockFirestore, 'yacht_profiles', mockYachtId);
      expect(mockGetDoc).toHaveBeenCalled();
      expect(result).toEqual({
        id: mockYachtId,
        name: 'Luxury Yacht',
        capacity: 12,
        pricing: 5000,
        isAvailable: true,
        producerId: mockProducerId,
        locationAddress: 'Dubai Marina',
        region: 'dubai',
        portMarina: 'Dubai Marina'
      });
    });
    
    it('should return null for non-existent yacht', async () => {
      // Arrange
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
        id: 'non-existent'
      } as unknown as DocumentSnapshot);
      
      // Act
      const result = await repository.findYachtById('non-existent');
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('findYachtPackageById', () => {
    it('should return yacht package info for valid ID', async () => {
      // Arrange
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(createMockDoc(mockPackageId, samplePackageData));
      
      // Act
      const result = await repository.findYachtPackageById(mockPackageId);
      
      // Assert
      expect(mockDoc).toHaveBeenCalledWith(mockFirestore, 'unified_yacht_experiences', mockPackageId);
      expect(mockGetDoc).toHaveBeenCalled();
      expect(result).toEqual({
        id: mockPackageId,
        title: 'Dubai Marina Tour',
        description: 'Beautiful tour of Dubai Marina',
        pricing: 3000,
        capacity: 10,
        duration: 4,
        isAvailable: true,
        producerId: mockProducerId,
        yachtId: mockYachtId,
        locationAddress: 'Dubai Marina',
        region: 'dubai',
        portMarina: 'Dubai Marina',
        tags: ['Luxury', 'Family', 'Day Trip']
      });
    });
    
    it('should return null for non-existent package', async () => {
      // Arrange
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
        id: 'non-existent'
      } as unknown as DocumentSnapshot);
      
      // Act
      const result = await repository.findYachtPackageById('non-existent');
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('findYachtsByProducerId', () => {
    it('should return yachts for a producer', async () => {
      // Arrange
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: [
          createMockDoc('yacht-1', {
            ...sampleYachtData,
            yacht_id: 'yacht-1',
            name: 'Yacht 1'
          }),
          createMockDoc('yacht-2', {
            ...sampleYachtData,
            yacht_id: 'yacht-2',
            name: 'Yacht 2'
          })
        ]
      } as any);
      
      // Act
      const result = await repository.findYachtsByProducerId(mockProducerId);
      
      // Assert
      expect(mockCollection).toHaveBeenCalledWith(mockFirestore, 'yacht_profiles');
      expect(mockWhere).toHaveBeenCalledWith('producerId', '==', mockProducerId);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('yacht-1');
      expect(result[1].id).toBe('yacht-2');
    });
    
    it('should return empty array if producer has no yachts', async () => {
      // Arrange
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: []
      } as any);
      
      // Act
      const result = await repository.findYachtsByProducerId('producer-without-yachts');
      
      // Assert
      expect(result).toEqual([]);
    });
  });
  
  describe('searchYachts', () => {
    it('should search yachts with criteria', async () => {
      // Arrange
      const criteria = {
        region: 'dubai',
        portMarina: 'Dubai Marina',
        availableOnly: true,
        minCapacity: 10,
        maxCapacity: 15,
        minPrice: 3000,
        maxPrice: 8000,
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
        size: 3,
        docs: []
      } as any);
      
      // For paginated data query
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          createMockDoc('yacht-1', {
            ...sampleYachtData,
            yacht_id: 'yacht-1',
            name: 'Yacht 1',
            max_guests: 12,
            price: 5000
          }),
          createMockDoc('yacht-2', {
            ...sampleYachtData,
            yacht_id: 'yacht-2',
            name: 'Yacht 2',
            max_guests: 10,
            price: 4000
          })
        ]
      } as any);
      
      // Act
      const result = await repository.searchYachts(criteria);
      
      // Assert
      expect(result.total).toBe(3);
      expect(result.yachts.length).toBe(2);
      expect(result.yachts[0].id).toBe('yacht-1');
      expect(result.yachts[1].id).toBe('yacht-2');
    });
    
    it('should filter results by capacity and price in memory', async () => {
      // Arrange
      const criteria = {
        region: 'dubai',
        minCapacity: 10,
        maxPrice: 6000,
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
        size: 3,
        docs: []
      } as any);
      
      // For paginated data query
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          createMockDoc('yacht-1', {
            ...sampleYachtData,
            yacht_id: 'yacht-1',
            name: 'Yacht 1',
            max_guests: 12,
            price: 5000
          }),
          createMockDoc('yacht-2', {
            ...sampleYachtData,
            yacht_id: 'yacht-2',
            name: 'Yacht 2',
            max_guests: 8,  // Below min capacity
            price: 4000
          }),
          createMockDoc('yacht-3', {
            ...sampleYachtData,
            yacht_id: 'yacht-3',
            name: 'Yacht 3',
            max_guests: 15,
            price: 7000  // Above max price
          })
        ]
      } as any);
      
      // Act
      const result = await repository.searchYachts(criteria);
      
      // Assert
      expect(result.total).toBe(3);
      expect(result.yachts.length).toBe(1);
      expect(result.yachts[0].id).toBe('yacht-1');
    });
  });
  
  describe('checkYachtAvailability', () => {
    it('should return true if yacht is available and no conflicting bookings', async () => {
      // Arrange
      // First, get the yacht
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(createMockDoc(mockYachtId, {
        ...sampleYachtData,
        availability_status: true
      }));
      
      // Then, check for bookings
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: []
      } as any);
      
      // Act
      const result = await repository.checkYachtAvailability(mockYachtId, new Date());
      
      // Assert
      expect(mockGetDoc).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith(mockFirestore, 'bookings');
      expect(result).toBe(true);
    });
    
    it('should return false if yacht is not available', async () => {
      // Arrange
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(createMockDoc(mockYachtId, {
        ...sampleYachtData,
        availability_status: false
      }));
      
      // Act
      const result = await repository.checkYachtAvailability(mockYachtId, new Date());
      
      // Assert
      expect(result).toBe(false);
      // Should not check for bookings if yacht is not available
      expect(mockCollection).not.toHaveBeenCalledWith(mockFirestore, 'bookings');
    });
    
    it('should return false if conflicting bookings exist', async () => {
      // Arrange
      // First, get the yacht
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(createMockDoc(mockYachtId, {
        ...sampleYachtData,
        availability_status: true
      }));
      
      // Then, check for bookings
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'booking-1',
            data: () => ({
              yachtId: mockYachtId,
              status: 'confirmed'
            })
          }
        ]
      } as any);
      
      // Act
      const result = await repository.checkYachtAvailability(mockYachtId, new Date());
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should exclude specified booking IDs from conflicts', async () => {
      // Arrange
      const excludeBookingIds = ['booking-1'];
      
      // First, get the yacht
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue(createMockDoc(mockYachtId, {
        ...sampleYachtData,
        availability_status: true
      }));
      
      // Then, check for bookings
      mockCollection.mockReturnValue({} as any);
      mockQuery.mockReturnValue({} as any);
      mockWhere.mockReturnValue({} as any);
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'booking-1',
            data: () => ({
              yachtId: mockYachtId,
              status: 'confirmed'
            })
          }
        ]
      } as any);
      
      // Act
      const result = await repository.checkYachtAvailability(mockYachtId, new Date(), excludeBookingIds);
      
      // Assert
      expect(result).toBe(true);
    });
  });
});