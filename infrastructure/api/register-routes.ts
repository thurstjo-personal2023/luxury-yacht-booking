/**
 * Register Routes
 * 
 * This module provides a function to register all API routes with the Express app.
 */

import { Express } from 'express';
import { Firestore } from 'firebase/firestore';

import { createBookingRoutes } from './routes/booking-routes';
import { createMigrationRoutes } from './routes/migration-routes';
import { registerPaymentRoutes } from './routes/payment-routes';

/**
 * Register API routes with the Express app
 */
export function registerApiRoutes(app: Express, firestore: Firestore) {
  // Register booking routes
  app.use('/api/bookings', createBookingRoutes(firestore));
  
  // Register migration routes (admin only)
  app.use('/api/migration', createMigrationRoutes(firestore));
  
  // Register payment routes
  registerPaymentRoutes(app);
  
  // Register other routes as needed
  // app.use('/api/users', createUserRoutes(firestore));
  // app.use('/api/yachts', createYachtRoutes(firestore));
  
  // Return success message for base API route
  app.get('/api', (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Etoile Yachts API',
      version: '1.0.0'
    });
  });
}