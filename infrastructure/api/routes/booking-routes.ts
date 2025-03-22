/**
 * Booking Routes
 * 
 * This module defines the Express routes for booking-related operations.
 */

import { Router } from 'express';
import { Firestore } from 'firebase/firestore';

import { BookingController } from '../controllers/booking-controller';
import { verifyAuth } from '../../../server/firebase-admin';

/**
 * Create booking routes
 */
export function createBookingRoutes(firestore: Firestore): Router {
  const router = Router();
  const bookingController = new BookingController(firestore);
  
  /**
   * Get a booking by ID
   * Route: GET /api/bookings/:id
   */
  router.get('/:id', verifyAuth, bookingController.getBookingById);
  
  /**
   * Get a booking by confirmation code
   * Route: GET /api/bookings/confirmation/:code
   */
  router.get('/confirmation/:code', bookingController.getBookingByConfirmationCode);
  
  /**
   * Create a new booking
   * Route: POST /api/bookings
   */
  router.post('/', verifyAuth, bookingController.createBooking);
  
  /**
   * Confirm a booking
   * Route: POST /api/bookings/:id/confirm
   */
  router.post('/:id/confirm', verifyAuth, bookingController.confirmBooking);
  
  /**
   * Cancel a booking
   * Route: POST /api/bookings/:id/cancel
   */
  router.post('/:id/cancel', verifyAuth, bookingController.cancelBooking);
  
  /**
   * Search bookings
   * Route: GET /api/bookings
   */
  router.get('/', verifyAuth, bookingController.searchBookings);
  
  /**
   * Check availability
   * Route: POST /api/bookings/check-availability
   */
  router.post('/check-availability', bookingController.checkAvailability);
  
  return router;
}