/**
 * Migration Routes
 * 
 * This module defines the Express routes for migration operations.
 */

import { Router } from 'express';
import { Firestore } from 'firebase/firestore';

import { MigrationController } from '../controllers/migration-controller';
import { verifyAuth } from '../../../server/firebase-admin';
import { verifyAdminRole } from '../../../server/admin-profile-routes';

/**
 * Create migration routes
 */
export function createMigrationRoutes(firestore: Firestore): Router {
  const router = Router();
  const migrationController = new MigrationController(firestore);
  
  /**
   * Migrate bookings from legacy format to new format
   * Route: POST /api/migration/bookings
   */
  router.post('/bookings', verifyAuth, verifyAdminRole, migrationController.migrateBookings);
  
  return router;
}