/**
 * Common Domain Types for Tests
 * 
 * This file provides common domain type definitions used across test files.
 * These definitions might be simplified versions of the actual domain entities.
 */

// Booking Domain Types
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export interface BookingItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  price: number;
}

export interface TimeSlot {
  id: string;
  name: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface Booking {
  id: string;
  userId: string;
  yachtId: string;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
  totalAmount: number;
  paymentId?: string;
  paymentStatus?: PaymentStatus;
  items?: BookingItem[];
  timeSlots?: TimeSlot[];
  guestCount?: number;
  specialRequests?: string;
  createdAt: Date;
  updatedAt?: Date;
  cancelledAt?: Date;
  completedAt?: Date;
}

// Payment Domain Types
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

export interface PaymentDetails {
  id: string;
  bookingId: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  processingDate?: Date;
  refundDate?: Date;
  metadata?: Record<string, string>;
  
  // Helper methods
  isCompleted(): boolean;
  isPending(): boolean;
  isCancelled(): boolean;
  isFailed(): boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  payment?: PaymentDetails;
  error?: string;
  event?: any;
}

// Repository interfaces
export interface IBookingRepository {
  create(booking: Booking): Promise<Booking>;
  update(booking: Booking): Promise<Booking>;
  getById(id: string): Promise<Booking | null>;
  getByUserId(userId: string): Promise<Booking[]>;
  getByYachtId(yachtId: string): Promise<Booking[]>;
  getByStatus(status: BookingStatus): Promise<Booking[]>;
  getByPaymentId(paymentId: string): Promise<Booking | null>;
  search(options: any): Promise<Booking[]>;
}

export interface IPaymentRepository {
  create(payment: PaymentDetails): Promise<PaymentDetails>;
  update(payment: PaymentDetails): Promise<PaymentDetails>;
  getById(id: string): Promise<PaymentDetails | null>;
  getByBookingId(bookingId: string): Promise<PaymentDetails | null>;
  getByPaymentIntentId(paymentIntentId: string): Promise<PaymentDetails | null>;
  getByStatus(status: PaymentStatus): Promise<PaymentDetails[]>;
}

export interface IYachtRepository {
  getById(id: string): Promise<any | null>;
  search(options: any): Promise<any[]>;
  checkAvailability(yachtId: string, startDate: Date, endDate: Date): Promise<boolean>;
}

// Payment service interface
export interface IPaymentService {
  createPaymentIntent(paymentInfo: any): Promise<PaymentIntent>;
  getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null>;
  cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent | null>;
  processWebhookEvent(payload: string, signature: string): Promise<any>;
}

// Use case interfaces
export interface CreateBookingInput {
  userId: string;
  yachtId: string;
  startDate: Date;
  endDate: Date;
  guestCount?: number;
  specialRequests?: string;
}

export interface CreateBookingOutput {
  success: boolean;
  booking?: Booking;
  error?: string;
}

export interface GetBookingInput {
  bookingId: string;
  userId: string;
}

export interface GetBookingOutput {
  success: boolean;
  booking?: Booking;
  error?: string;
}

export interface CancelBookingInput {
  bookingId: string;
  userId: string;
}

export interface CancelBookingOutput {
  success: boolean;
  booking?: Booking;
  error?: string;
}

export interface CheckAvailabilityInput {
  yachtId: string;
  startDate: Date;
  endDate: Date;
}

export interface CheckAvailabilityOutput {
  isAvailable: boolean;
  conflicts?: Booking[];
}

export interface SearchBookingsInput {
  userId?: string;
  yachtId?: string;
  status?: BookingStatus;
}

export interface SearchBookingsOutput {
  success: boolean;
  bookings?: Booking[];
  total?: number;
  error?: string;
}

export interface CreatePaymentIntentInput {
  bookingId: string;
  userId: string;
}

export interface CreatePaymentIntentOutput {
  success: boolean;
  paymentIntent?: PaymentIntent;
  error?: string;
}

export interface ProcessPaymentInput {
  paymentIntentId: string;
  userId: string;
}

export interface ProcessPaymentOutput {
  success: boolean;
  payment?: PaymentDetails;
  error?: string;
}

export interface CancelPaymentInput {
  paymentIntentId: string;
  userId: string;
}

export interface CancelPaymentOutput {
  success: boolean;
  payment?: PaymentDetails;
  error?: string;
}

// Yacht domain types
export interface YachtMedia {
  type: string;
  url: string;
  title?: string;
}

export interface YachtInfo {
  id: string;
  name: string;
  producerId: string;
  description: string;
  location: string;
  capacity: number;
  pricePerDay: number;
  available: boolean;
  images: YachtMedia[];
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Mock implementation of PaymentDetails to avoid implementation issues
export class MockPaymentDetails implements PaymentDetails {
  id: string;
  bookingId: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  processingDate?: Date;
  refundDate?: Date;
  metadata?: Record<string, string>;
  
  constructor(data: Partial<PaymentDetails>) {
    this.id = data.id || '';
    this.bookingId = data.bookingId || '';
    this.paymentIntentId = data.paymentIntentId || '';
    this.amount = data.amount || 0;
    this.currency = data.currency || 'USD';
    this.status = data.status || PaymentStatus.PENDING;
    this.processingDate = data.processingDate;
    this.refundDate = data.refundDate;
    this.metadata = data.metadata;
  }
  
  isCompleted(): boolean {
    return this.status === PaymentStatus.PAID;
  }
  
  isPending(): boolean {
    return this.status === PaymentStatus.PENDING;
  }
  
  isCancelled(): boolean {
    return this.status === PaymentStatus.FAILED;
  }
  
  isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }
}