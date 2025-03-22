/**
 * Unit tests for RepositoryFactory
 * 
 * These tests ensure that the factory correctly instantiates repositories
 */

import { jest } from '@jest/globals';
import { Firestore } from 'firebase/firestore';

import { RepositoryFactory } from '../../../../adapters/repositories/repository-factory';
import { FirestoreBookingRepository } from '../../../../adapters/repositories/firestore/firestore-booking-repository';
import { FirestoreYachtRepository } from '../../../../adapters/repositories/firestore/firestore-yacht-repository';
import { IBookingRepository } from '../../../../core/domain/repositories/booking-repository';
import { IYachtRepository } from '../../../../core/domain/repositories/yacht-repository';

describe('RepositoryFactory', () => {
  // Mock Firestore instance
  const mockFirestore = {} as Firestore;
  
  // Test subject
  let factory: RepositoryFactory;
  
  beforeEach(() => {
    // Create factory instance
    factory = new RepositoryFactory(mockFirestore);
  });
  
  describe('createBookingRepository', () => {
    it('should create a FirestoreBookingRepository instance', () => {
      // Act
      const repository = factory.createBookingRepository();
      
      // Assert
      expect(repository).toBeInstanceOf(FirestoreBookingRepository);
    });
    
    it('should return the same instance on subsequent calls', () => {
      // Act
      const repository1 = factory.createBookingRepository();
      const repository2 = factory.createBookingRepository();
      
      // Assert
      expect(repository1).toBe(repository2);
    });
    
    it('should pass the Firestore instance to the repository', () => {
      // Arrange
      const originalFirestoreBookingRepository = FirestoreBookingRepository;
      
      // Mock the constructor
      const mockConstructor = jest.fn();
      (FirestoreBookingRepository as any) = jest.fn().mockImplementation(mockConstructor);
      
      // Act
      factory.createBookingRepository();
      
      // Assert
      expect(FirestoreBookingRepository).toHaveBeenCalledWith(mockFirestore);
      
      // Restore original constructor
      (FirestoreBookingRepository as any) = originalFirestoreBookingRepository;
    });
  });
  
  describe('createYachtRepository', () => {
    it('should create a FirestoreYachtRepository instance', () => {
      // Act
      const repository = factory.createYachtRepository();
      
      // Assert
      expect(repository).toBeInstanceOf(FirestoreYachtRepository);
    });
    
    it('should return the same instance on subsequent calls', () => {
      // Act
      const repository1 = factory.createYachtRepository();
      const repository2 = factory.createYachtRepository();
      
      // Assert
      expect(repository1).toBe(repository2);
    });
    
    it('should pass the Firestore instance to the repository', () => {
      // Arrange
      const originalFirestoreYachtRepository = FirestoreYachtRepository;
      
      // Mock the constructor
      const mockConstructor = jest.fn();
      (FirestoreYachtRepository as any) = jest.fn().mockImplementation(mockConstructor);
      
      // Act
      factory.createYachtRepository();
      
      // Assert
      expect(FirestoreYachtRepository).toHaveBeenCalledWith(mockFirestore);
      
      // Restore original constructor
      (FirestoreYachtRepository as any) = originalFirestoreYachtRepository;
    });
  });
});