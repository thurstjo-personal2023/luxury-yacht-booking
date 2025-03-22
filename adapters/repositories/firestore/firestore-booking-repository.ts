/**
 * Firestore Booking Repository
 * 
 * Implementation of the Booking Repository interface using Firestore
 */

import { Firestore, Timestamp, DocumentData, Query, QuerySnapshot, DocumentSnapshot } from 'firebase/firestore';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, setDoc, deleteDoc, startAfter, addDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

import { IBookingRepository, BookingSearchCriteria } from '../../../core/domain/repositories/booking-repository';
import { Booking } from '../../../core/domain/booking/booking';
import { TimeSlot } from '../../../core/domain/booking/time-slot';
import { TimeBlock } from '../../../core/domain/services/availability-service';
import { BookingStatusType } from '../../../core/domain/booking/booking-status';

/**
 * Firestore implementation of the Booking Repository
 */
export class FirestoreBookingRepository implements IBookingRepository {
  private readonly bookingsCollection = 'bookings';
  private readonly timeBlocksCollection = 'time_blocks';
  
  constructor(private readonly firestore: Firestore) {}
  
  /**
   * Find booking by ID
   */
  async findById(id: string): Promise<Booking | null> {
    try {
      const docRef = doc(this.firestore, this.bookingsCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return this.mapDocumentToBooking(docSnap);
    } catch (error) {
      console.error('Error finding booking by ID:', error);
      throw error;
    }
  }
  
  /**
   * Find booking by confirmation code
   */
  async findByConfirmationCode(code: string): Promise<Booking | null> {
    try {
      const q = query(
        collection(this.firestore, this.bookingsCollection),
        where('confirmationCode', '==', code),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return this.mapDocumentToBooking(querySnapshot.docs[0]);
    } catch (error) {
      console.error('Error finding booking by confirmation code:', error);
      throw error;
    }
  }
  
  /**
   * Find bookings by search criteria
   */
  async findByCriteria(criteria: BookingSearchCriteria): Promise<Booking[]> {
    try {
      let q = collection(this.firestore, this.bookingsCollection);
      let queryBuilder = query(q);
      
      // Apply filters
      if (criteria.customerId) {
        queryBuilder = query(queryBuilder, where('customerId', '==', criteria.customerId));
      }
      
      if (criteria.producerId) {
        queryBuilder = query(queryBuilder, where('producerId', '==', criteria.producerId));
      }
      
      if (criteria.packageId) {
        queryBuilder = query(queryBuilder, where('packageId', '==', criteria.packageId));
      }
      
      if (criteria.yachtId) {
        queryBuilder = query(queryBuilder, where('yachtId', '==', criteria.yachtId));
      }
      
      // Date filters
      // Note: Firestore doesn't support multiple range filters, so we might need more complex logic here
      if (criteria.startDate) {
        const startTimestamp = Timestamp.fromDate(criteria.startDate);
        queryBuilder = query(queryBuilder, where('bookingDate', '>=', startTimestamp));
      }
      
      if (criteria.endDate) {
        const endTimestamp = Timestamp.fromDate(criteria.endDate);
        queryBuilder = query(queryBuilder, where('bookingDate', '<=', endTimestamp));
      }
      
      // Status filters
      if (criteria.status && criteria.status.length > 0) {
        // Note: If multiple statuses are provided, we need multiple queries
        // For simplicity, we're using just the first status in this example
        queryBuilder = query(queryBuilder, where('status', '==', criteria.status[0]));
      }
      
      // Confirmation code
      if (criteria.confirmationCode) {
        queryBuilder = query(queryBuilder, where('confirmationCode', '==', criteria.confirmationCode));
      }
      
      // Order by creation date
      queryBuilder = query(queryBuilder, orderBy('createdAt', 'desc'));
      
      // Apply pagination
      if (criteria.limit) {
        queryBuilder = query(queryBuilder, limit(criteria.limit));
      }
      
      const querySnapshot = await getDocs(queryBuilder);
      
      return querySnapshot.docs.map(doc => this.mapDocumentToBooking(doc));
    } catch (error) {
      console.error('Error finding bookings by criteria:', error);
      throw error;
    }
  }
  
  /**
   * Search bookings with pagination
   */
  async search(criteria: BookingSearchCriteria): Promise<{
    bookings: Booking[];
    total: number;
  }> {
    try {
      // First, get the total count without pagination
      const countQuery = this.buildSearchQuery(criteria, false);
      const countSnapshot = await getDocs(countQuery);
      const total = countSnapshot.size;
      
      // Then, get the paginated results
      const dataQuery = this.buildSearchQuery(criteria, true);
      const dataSnapshot = await getDocs(dataQuery);
      
      const bookings = dataSnapshot.docs.map(doc => this.mapDocumentToBooking(doc));
      
      return {
        bookings,
        total
      };
    } catch (error) {
      console.error('Error searching bookings:', error);
      throw error;
    }
  }
  
  /**
   * Save booking
   */
  async save(booking: Booking): Promise<Booking> {
    try {
      const bookingData = this.mapBookingToDocument(booking);
      
      // Check if booking already exists
      const docRef = doc(this.firestore, this.bookingsCollection, booking.id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Update existing booking
        await updateDoc(docRef, bookingData);
      } else {
        // Create new booking
        await setDoc(docRef, bookingData);
      }
      
      return booking;
    } catch (error) {
      console.error('Error saving booking:', error);
      throw error;
    }
  }
  
  /**
   * Delete booking
   */
  async delete(id: string): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, this.bookingsCollection, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw error;
    }
  }
  
