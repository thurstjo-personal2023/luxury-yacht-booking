/**
 * Repository Mocks for Tests
 * 
 * This file provides mock implementations of repositories used in tests.
 */

import { 
  Booking, 
  BookingStatus, 
  IBookingRepository,
  PaymentDetails,
  PaymentStatus,
  IPaymentRepository,
  YachtInfo,
  IYachtRepository,
  MockPaymentDetails
} from './domain-types';

// Mock implementation of BookingRepository
export class MockBookingRepository implements IBookingRepository {
  private bookings: Map<string, Booking> = new Map();
  private paymentIdIndex: Map<string, string> = new Map();
  
  constructor(initialBookings: Booking[] = []) {
    initialBookings.forEach(booking => {
      this.bookings.set(booking.id, { ...booking });
      if (booking.paymentId) {
        this.paymentIdIndex.set(booking.paymentId, booking.id);
      }
    });
  }
  
  async create(booking: Booking): Promise<Booking> {
    const newBooking = { ...booking };
    this.bookings.set(newBooking.id, newBooking);
    if (newBooking.paymentId) {
      this.paymentIdIndex.set(newBooking.paymentId, newBooking.id);
    }
    return newBooking;
  }
  
  async update(booking: Booking): Promise<Booking> {
    if (!this.bookings.has(booking.id)) {
      throw new Error(`Booking not found: ${booking.id}`);
    }
    
    const oldBooking = this.bookings.get(booking.id);
    if (oldBooking?.paymentId) {
      this.paymentIdIndex.delete(oldBooking.paymentId);
    }
    
    this.bookings.set(booking.id, { ...booking });
    if (booking.paymentId) {
      this.paymentIdIndex.set(booking.paymentId, booking.id);
    }
    
    return booking;
  }
  
  async getById(id: string): Promise<Booking | null> {
    return this.bookings.has(id) ? { ...this.bookings.get(id)! } : null;
  }
  
  async getByUserId(userId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter(booking => booking.userId === userId)
      .map(booking => ({ ...booking }));
  }
  
  async getByYachtId(yachtId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter(booking => booking.yachtId === yachtId)
      .map(booking => ({ ...booking }));
  }
  
  async getByStatus(status: BookingStatus): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter(booking => booking.status === status)
      .map(booking => ({ ...booking }));
  }
  
  async getByPaymentId(paymentId: string): Promise<Booking | null> {
    const bookingId = this.paymentIdIndex.get(paymentId);
    return bookingId ? await this.getById(bookingId) : null;
  }
  
  async search(options: any): Promise<Booking[]> {
    let results = Array.from(this.bookings.values());
    
    if (options.userId) {
      results = results.filter(booking => booking.userId === options.userId);
    }
    
    if (options.yachtId) {
      results = results.filter(booking => booking.yachtId === options.yachtId);
    }
    
    if (options.status) {
      results = results.filter(booking => booking.status === options.status);
    }
    
    if (options.startDate) {
      results = results.filter(booking => 
        booking.startDate >= options.startDate || booking.endDate >= options.startDate
      );
    }
    
    if (options.endDate) {
      results = results.filter(booking => 
        booking.startDate <= options.endDate || booking.endDate <= options.endDate
      );
    }
    
    return results.map(booking => ({ ...booking }));
  }
}

// Mock implementation of PaymentRepository
export class MockPaymentRepository implements IPaymentRepository {
  private payments: Map<string, PaymentDetails> = new Map();
  private bookingIdIndex: Map<string, string> = new Map();
  private paymentIntentIdIndex: Map<string, string> = new Map();
  
  constructor(initialPayments: PaymentDetails[] = []) {
    initialPayments.forEach(payment => {
      this.payments.set(payment.id, payment);
      this.bookingIdIndex.set(payment.bookingId, payment.id);
      this.paymentIntentIdIndex.set(payment.paymentIntentId, payment.id);
    });
  }
  
  async create(payment: PaymentDetails): Promise<PaymentDetails> {
    const newPayment = payment instanceof MockPaymentDetails ?
      payment : new MockPaymentDetails(payment);
    
    this.payments.set(newPayment.id, newPayment);
    this.bookingIdIndex.set(newPayment.bookingId, newPayment.id);
    this.paymentIntentIdIndex.set(newPayment.paymentIntentId, newPayment.id);
    
    return newPayment;
  }
  
