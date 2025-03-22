/**
 * Migration Controller
 * 
 * This module provides Express route handlers for migration operations.
 */

import { Request, Response } from 'express';
import { Firestore } from 'firebase/firestore';

import { migrateBookings } from '../../migration/booking-migration';

/**
 * Migration Controller
 */
export class MigrationController {
  constructor(private readonly firestore: Firestore) {}
  
  /**
   * Migrate bookings from legacy format to new format
   */
  migrateBookings = async (req: Request, res: Response) => {
    try {
      // Only admins should be able to run migrations
      if (!req.user || !req.user.role || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can run migrations' });
      }
      
      // Run migration
      const result = await migrateBookings(this.firestore);
      
      // Return results
      return res.status(200).json({
        status: 'success',
        message: 'Booking migration completed',
        ...result
      });
    } catch (error) {
      console.error('Error migrating bookings:', error);
      return res.status(500).json({ error: 'Failed to run booking migration' });
    }
  };
}