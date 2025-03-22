/**
 * Test Environment Setup Helper
 * 
 * This module provides helpers for setting up test environments,
 * including mock data and repositories.
 */

import { 
  Booking, 
  BookingStatus, 
  PaymentStatus, 
  YachtInfo, 
  MockPaymentDetails 
} from '../common/domain-types';
import { 
  MockBookingRepository, 
  MockPaymentRepository, 
  MockYachtRepository, 
  MockPaymentService 
} from '../common/repository-mocks';

/**
 * Create a test booking
 */
export function createTestBooking(overrides: Partial<Booking> = {}): Booking {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  
  return {
    id: overrides.id || `booking-test-${Date.now()}`,
    userId: overrides.userId || 'user-test-123',
    yachtId: overrides.yachtId || 'yacht-test-456',
    startDate: overrides.startDate || tomorrow,
    endDate: overrides.endDate || dayAfterTomorrow,
    status: overrides.status || BookingStatus.PENDING,
    totalAmount: overrides.totalAmount || 5000,
    guestCount: overrides.guestCount || 5,
    specialRequests: overrides.specialRequests,
    paymentId: overrides.paymentId,
    paymentStatus: overrides.paymentStatus,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt,
    cancelledAt: overrides.cancelledAt,
    completedAt: overrides.completedAt,
    items: overrides.items || [],
    timeSlots: overrides.timeSlots || []
  };
}

/**
 * Create a test yacht
 */
export function createTestYacht(overrides: Partial<YachtInfo> = {}): YachtInfo {
  const now = new Date();
  
  return {
    id: overrides.id || `yacht-test-${Date.now()}`,
    name: overrides.name || 'Test Luxury Yacht',
    producerId: overrides.producerId || 'producer-test-123',
    description: overrides.description || 'A test luxury yacht for unit testing',
    location: overrides.location || 'Test Marina',
    capacity: overrides.capacity || 10,
    pricePerDay: overrides.pricePerDay || 5000,
    available: overrides.available !== undefined ? overrides.available : true,
    images: overrides.images || [{ url: 'https://example.com/test-yacht.jpg', type: 'image' }],
    features: overrides.features || ['WiFi', 'Air Conditioning', 'Swimming Pool'],
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now
  };
}

/**
 * Create a test payment details
 */
export function createTestPaymentDetails(overrides: Partial<MockPaymentDetails> = {}): MockPaymentDetails {
  return new MockPaymentDetails({
    id: overrides.id || `payment-test-${Date.now()}`,
    bookingId: overrides.bookingId || 'booking-test-123',
    paymentIntentId: overrides.paymentIntentId || `pi_test_${Date.now()}`,
    amount: overrides.amount || 5000,
    currency: overrides.currency || 'USD',
    status: overrides.status || PaymentStatus.PENDING,
    processingDate: overrides.processingDate,
    refundDate: overrides.refundDate,
    metadata: overrides.metadata || { bookingId: overrides.bookingId || 'booking-test-123' }
  });
}

/**
 * Create a test environment with predefined data
 */
export function createTestEnvironment(options: {
  bookings?: Booking[];
  yachts?: YachtInfo[];
  payments?: MockPaymentDetails[];
} = {}) {
  // Create sample data if none provided
  const bookings = options.bookings || [
    createTestBooking({ id: 'booking-test-1', userId: 'user-test-1' }),
    createTestBooking({ id: 'booking-test-2', userId: 'user-test-2' })
  ];
  
  const yachts = options.yachts || [
    createTestYacht({ id: 'yacht-test-1' }),
    createTestYacht({ id: 'yacht-test-2', available: false })
  ];
  
  const payments = options.payments || [
    createTestPaymentDetails({ 
      id: 'payment-test-1', 
      bookingId: 'booking-test-1',
      paymentIntentId: 'pi_test_1'
    })
  ];
  
  // Create repositories with initial data
  const bookingRepository = new MockBookingRepository(bookings);
  const yachtRepository = new MockYachtRepository(yachts);
  const paymentRepository = new MockPaymentRepository(payments);
  const paymentService = new MockPaymentService();
  
  return {
    bookingRepository,
    yachtRepository,
    paymentRepository,
    paymentService,
    data: {
      bookings,
      yachts,
      payments
    }
  };
}