  /**
   * Find conflicting bookings
   */
  async findConflictingBookings(
    packageId: string,
    date: Date,
    timeSlot?: TimeSlot,
    excludeBookingId?: string
  ): Promise<Booking[]> {
    try {
      // Create a date range for the query (start of day to end of day)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Query bookings for the same package and date
      let q = query(
        collection(this.firestore, this.bookingsCollection),
        where('packageId', '==', packageId),
        where('bookingDate', '>=', Timestamp.fromDate(startOfDay)),
        where('bookingDate', '<=', Timestamp.fromDate(endOfDay)),
        where('status', 'not-in', [
          BookingStatusType.CANCELLED,
          BookingStatusType.DRAFT
        ])
      );
      
      const querySnapshot = await getDocs(q);
      
      // Filter out excluded booking ID
      let bookings = querySnapshot.docs
        .map(doc => this.mapDocumentToBooking(doc))
        .filter(booking => !excludeBookingId || booking.id !== excludeBookingId);
      
      // If time slot is specified, further filter by time slot overlap
      if (timeSlot) {
        // This filtering is done in memory since we can't query for time slot overlap in Firestore
        bookings = bookings.filter(booking => {
          if (!booking.timeSlot) return false;
          
          // Simple overlap check: if time slots are the same type
          if (booking.timeSlot.type === timeSlot.type) return true;
          
          // Complex overlap check: if time ranges overlap
          if (booking.timeSlot.startTime && booking.timeSlot.endTime && 
              timeSlot.startTime && timeSlot.endTime) {
              
            return (
              (booking.timeSlot.startTime <= timeSlot.startTime && timeSlot.startTime < booking.timeSlot.endTime) ||
              (timeSlot.startTime <= booking.timeSlot.startTime && booking.timeSlot.startTime < timeSlot.endTime)
            );
          }
          
          return false;
        });
      }
      
      return bookings;
    } catch (error) {
      console.error('Error finding conflicting bookings:', error);
      throw error;
    }
  }
  
  /**
   * Create a time block
   */
  async createTimeBlock(block: TimeBlock): Promise<TimeBlock> {
    try {
      const blockData = {
        id: block.id,
        startDate: Timestamp.fromDate(block.startDate),
        endDate: Timestamp.fromDate(block.endDate),
        reason: block.reason,
        notes: block.notes,
        packageId: block.packageId,
        yachtId: block.yachtId,
        createdBy: block.createdBy,
        createdAt: Timestamp.fromDate(block.createdAt)
      };
      
      // Check if block already exists
      const docRef = doc(this.firestore, this.timeBlocksCollection, block.id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Update existing block
        await updateDoc(docRef, blockData);
      } else {
        // Create new block
        await setDoc(docRef, blockData);
      }
      
      return block;
    } catch (error) {
      console.error('Error creating time block:', error);
      throw error;
    }
  }
  
  /**
   * Find time blocks by criteria
   */
  async findTimeBlocks(
    startDate: Date,
    endDate: Date,
    packageId?: string,
    yachtId?: string
  ): Promise<TimeBlock[]> {
    try {
      let q = collection(this.firestore, this.timeBlocksCollection);
      let queryBuilder = query(q);
      
      // Apply date filters
      queryBuilder = query(
        queryBuilder,
        where('endDate', '>=', Timestamp.fromDate(startDate)),
        where('startDate', '<=', Timestamp.fromDate(endDate))
      );
      
      // Execute the query
      const querySnapshot = await getDocs(queryBuilder);
      
      // Filter results in memory
      const blocks = querySnapshot.docs
        .map(doc => this.mapDocumentToTimeBlock(doc))
        .filter(block => {
          // Filter for global blocks (no package or yacht ID)
          if (!block.packageId && !block.yachtId) {
            return true;
          }
          
          // Filter by package ID
          if (packageId && block.packageId === packageId) {
            return true;
          }
          
          // Filter by yacht ID
          if (yachtId && block.yachtId === yachtId) {
            return true;
          }
          
          return false;
        });
      
      return blocks;
    } catch (error) {
      console.error('Error finding time blocks:', error);
      throw error;
    }
  }
  
