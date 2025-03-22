/**
 * Repository Factory
 * 
 * This module provides factory functions to create repository instances.
 */

import { Firestore } from 'firebase/firestore';

import { IBookingRepository } from '../../core/domain/repositories/booking-repository';
import { IYachtRepository } from '../../core/domain/repositories/yacht-repository';
import { FirestoreBookingRepository } from './firestore/firestore-booking-repository';
import { FirestoreYachtRepository } from './firestore/firestore-yacht-repository';

/**
 * Repository Factory Interface
 */
export interface IRepositoryFactory {
  createBookingRepository(): IBookingRepository;
  createYachtRepository(): IYachtRepository;
}

/**
 * Firestore Repository Factory
 */
export class FirestoreRepositoryFactory implements IRepositoryFactory {
  constructor(private readonly firestore: Firestore) {}
  
  /**
   * Create Booking Repository
   */
  createBookingRepository(): IBookingRepository {
    return new FirestoreBookingRepository(this.firestore);
  }
  
  /**
   * Create Yacht Repository
   */
  createYachtRepository(): IYachtRepository {
    return new FirestoreYachtRepository(this.firestore);
  }
}