/**
 * Unit tests for BookingController
 * 
 * These tests verify that the controller properly handles HTTP requests
 * and delegates to the appropriate use cases.
 */

import { jest } from '@jest/globals';
import { Request, Response } from 'express';

import { BookingController } from '../../../../../infrastructure/api/controllers/booking-controller';
import { CreateBookingUseCase } from '../../../../../core/application/use-cases/booking/create-booking-use-case';
import { ConfirmBookingUseCase } from '../../../../../core/application/use-cases/booking/confirm-booking-use-case';
import { CancelBookingUseCase } from '../../../../../core/application/use-cases/booking/cancel-booking-use-case';
import { GetBookingUseCase } from '../../../../../core/application/use-cases/booking/get-booking-use-case';
import { SearchBookingsUseCase } from '../../../../../core/application/use-cases/booking/search-bookings-use-case';
import { CheckAvailabilityUseCase } from '../../../../../core/application/use-cases/booking/check-availability-use-case';

import { Booking } from '../../../../../core/domain/booking/booking';
import { BookingStatusType } from '../../../../../core/domain/booking/booking-status';
import { TimeSlot } from '../../../../../core/domain/booking/time-slot';

describe('BookingController', () => {
  // Mock use cases
  const mockCreateBookingUseCase = {
    execute: jest.fn()
  } as unknown as jest.Mocked<CreateBookingUseCase>;
  
  const mockConfirmBookingUseCase = {
    execute: jest.fn()
  } as unknown as jest.Mocked<ConfirmBookingUseCase>;
  
  const mockCancelBookingUseCase = {
    execute: jest.fn()
  } as unknown as jest.Mocked<CancelBookingUseCase>;
  
  const mockGetBookingUseCase = {
    execute: jest.fn()
  } as unknown as jest.Mocked<GetBookingUseCase>;
  
  const mockSearchBookingsUseCase = {
    execute: jest.fn()
  } as unknown as jest.Mocked<SearchBookingsUseCase>;
  
  const mockCheckAvailabilityUseCase = {
    execute: jest.fn()
  } as unknown as jest.Mocked<CheckAvailabilityUseCase>;
  
  // Test subject
  let controller: BookingController;
  
  // Mock request and response
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;
  
  // Sample booking data
  const sampleBooking = Booking.fromObject({
    id: 'booking-123',
    packageId: 'package-123',
    yachtId: 'yacht-123',
    customerId: 'customer-123',
    status: BookingStatusType.PENDING,
    bookingDate: new Date('2023-06-15'),
    totalAmount: 1000,
    confirmationCode: 'ABC123',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up response mock
    responseJson = jest.fn().mockReturnThis();
    responseStatus = jest.fn().mockReturnThis();
    
    mockResponse = {
      json: responseJson,
      status: responseStatus,
      send: jest.fn(),
    };
    
    // Create controller instance
    controller = new BookingController(
      mockCreateBookingUseCase,
      mockConfirmBookingUseCase,
      mockCancelBookingUseCase,
      mockGetBookingUseCase,
      mockSearchBookingsUseCase,
      mockCheckAvailabilityUseCase
    );
  });
  
  describe('createBooking', () => {
    it('should create a booking and return it with 201 status', async () => {
      // Arrange
      mockRequest = {
        body: {
          packageId: 'package-123',
          yachtId: 'yacht-123',
          customerId: 'customer-123',
          bookingDate: '2023-06-15',
          timeSlot: {
            type: 'morning',
            name: 'Morning',
            startHour: 9,
            startMinute: 0,
            endHour: 12,
            endMinute: 0
          },
          customerDetails: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+9715555555'
          }
        }
      };
      
      mockCreateBookingUseCase.execute.mockResolvedValue(sampleBooking);
      
      // Act
      await controller.createBooking(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockCreateBookingUseCase.execute).toHaveBeenCalledWith({
        packageId: 'package-123',
        yachtId: 'yacht-123',
        customerId: 'customer-123',
        bookingDate: new Date('2023-06-15'),
        timeSlot: expect.any(TimeSlot),
        customerDetails: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+9715555555'
        }
      });
      
      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({
        id: 'booking-123',
        packageId: 'package-123',
        status: BookingStatusType.PENDING
      }));
    });
    
    it('should return 400 if request body is invalid', async () => {
      // Arrange
      mockRequest = {
        body: {
          // Missing required fields
          customerId: 'customer-123'
        }
      };
      
      // Act
      await controller.createBooking(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockCreateBookingUseCase.execute).not.toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
    });
    
    it('should return 500 if use case throws error', async () => {
      // Arrange
      mockRequest = {
        body: {
          packageId: 'package-123',
          yachtId: 'yacht-123',
          customerId: 'customer-123',
          bookingDate: '2023-06-15',
          timeSlot: {
            type: 'morning',
            name: 'Morning',
            startHour: 9,
            startMinute: 0,
            endHour: 12,
            endMinute: 0
          },
          customerDetails: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+9715555555'
          }
        }
      };
      
      mockCreateBookingUseCase.execute.mockRejectedValue(new Error('Database error'));
      
      // Act
      await controller.createBooking(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Internal server error'
      }));
    });
  });
  
  describe('confirmBooking', () => {
    it('should confirm a booking and return it', async () => {
      // Arrange
      mockRequest = {
        params: {
          id: 'booking-123'
        },
        body: {
          paymentDetails: {
            method: 'credit_card',
            amount: 1000,
            currency: 'AED',
            transactionReference: 'tx-123'
          }
        }
      };
      
      const confirmedBooking = Booking.fromObject({
        ...sampleBooking,
        status: BookingStatusType.CONFIRMED
      });
      
      mockConfirmBookingUseCase.execute.mockResolvedValue(confirmedBooking);
      
      // Act
      await controller.confirmBooking(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockConfirmBookingUseCase.execute).toHaveBeenCalledWith('booking-123', expect.objectContaining({
        method: 'credit_card',
        amount: 1000
      }));
      
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({
        id: 'booking-123',
        status: BookingStatusType.CONFIRMED
      }));
    });
    
    it('should return 404 if booking not found', async () => {
      // Arrange
      mockRequest = {
        params: {
          id: 'non-existent'
        },
        body: {
          paymentDetails: {
            method: 'credit_card',
            amount: 1000,
            currency: 'AED'
          }
        }
      };
      
      mockConfirmBookingUseCase.execute.mockResolvedValue(null);
      
      // Act
      await controller.confirmBooking(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Booking not found'
      }));
    });
  });
  
  describe('cancelBooking', () => {
    it('should cancel a booking and return it', async () => {
      // Arrange
      mockRequest = {
        params: {
          id: 'booking-123'
        },
        body: {
          cancellationReason: 'Change of plans'
        }
      };
      
      const cancelledBooking = Booking.fromObject({
        ...sampleBooking,
        status: BookingStatusType.CANCELLED
      });
      
      mockCancelBookingUseCase.execute.mockResolvedValue(cancelledBooking);
      
      // Act
      await controller.cancelBooking(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockCancelBookingUseCase.execute).toHaveBeenCalledWith('booking-123', 'Change of plans');
      
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({
        id: 'booking-123',
        status: BookingStatusType.CANCELLED
      }));
    });
    
    it('should return 404 if booking not found', async () => {
      // Arrange
      mockRequest = {
        params: {
          id: 'non-existent'
        },
        body: {
          cancellationReason: 'Change of plans'
        }
      };
      
      mockCancelBookingUseCase.execute.mockResolvedValue(null);
      
      // Act
      await controller.cancelBooking(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Booking not found'
      }));
    });
  });
  
  describe('getBooking', () => {
    it('should return booking by ID', async () => {
      // Arrange
      mockRequest = {
        params: {
          id: 'booking-123'
        }
      };
      
      mockGetBookingUseCase.execute.mockResolvedValue(sampleBooking);
      
      // Act
      await controller.getBooking(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockGetBookingUseCase.execute).toHaveBeenCalledWith('booking-123');
      
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({
        id: 'booking-123',
        packageId: 'package-123'
      }));
    });
    
    it('should return 404 if booking not found', async () => {
      // Arrange
      mockRequest = {
        params: {
          id: 'non-existent'
        }
      };
      
      mockGetBookingUseCase.execute.mockResolvedValue(null);
      
      // Act
      await controller.getBooking(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Booking not found'
      }));
    });
  });
  
  describe('searchBookings', () => {
    it('should search bookings with criteria', async () => {
      // Arrange
      mockRequest = {
        query: {
          customerId: 'customer-123',
          startDate: '2023-06-01',
          endDate: '2023-06-30',
          status: 'pending,confirmed',
          limit: '10',
          offset: '0'
        }
      };
      
      const searchResult = {
        bookings: [sampleBooking],
        total: 1
      };
      
      mockSearchBookingsUseCase.execute.mockResolvedValue(searchResult);
      
      // Act
      await controller.searchBookings(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockSearchBookingsUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
        customerId: 'customer-123',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        status: [BookingStatusType.PENDING, BookingStatusType.CONFIRMED],
        limit: 10,
        offset: 0
      }));
      
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: 'booking-123'
          })
        ]),
        total: 1
      }));
    });
    
    it('should handle empty search results', async () => {
      // Arrange
      mockRequest = {
        query: {}
      };
      
      const searchResult = {
        bookings: [],
        total: 0
      };
      
      mockSearchBookingsUseCase.execute.mockResolvedValue(searchResult);
      
      // Act
      await controller.searchBookings(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({
        items: [],
        total: 0
      }));
    });
  });
  
  describe('checkAvailability', () => {
    it('should check availability and return result', async () => {
      // Arrange
      mockRequest = {
        body: {
          packageId: 'package-123',
          date: '2023-06-15',
          timeSlot: {
            type: 'morning',
            name: 'Morning',
            startHour: 9,
            startMinute: 0,
            endHour: 12,
            endMinute: 0
          }
        }
      };
      
      mockCheckAvailabilityUseCase.execute.mockResolvedValue(true);
      
      // Act
      await controller.checkAvailability(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockCheckAvailabilityUseCase.execute).toHaveBeenCalledWith(
        'package-123',
        undefined,
        expect.any(Date),
        expect.any(TimeSlot)
      );
      
      expect(responseStatus).toHaveBeenCalledWith(200);
      expect(responseJson).toHaveBeenCalledWith({ isAvailable: true });
    });
    
    it('should return 400 if request body is invalid', async () => {
      // Arrange
      mockRequest = {
        body: {
          // Missing required fields
        }
      };
      
      // Act
      await controller.checkAvailability(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockCheckAvailabilityUseCase.execute).not.toHaveBeenCalled();
      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));
    });
  });
});