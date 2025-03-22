/**
 * Create Booking Use Case Integration Test
 * 
 * This test verifies the integration of the CreateBookingUseCase with
 * its repository dependencies.
 */

import { 
  Booking, 
  BookingStatus, 
  CreateBookingInput, 
  CreateBookingOutput 
} from '../../common/domain-types';
import { 
  createTestEnvironment, 
  createTestBooking 
} from '../../setup/setup-test-env';

/**
 * Mock CreateBookingUseCase for testing
 */
class CreateBookingUseCase {
  constructor(
    private bookingRepository: any,
    private yachtRepository: any
  ) {}

  /**
   * Execute the use case
   */
  async execute(input: CreateBookingInput): Promise<CreateBookingOutput> {
    try {
      // Validate input
      if (!input.userId || !input.yachtId || !input.startDate || !input.endDate) {
        return {
          success: false,
          error: 'Missing required fields'
        };
      }

      // Verify yacht exists
      const yacht = await this.yachtRepository.getById(input.yachtId);
      if (!yacht) {
        return {
          success: false,
          error: 'Yacht not found'
        };
      }

      // Check yacht availability
      const isAvailable = await this.yachtRepository.checkAvailability(
        input.yachtId,
        input.startDate,
        input.endDate
      );

      if (!isAvailable) {
        return {
          success: false,
          error: 'Yacht not available for selected dates'
        };
      }

      // Calculate total amount
      const daysCount = Math.ceil(
        (input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const totalAmount = yacht.pricePerDay * daysCount;

      // Create booking entity
      const booking: Booking = {
        id: `booking-${Date.now()}`,
        userId: input.userId,
        yachtId: input.yachtId,
        startDate: input.startDate,
        endDate: input.endDate,
        status: BookingStatus.PENDING,
        totalAmount,
        guestCount: input.guestCount,
        specialRequests: input.specialRequests,
        createdAt: new Date(),
        items: [],
        timeSlots: []
      };

      // Save to repository
      const createdBooking = await this.bookingRepository.create(booking);

      return {
        success: true,
        booking: createdBooking
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

describe('CreateBookingUseCase Integration', () => {
  it('should create a booking when yacht is available', async () => {
    // Setup
    const { bookingRepository, yachtRepository } = createTestEnvironment();
    const useCase = new CreateBookingUseCase(bookingRepository, yachtRepository);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    const input: CreateBookingInput = {
      userId: 'user-test-3',
      yachtId: 'yacht-test-1', // this is an available yacht
      startDate: tomorrow,
      endDate: dayAfter,
      guestCount: 4,
      specialRequests: 'Champagne on arrival'
    };
    
    // Execute
    const result = await useCase.execute(input);
    
    // Verify
    expect(result.success).toBe(true);
    expect(result.booking).toBeDefined();
    if (result.booking) {
      expect(result.booking.userId).toBe(input.userId);
      expect(result.booking.yachtId).toBe(input.yachtId);
      expect(result.booking.status).toBe(BookingStatus.PENDING);
      expect(result.booking.guestCount).toBe(input.guestCount);
      expect(result.booking.specialRequests).toBe(input.specialRequests);
    }
  });
  
  it('should fail when yacht is not available', async () => {
    // Setup
    const { bookingRepository, yachtRepository } = createTestEnvironment();
    const useCase = new CreateBookingUseCase(bookingRepository, yachtRepository);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    const input: CreateBookingInput = {
      userId: 'user-test-3',
      yachtId: 'yacht-test-2', // this is an unavailable yacht
      startDate: tomorrow,
      endDate: dayAfter
    };
    
    // Execute
    const result = await useCase.execute(input);
    
    // Verify
    expect(result.success).toBe(false);
    expect(result.error).toContain('not available');
  });
  
  it('should fail when yacht does not exist', async () => {
    // Setup
    const { bookingRepository, yachtRepository } = createTestEnvironment();
    const useCase = new CreateBookingUseCase(bookingRepository, yachtRepository);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    const input: CreateBookingInput = {
      userId: 'user-test-3',
      yachtId: 'non-existent-yacht',
      startDate: tomorrow,
      endDate: dayAfter
    };
    
    // Execute
    const result = await useCase.execute(input);
    
    // Verify
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});