  /**
   * Delete a time block
   */
  async deleteTimeBlock(id: string): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, this.timeBlocksCollection, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('Error deleting time block:', error);
      throw error;
    }
  }
  
  /**
   * Get booking statistics
   */
  async getBookingStats(
    startDate: Date,
    endDate: Date,
    producerId?: string
  ): Promise<{
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    revenue: number;
    averageBookingValue: number;
  }> {
    try {
      // Apply date filters
      let queryBuilder = query(
        collection(this.firestore, this.bookingsCollection),
        where('bookingDate', '>=', Timestamp.fromDate(startDate)),
        where('bookingDate', '<=', Timestamp.fromDate(endDate))
      );
      
      // Apply producer filter
      if (producerId) {
        queryBuilder = query(queryBuilder, where('producerId', '==', producerId));
      }
      
      const querySnapshot = await getDocs(queryBuilder);
      
      // Calculate statistics
      let totalBookings = 0;
      let confirmedBookings = 0;
      let cancelledBookings = 0;
      let revenue = 0;
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        totalBookings++;
        
        if (data.status === BookingStatusType.CONFIRMED || 
            data.status === BookingStatusType.CHECKED_IN || 
            data.status === BookingStatusType.COMPLETED) {
          confirmedBookings++;
          revenue += data.totalAmount || 0;
        }
        
        if (data.status === BookingStatusType.CANCELLED) {
          cancelledBookings++;
        }
      });
      
      const averageBookingValue = confirmedBookings > 0 ? revenue / confirmedBookings : 0;
      
      return {
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        revenue,
        averageBookingValue
      };
    } catch (error) {
      console.error('Error getting booking stats:', error);
      throw error;
    }
  }
  
  /**
   * Get customer booking history
   */
  async getCustomerBookingHistory(
    customerId: string,
    limit?: number
  ): Promise<Booking[]> {
    try {
      let queryBuilder = query(
        collection(this.firestore, this.bookingsCollection),
        where('customerId', '==', customerId),
        orderBy('bookingDate', 'desc')
      );
      
      if (limit) {
        queryBuilder = query(queryBuilder, limit(limit));
      }
      
      const querySnapshot = await getDocs(queryBuilder);
      
      return querySnapshot.docs.map(doc => this.mapDocumentToBooking(doc));
    } catch (error) {
      console.error('Error getting customer booking history:', error);
      throw error;
    }
  }
  
  /**
   * Get booking count by status
   */
  async getBookingCountByStatus(
    producerId?: string
  ): Promise<Record<string, number>> {
    try {
      let queryBuilder = collection(this.firestore, this.bookingsCollection);
      
      if (producerId) {
        queryBuilder = query(queryBuilder, where('producerId', '==', producerId)) as any;
      }
      
      const querySnapshot = await getDocs(queryBuilder);
      
      // Count bookings by status
      const statusCounts: Record<string, number> = {};
      
      // Initialize with zero counts for all statuses
      Object.values(BookingStatusType).forEach(status => {
        statusCounts[status] = 0;
      });
      
      // Update counts from results
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const status = data.status;
        
        if (status) {
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        }
      });
      
      return statusCounts;
    } catch (error) {
      console.error('Error getting booking count by status:', error);
      throw error;
    }
  }
  
  /**
   * Build search query
   */
  private buildSearchQuery(criteria: BookingSearchCriteria, paginated: boolean): Query {
    let queryBuilder = collection(this.firestore, this.bookingsCollection);
    
    // Apply filters
    if (criteria.customerId) {
      queryBuilder = query(queryBuilder, where('customerId', '==', criteria.customerId));
    }
    
    if (criteria.producerId) {
      queryBuilder = query(queryBuilder, where('producerId', '==', criteria.producerId));
    }
    
    if (criteria.packageId) {
      queryBuilder = query(queryBuilder, where('packageId', '==', criteria.packageId));
    }
    
    if (criteria.yachtId) {
      queryBuilder = query(queryBuilder, where('yachtId', '==', criteria.yachtId));
    }
    
    // Date filters
    if (criteria.startDate) {
      const startTimestamp = Timestamp.fromDate(criteria.startDate);
      queryBuilder = query(queryBuilder, where('bookingDate', '>=', startTimestamp));
    }
    
    if (criteria.endDate) {
      const endTimestamp = Timestamp.fromDate(criteria.endDate);
      queryBuilder = query(queryBuilder, where('bookingDate', '<=', endTimestamp));
    }
    
    // Status filters
    if (criteria.status && criteria.status.length === 1) {
      queryBuilder = query(queryBuilder, where('status', '==', criteria.status[0]));
    }
    
    // Confirmation code
    if (criteria.confirmationCode) {
      queryBuilder = query(queryBuilder, where('confirmationCode', '==', criteria.confirmationCode));
    }
    
    // Order by creation date
    queryBuilder = query(queryBuilder, orderBy('createdAt', 'desc'));
    
    // Apply pagination
    if (paginated && criteria.limit) {
      queryBuilder = query(queryBuilder, limit(criteria.limit));
      
      if (criteria.offset && criteria.offset > 0) {
        // Note: Firestore pagination requires a cursor, not an offset
        // This is a simplified approach
        queryBuilder = query(queryBuilder, limit(criteria.offset + criteria.limit));
      }
    }
    
    return queryBuilder;
  }
  
  /**
   * Map Firestore document to Booking domain object
   */
  private mapDocumentToBooking(doc: DocumentSnapshot): Booking {
    const data = doc.data();
    
    if (!data) {
      throw new Error(`Booking with ID ${doc.id} has no data`);
    }
    
    // Map Firestore Timestamp to Date
    const bookingDate = data.bookingDate instanceof Timestamp 
      ? data.bookingDate.toDate() 
      : new Date(data.bookingDate);
      
    const createdAt = data.createdAt instanceof Timestamp 
      ? data.createdAt.toDate() 
      : new Date(data.createdAt);
      
    const updatedAt = data.updatedAt instanceof Timestamp 
      ? data.updatedAt.toDate() 
      : new Date(data.updatedAt);
      
    const cancelledAt = data.cancelledAt instanceof Timestamp 
      ? data.cancelledAt.toDate() 
      : data.cancelledAt ? new Date(data.cancelledAt) : undefined;
    
    // Map time slot if present
    let timeSlot: TimeSlot | undefined;
    if (data.timeSlot) {
      timeSlot = new TimeSlot(
        data.timeSlot.type,
        data.timeSlot.name,
        data.timeSlot.startHour,
        data.timeSlot.startMinute,
        data.timeSlot.endHour,
        data.timeSlot.endMinute
      );
    }
    
    // Map to domain object using fromObject factory method
    return Booking.fromObject({
      id: doc.id,
      packageId: data.packageId,
      yachtId: data.yachtId,
      status: data.status,
      customerId: data.customerId,
      customerDetails: data.customerDetails,
      bookingDate,
      timeSlot: timeSlot ? timeSlot.toObject() : undefined,
      items: data.items || [],
      totalAmount: data.totalAmount || 0,
      paymentDetails: data.paymentDetails,
      notes: data.notes,
      checkInStatus: data.checkInStatus,
      confirmationCode: data.confirmationCode,
      createdAt,
      updatedAt,
      cancelledAt,
      cancellationReason: data.cancellationReason,
      producerId: data.producerId,
      metadata: data.metadata
    });
  }
  
  /**
   * Map Booking domain object to Firestore document
   */
  private mapBookingToDocument(booking: Booking): DocumentData {
    const data = booking.toObject();
    
    // Convert Date objects to Firestore Timestamps
    return {
      ...data,
      bookingDate: Timestamp.fromDate(booking.bookingDate),
      createdAt: Timestamp.fromDate(booking.createdAt),
      updatedAt: Timestamp.fromDate(new Date()), // Always update to current time
      cancelledAt: booking.cancelledAt ? Timestamp.fromDate(booking.cancelledAt) : null,
      paymentDetails: booking.paymentDetails ? {
        ...booking.paymentDetails.toObject(),
        processingDate: Timestamp.fromDate(booking.paymentDetails.processingDate)
      } : null
    };
  }
  
  /**
   * Map Firestore document to TimeBlock domain object
   */
  private mapDocumentToTimeBlock(doc: DocumentSnapshot): TimeBlock {
    const data = doc.data();
    
    if (!data) {
      throw new Error(`Time block with ID ${doc.id} has no data`);
    }
    
    return {
      id: doc.id,
      startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate),
      endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate),
      reason: data.reason,
      notes: data.notes,
      packageId: data.packageId,
      yachtId: data.yachtId,
      createdBy: data.createdBy,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt)
    };
  }
}