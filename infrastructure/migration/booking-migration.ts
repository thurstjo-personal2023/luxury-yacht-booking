/**
 * Booking Migration
 * 
 * This module provides functions to migrate legacy booking data to the new clean architecture.
 */

import { Firestore, collection, getDocs } from 'firebase/firestore';

import { FirestoreRepositoryFactory } from '../../adapters/repositories/repository-factory';
import { IBookingRepository } from '../../core/domain/repositories/booking-repository';
import { Booking } from '../../core/domain/booking/booking';
import { TimeSlot } from '../../core/domain/booking/time-slot';
import { BookingStatus } from '../../core/domain/booking/booking-status';
import { PaymentDetails } from '../../core/domain/booking/payment-details';
import { PaymentStatus } from '../../core/domain/booking/payment-status';

/**
 * Migrate all bookings from the legacy format to the new format
 */
export async function migrateBookings(firestore: Firestore): Promise<{
  total: number;
  migrated: number;
  failed: number;
  errors: string[];
}> {
  const result = {
    total: 0,
    migrated: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  try {
    // Create repository
    const repositoryFactory = new FirestoreRepositoryFactory(firestore);
    const bookingRepository = repositoryFactory.createBookingRepository();
    
    // Get all bookings from the legacy collection
    const bookingsCollection = collection(firestore, 'bookings');
    const snapshot = await getDocs(bookingsCollection);
    
    result.total = snapshot.size;
    
    // Process each booking
    for (const doc of snapshot.docs) {
      try {
        const legacyBooking = doc.data();
        
        // Skip already migrated bookings
        if (legacyBooking._migrated) {
          result.migrated++;
          continue;
        }
        
        // Create new booking entity from legacy data
        const booking = await migrateBooking(legacyBooking, doc.id, bookingRepository);
        
        if (booking) {
          result.migrated++;
        } else {
          result.failed++;
          result.errors.push(`Failed to migrate booking ${doc.id}`);
        }
      } catch (error) {
        result.failed++;
        if (error instanceof Error) {
          result.errors.push(`Error migrating booking ${doc.id}: ${error.message}`);
        } else {
          result.errors.push(`Unknown error migrating booking ${doc.id}`);
        }
      }
    }
    
    return result;
  } catch (error) {
    if (error instanceof Error) {
      result.errors.push(`Migration failed: ${error.message}`);
    } else {
      result.errors.push('Migration failed with unknown error');
    }
    
    return result;
  }
}

/**
 * Migrate a single booking from legacy format to new format
 */
async function migrateBooking(
  legacyBooking: any, 
  bookingId: string,
  bookingRepository: IBookingRepository
): Promise<Booking | null> {
  try {
    // Map legacy status to new status
    const statusMap: { [key: string]: string } = {
      'pending': BookingStatus.PENDING,
      'confirmed': BookingStatus.CONFIRMED,
      'cancelled': BookingStatus.CANCELLED,
      'completed': BookingStatus.COMPLETED
    };
    
    // Create time slot if available
    let timeSlot: TimeSlot | undefined;
    if (legacyBooking.startTime && legacyBooking.endTime) {
      const startTime = new Date(legacyBooking.startTime);
      const endTime = new Date(legacyBooking.endTime);
      
      timeSlot = new TimeSlot(
        'custom',
        'Custom Time',
        startTime.getHours(),
        startTime.getMinutes(),
        endTime.getHours(),
        endTime.getMinutes()
      );
    }
    
    // Create payment details if available
    let paymentDetails: PaymentDetails | undefined;
    if (legacyBooking.payment) {
      const paymentStatusMap: { [key: string]: string } = {
        'pending': PaymentStatus.PENDING,
        'processing': PaymentStatus.PROCESSING,
        'completed': PaymentStatus.COMPLETED,
        'failed': PaymentStatus.FAILED,
        'refunded': PaymentStatus.REFUNDED
      };
      
      paymentDetails = new PaymentDetails({
        method: legacyBooking.payment.method || 'credit_card',
        amount: legacyBooking.payment.amount || legacyBooking.totalPrice,
        currency: legacyBooking.payment.currency || 'AED',
        status: paymentStatusMap[legacyBooking.payment.status] || PaymentStatus.PENDING,
        transactionId: legacyBooking.payment.transactionId || undefined,
        receiptUrl: legacyBooking.payment.receiptUrl || undefined,
        processingDate: legacyBooking.payment.processingDate 
          ? new Date(legacyBooking.payment.processingDate) 
          : new Date()
      });
    }
    
    // Create booking entity
    const booking = Booking.create({
      id: bookingId,
      packageId: legacyBooking.packageId || legacyBooking.yachtId,
      yachtId: legacyBooking.yachtId,
      customerId: legacyBooking.userId || legacyBooking.customerId,
      customerDetails: {
        name: legacyBooking.customerName || '',
        email: legacyBooking.customerEmail || '',
        phone: legacyBooking.customerPhone || ''
      },
      bookingDate: legacyBooking.startDate 
        ? new Date(legacyBooking.startDate) 
        : new Date(),
      timeSlot: timeSlot ? timeSlot.toObject() : undefined,
      status: statusMap[legacyBooking.status] || BookingStatus.PENDING,
      totalAmount: legacyBooking.totalPrice || 0,
      paymentDetails: paymentDetails ? paymentDetails.toObject() : undefined,
      notes: legacyBooking.notes || '',
      confirmationCode: legacyBooking.confirmationCode || undefined,
      producerId: legacyBooking.producerId || undefined,
      metadata: {
        _migrated: true,
        _migratedAt: new Date().toISOString(),
        _legacy: true
      }
    });
    
    // Save to repository
    await bookingRepository.save(booking);
    
    return booking;
  } catch (error) {
    console.error(`Error migrating booking ${bookingId}:`, error);
    return null;
  }
}