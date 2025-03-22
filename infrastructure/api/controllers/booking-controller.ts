/**
 * Booking Controller
 * 
 * This module provides Express route handlers for booking-related operations.
 */

import { Request, Response } from 'express';
import { Firestore } from 'firebase/firestore';

import { FirestoreRepositoryFactory } from '../../../adapters/repositories/repository-factory';
import { CreateBookingUseCase } from '../../../core/application/use-cases/booking/create-booking-use-case';
import { GetBookingUseCase } from '../../../core/application/use-cases/booking/get-booking-use-case';
import { ConfirmBookingUseCase } from '../../../core/application/use-cases/booking/confirm-booking-use-case';
import { CancelBookingUseCase } from '../../../core/application/use-cases/booking/cancel-booking-use-case';
import { SearchBookingsUseCase } from '../../../core/application/use-cases/booking/search-bookings-use-case';
import { CheckAvailabilityUseCase } from '../../../core/application/use-cases/booking/check-availability-use-case';
import { BookingService } from '../../../core/domain/services/booking-service';
import { PricingService } from '../../../core/domain/services/pricing-service';
import { AvailabilityService } from '../../../core/domain/services/availability-service';

/**
 * Booking Controller
 */
export class BookingController {
  constructor(private readonly firestore: Firestore) {}
  