  async update(payment: PaymentDetails): Promise<PaymentDetails> {
    if (!this.payments.has(payment.id)) {
      throw new Error(`Payment not found: ${payment.id}`);
    }
    
    const newPayment = payment instanceof MockPaymentDetails ?
      payment : new MockPaymentDetails(payment);
    
    const oldPayment = this.payments.get(payment.id)!;
    this.bookingIdIndex.delete(oldPayment.bookingId);
    this.paymentIntentIdIndex.delete(oldPayment.paymentIntentId);
    
    this.payments.set(newPayment.id, newPayment);
    this.bookingIdIndex.set(newPayment.bookingId, newPayment.id);
    this.paymentIntentIdIndex.set(newPayment.paymentIntentId, newPayment.id);
    
    return newPayment;
  }
  
  async getById(id: string): Promise<PaymentDetails | null> {
    return this.payments.has(id) ? this.payments.get(id)! : null;
  }
  
  async getByBookingId(bookingId: string): Promise<PaymentDetails | null> {
    const paymentId = this.bookingIdIndex.get(bookingId);
    return paymentId ? await this.getById(paymentId) : null;
  }
  
  async getByPaymentIntentId(paymentIntentId: string): Promise<PaymentDetails | null> {
    const paymentId = this.paymentIntentIdIndex.get(paymentIntentId);
    return paymentId ? await this.getById(paymentId) : null;
  }
  
  async getByStatus(status: PaymentStatus): Promise<PaymentDetails[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.status === status);
  }
}

// Mock implementation of YachtRepository
export class MockYachtRepository implements IYachtRepository {
  private yachts: Map<string, YachtInfo> = new Map();
  
  constructor(initialYachts: YachtInfo[] = []) {
    initialYachts.forEach(yacht => {
      this.yachts.set(yacht.id, { ...yacht });
    });
  }
  
  async getById(id: string): Promise<YachtInfo | null> {
    return this.yachts.has(id) ? { ...this.yachts.get(id)! } : null;
  }
  
  async search(options: any): Promise<YachtInfo[]> {
    let results = Array.from(this.yachts.values());
    
    if (options.producerId) {
      results = results.filter(yacht => yacht.producerId === options.producerId);
    }
    
    if (options.location) {
      results = results.filter(yacht => yacht.location.includes(options.location));
    }
    
    if (options.capacity) {
      results = results.filter(yacht => yacht.capacity >= options.capacity);
    }
    
    if (options.available !== undefined) {
      results = results.filter(yacht => yacht.available === options.available);
    }
    
    if (options.minPrice !== undefined) {
      results = results.filter(yacht => yacht.pricePerDay >= options.minPrice);
    }
    
    if (options.maxPrice !== undefined) {
      results = results.filter(yacht => yacht.pricePerDay <= options.maxPrice);
    }
    
    return results.map(yacht => ({ ...yacht }));
  }
  
  async checkAvailability(yachtId: string, startDate: Date, endDate: Date): Promise<boolean> {
    // In a real implementation, this would check booking conflicts
    // Here we just simulate availability based on the yacht's availability flag
    const yacht = await this.getById(yachtId);
    return yacht ? yacht.available : false;
  }
}

// Mock implementation of PaymentService
export class MockPaymentService implements IPaymentService {
  constructor() {}
  
  async createPaymentIntent(paymentInfo: any): Promise<any> {
    return {
      id: `pi_test_${Date.now()}`,
      amount: paymentInfo.amount,
      currency: paymentInfo.currency || 'USD',
      status: 'requires_payment_method',
      client_secret: `cs_test_${Date.now()}`,
      metadata: paymentInfo.metadata || {}
    };
  }
  
  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    return {
      id: paymentIntentId,
      amount: 5000,
      currency: 'USD',
      status: 'succeeded',
      metadata: { bookingId: 'booking-123' }
    };
  }
  
  async cancelPaymentIntent(paymentIntentId: string): Promise<any> {
    return {
      id: paymentIntentId,
      amount: 5000,
      currency: 'USD',
      status: 'canceled',
      metadata: { bookingId: 'booking-123' }
    };
  }
  
  async processWebhookEvent(payload: string, signature: string): Promise<any> {
    return {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_test_${Date.now()}`,
          status: 'succeeded',
          amount: 5000,
          currency: 'USD',
          metadata: { bookingId: 'booking-123' }
        }
      }
    };
  }
}