  /**
   * Get a booking by ID
   */
  getBookingById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Booking ID is required' });
      }
      
      // Set up repositories
      const repositoryFactory = new FirestoreRepositoryFactory(this.firestore);
      const bookingRepository = repositoryFactory.createBookingRepository();
      
      // Set up use case
      const getBookingUseCase = new GetBookingUseCase(bookingRepository);
      
      // Execute use case
      const booking = await getBookingUseCase.execute(id);
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      return res.status(200).json(booking.toJSON());
    } catch (error) {
      console.error('Error getting booking:', error);
      return res.status(500).json({ error: 'Failed to get booking' });
    }
  };
  
  /**
   * Get a booking by confirmation code
   */
  getBookingByConfirmationCode = async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({ error: 'Confirmation code is required' });
      }
      
      // Set up repositories
      const repositoryFactory = new FirestoreRepositoryFactory(this.firestore);
      const bookingRepository = repositoryFactory.createBookingRepository();
      
      // Set up use case
      const getBookingUseCase = new GetBookingUseCase(bookingRepository);
      
      // Execute use case
      const booking = await getBookingUseCase.execute(null, code);
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      return res.status(200).json(booking.toJSON());
    } catch (error) {
      console.error('Error getting booking by confirmation code:', error);
      return res.status(500).json({ error: 'Failed to get booking' });
    }
  };
  
  /**
   * Create a new booking
   */
  createBooking = async (req: Request, res: Response) => {
    try {
      const bookingData = req.body;
      
      if (!bookingData) {
        return res.status(400).json({ error: 'Booking data is required' });
      }
      
      // Set up repositories
      const repositoryFactory = new FirestoreRepositoryFactory(this.firestore);
      const bookingRepository = repositoryFactory.createBookingRepository();
      const yachtRepository = repositoryFactory.createYachtRepository();
      
      // Set up domain services
      const pricingService = new PricingService();
      const availabilityService = new AvailabilityService(bookingRepository, yachtRepository);
      const bookingService = new BookingService(pricingService, availabilityService);
      
      // Set up use case
      const createBookingUseCase = new CreateBookingUseCase(
        bookingRepository, 
        yachtRepository, 
        bookingService
      );
      
      // Execute use case
      const result = await createBookingUseCase.execute(bookingData);
      
      return res.status(201).json(result.toJSON());
    } catch (error) {
      console.error('Error creating booking:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('not available')) {
          return res.status(409).json({ error: error.message });
        }
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('invalid')) {
          return res.status(400).json({ error: error.message });
        }
      }
      
      return res.status(500).json({ error: 'Failed to create booking' });
    }
  };
  
  /**
   * Confirm a booking
   */
  confirmBooking = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { paymentDetails } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Booking ID is required' });
      }
      
      // Set up repositories
      const repositoryFactory = new FirestoreRepositoryFactory(this.firestore);
      const bookingRepository = repositoryFactory.createBookingRepository();
      
      // Set up domain services
      const pricingService = new PricingService();
      const bookingService = new BookingService(
        pricingService, 
        // We don't need availability service for confirmation
        null as any
      );
      
      // Set up use case
      const confirmBookingUseCase = new ConfirmBookingUseCase(
        bookingRepository,
        bookingService
      );
      
      // Execute use case
      const result = await confirmBookingUseCase.execute(id, paymentDetails);
      
      return res.status(200).json(result.toJSON());
    } catch (error) {
      console.error('Error confirming booking:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('already confirmed')) {
          return res.status(409).json({ error: error.message });
        }
        if (error.message.includes('invalid')) {
          return res.status(400).json({ error: error.message });
        }
      }
      
      return res.status(500).json({ error: 'Failed to confirm booking' });
    }
  };
  
  /**
   * Cancel a booking
   */
  cancelBooking = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Booking ID is required' });
      }
      
      // Set up repositories
      const repositoryFactory = new FirestoreRepositoryFactory(this.firestore);
      const bookingRepository = repositoryFactory.createBookingRepository();
      
      // Set up use case
      const cancelBookingUseCase = new CancelBookingUseCase(bookingRepository);
      
      // Execute use case
      const result = await cancelBookingUseCase.execute(id, reason);
      
      return res.status(200).json(result.toJSON());
    } catch (error) {
      console.error('Error cancelling booking:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('already cancelled')) {
          return res.status(409).json({ error: error.message });
        }
      }
      
      return res.status(500).json({ error: 'Failed to cancel booking' });
    }
  };
  
  /**
   * Search bookings
   */
  searchBookings = async (req: Request, res: Response) => {
    try {
      const criteria = req.query;
      
      // Set up repositories
      const repositoryFactory = new FirestoreRepositoryFactory(this.firestore);
      const bookingRepository = repositoryFactory.createBookingRepository();
      
      // Set up use case
      const searchBookingsUseCase = new SearchBookingsUseCase(bookingRepository);
      
      // Prepare search criteria
      const searchCriteria: any = {
        customerId: criteria.customerId as string,
        producerId: criteria.producerId as string,
        packageId: criteria.packageId as string,
        yachtId: criteria.yachtId as string,
        confirmationCode: criteria.confirmationCode as string,
        limit: criteria.limit ? parseInt(criteria.limit as string) : 10,
        offset: criteria.offset ? parseInt(criteria.offset as string) : 0
      };
      
      // Parse date parameters
      if (criteria.startDate) {
        searchCriteria.startDate = new Date(criteria.startDate as string);
      }
      
      if (criteria.endDate) {
        searchCriteria.endDate = new Date(criteria.endDate as string);
      }
      
      // Parse status parameter
      if (criteria.status) {
        if (Array.isArray(criteria.status)) {
          searchCriteria.status = criteria.status;
        } else {
          searchCriteria.status = [criteria.status as string];
        }
      }
      
      // Execute use case
      const result = await searchBookingsUseCase.execute(searchCriteria);
      
      // Transform bookings to JSON for response
      const bookings = result.bookings.map(booking => booking.toJSON());
      
      return res.status(200).json({
        bookings,
        total: result.total
      });
    } catch (error) {
      console.error('Error searching bookings:', error);
      return res.status(500).json({ error: 'Failed to search bookings' });
    }
  };
  
  /**
   * Check availability
   */
  checkAvailability = async (req: Request, res: Response) => {
    try {
      const { packageId, yachtId, date, timeSlot } = req.body;
      
      if ((!packageId && !yachtId) || !date) {
        return res.status(400).json({ 
          error: 'PackageId or YachtId and date are required' 
        });
      }
      
      // Set up repositories
      const repositoryFactory = new FirestoreRepositoryFactory(this.firestore);
      const bookingRepository = repositoryFactory.createBookingRepository();
      const yachtRepository = repositoryFactory.createYachtRepository();
      
      // Set up domain services
      const availabilityService = new AvailabilityService(
        bookingRepository,
        yachtRepository
      );
      
      // Set up use case
      const checkAvailabilityUseCase = new CheckAvailabilityUseCase(
        availabilityService
      );
      
      // Parse date
      const bookingDate = new Date(date);
      
      // Execute use case
      const { isAvailable, conflicts } = await checkAvailabilityUseCase.execute({
        packageId,
        yachtId,
        bookingDate,
        timeSlot
      });
      
      return res.status(200).json({ isAvailable, conflicts });
    } catch (error) {
      console.error('Error checking availability:', error);
      return res.status(500).json({ error: 'Failed to check availability' });
    }
  };
}