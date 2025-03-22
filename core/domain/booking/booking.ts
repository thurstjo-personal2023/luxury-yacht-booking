/**
 * Booking Entity
 * 
 * Core domain entity representing a booking in the system
 */

import { BookingStatus, BookingStatusType } from './booking-status';
import { PaymentStatus } from './payment-status';
import { BookingItem } from './booking-item';
import { TimeSlot } from './time-slot';
import { CustomerDetails } from './customer-details';
import { PaymentDetails } from './payment-details';

/**
 * Booking check-in status
 */
export enum CheckInStatusType {
  PENDING = 'pending',
  CHECKED_IN = 'checked_in',
  NO_SHOW = 'no_show'
}

/**
 * Booking entity
 */
export class Booking {
  private _id: string;
  private _packageId: string;
  private _yachtId?: string;
  private _status: BookingStatus;
  private _customerId: string;
  private _customerDetails: CustomerDetails;
  private _bookingDate: Date;
  private _timeSlot?: TimeSlot;
  private _items: BookingItem[];
  private _totalAmount: number;
  private _paymentDetails?: PaymentDetails;
  private _notes?: string;
  private _checkInStatus: CheckInStatusType;
  private _confirmationCode?: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _cancelledAt?: Date;
  private _cancellationReason?: string;
  private _producerId?: string;
  private _metadata?: Record<string, any>;
  
  constructor(
    id: string,
    packageId: string,
    status: BookingStatus | BookingStatusType,
    customerId: string,
    customerDetails: CustomerDetails,
    bookingDate: Date,
    items: BookingItem[],
    createdAt: Date,
    updatedAt: Date,
    yachtId?: string,
    timeSlot?: TimeSlot,
    paymentDetails?: PaymentDetails,
    notes?: string,
    checkInStatus?: CheckInStatusType,
    confirmationCode?: string,
    cancelledAt?: Date,
    cancellationReason?: string,
    producerId?: string,
    metadata?: Record<string, any>
  ) {
    this._id = id;
    this._packageId = packageId;
    this._yachtId = yachtId;
    this._status = status instanceof BookingStatus ? status : new BookingStatus(status);
    this._customerId = customerId;
    this._customerDetails = customerDetails;
    this._bookingDate = bookingDate;
    this._timeSlot = timeSlot;
    this._items = items;
    this._totalAmount = this.calculateTotalAmount();
    this._paymentDetails = paymentDetails;
    this._notes = notes;
    this._checkInStatus = checkInStatus || CheckInStatusType.PENDING;
    this._confirmationCode = confirmationCode;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._cancelledAt = cancelledAt;
    this._cancellationReason = cancellationReason;
    this._producerId = producerId;
    this._metadata = metadata;
    
    this.validate();
  }
  
  // Getters
  get id(): string { return this._id; }
  get packageId(): string { return this._packageId; }
  get yachtId(): string | undefined { return this._yachtId; }
  get status(): BookingStatus { return this._status; }
  get customerId(): string { return this._customerId; }
  get customerDetails(): CustomerDetails { return this._customerDetails; }
  get bookingDate(): Date { return this._bookingDate; }
  get timeSlot(): TimeSlot | undefined { return this._timeSlot; }
  get items(): BookingItem[] { return [...this._items]; } // Return a copy to prevent direct mutation
  get totalAmount(): number { return this._totalAmount; }
  get paymentDetails(): PaymentDetails | undefined { return this._paymentDetails; }
  get notes(): string | undefined { return this._notes; }
  get checkInStatus(): CheckInStatusType { return this._checkInStatus; }
  get confirmationCode(): string | undefined { return this._confirmationCode; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get cancelledAt(): Date | undefined { return this._cancelledAt; }
  get cancellationReason(): string | undefined { return this._cancellationReason; }
  get producerId(): string | undefined { return this._producerId; }
  get metadata(): Record<string, any> | undefined { return this._metadata ? {...this._metadata} : undefined; }
  
  /**
   * Validate booking
   */
  private validate(): void {
    if (!this._id) {
      throw new Error('Booking ID is required');
    }
    
    if (!this._packageId) {
      throw new Error('Package ID is required');
    }
    
    if (!this._customerId) {
      throw new Error('Customer ID is required');
    }
    
    if (!this._customerDetails) {
      throw new Error('Customer details are required');
    }
    
    if (!this._bookingDate) {
      throw new Error('Booking date is required');
    }
    
    // Additional booking-specific validation logic
    
    // If booking is cancelled, ensure cancellation date is set
    if (this._status.type === BookingStatusType.CANCELLED && !this._cancelledAt) {
      throw new Error('Cancellation date is required for cancelled bookings');
    }
    
    // Validate booking date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const bookingDay = new Date(this._bookingDate);
    bookingDay.setHours(0, 0, 0, 0);
    
    if (bookingDay < today && this._status.type !== BookingStatusType.DRAFT) {
      throw new Error('Booking date cannot be in the past');
    }
  }
  
  /**
   * Calculate total amount from booking items
   */
  private calculateTotalAmount(): number {
    if (!this._items || this._items.length === 0) {
      return 0;
    }
    
    return this._items.reduce((total, item) => total + item.totalPrice, 0);
  }
  
  /**
   * Add an item to the booking
   */
  addItem(item: BookingItem): Booking {
    // Ensure item ID is not already in the booking
    if (this._items.some(existingItem => existingItem.id === item.id)) {
      throw new Error(`Item with ID ${item.id} already exists in this booking`);
    }
    
    // Create a new booking with the added item
    const updatedItems = [...this._items, item];
    
    return new Booking(
      this._id,
      this._packageId,
      this._status,
      this._customerId,
      this._customerDetails,
      this._bookingDate,
      updatedItems,
      this._createdAt,
      new Date(),
      this._yachtId,
      this._timeSlot,
      this._paymentDetails,
      this._notes,
      this._checkInStatus,
      this._confirmationCode,
      this._cancelledAt,
      this._cancellationReason,
      this._producerId,
      this._metadata
    );
  }
  
  /**
   * Remove an item from the booking
   */
  removeItem(itemId: string): Booking {
    // Check if item exists and is not required
    const item = this._items.find(item => item.id === itemId);
    
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found in this booking`);
    }
    
    if (item.isRequired) {
      throw new Error(`Cannot remove required item with ID ${itemId} from this booking`);
    }
    
    // Create a new booking with the item removed
    const updatedItems = this._items.filter(item => item.id !== itemId);
    
    return new Booking(
      this._id,
      this._packageId,
      this._status,
      this._customerId,
      this._customerDetails,
      this._bookingDate,
      updatedItems,
      this._createdAt,
      new Date(),
      this._yachtId,
      this._timeSlot,
      this._paymentDetails,
      this._notes,
      this._checkInStatus,
      this._confirmationCode,
      this._cancelledAt,
      this._cancellationReason,
      this._producerId,
      this._metadata
    );
  }
  
  /**
   * Update the booking status
   */
  updateStatus(newStatus: BookingStatusType): Booking {
    // Use the value object's transition logic
    const updatedStatus = this._status.transitionTo(newStatus);
    
    // Additional booking-specific logic for status changes
    let cancelledAt = this._cancelledAt;
    if (newStatus === BookingStatusType.CANCELLED) {
      cancelledAt = new Date();
    }
    
    return new Booking(
      this._id,
      this._packageId,
      updatedStatus,
      this._customerId,
      this._customerDetails,
      this._bookingDate,
      this._items,
      this._createdAt,
      new Date(),
      this._yachtId,
      this._timeSlot,
      this._paymentDetails,
      this._notes,
      this._checkInStatus,
      this._confirmationCode,
      cancelledAt,
      this._cancellationReason,
      this._producerId,
      this._metadata
    );
  }
  
  /**
   * Update check-in status
   */
  updateCheckInStatus(checkInStatus: CheckInStatusType): Booking {
    // Handle specific transitions
    if (checkInStatus === CheckInStatusType.CHECKED_IN && this._status.type !== BookingStatusType.CONFIRMED) {
      throw new Error('Only confirmed bookings can be checked in');
    }
    
    if (checkInStatus === CheckInStatusType.NO_SHOW && this._status.type !== BookingStatusType.CONFIRMED) {
      throw new Error('Only confirmed bookings can be marked as no-show');
    }
    
    // Special handling - update booking status to completed if checked in
    let updatedStatus = this._status;
    if (checkInStatus === CheckInStatusType.CHECKED_IN && this._status.type === BookingStatusType.CONFIRMED) {
      updatedStatus = new BookingStatus(BookingStatusType.CHECKED_IN);
    }
    
    return new Booking(
      this._id,
      this._packageId,
      updatedStatus,
      this._customerId,
      this._customerDetails,
      this._bookingDate,
      this._items,
      this._createdAt,
      new Date(),
      this._yachtId,
      this._timeSlot,
      this._paymentDetails,
      this._notes,
      checkInStatus,
      this._confirmationCode,
      this._cancelledAt,
      this._cancellationReason,
      this._producerId,
      this._metadata
    );
  }
  
  /**
   * Set payment details
   */
  setPaymentDetails(paymentDetails: PaymentDetails): Booking {
    // Ensure payment details are for this booking
    if (paymentDetails.bookingId !== this._id) {
      throw new Error('Payment details are for a different booking');
    }
    
    return new Booking(
      this._id,
      this._packageId,
      this._status,
      this._customerId,
      this._customerDetails,
      this._bookingDate,
      this._items,
      this._createdAt,
      new Date(),
      this._yachtId,
      this._timeSlot,
      paymentDetails,
      this._notes,
      this._checkInStatus,
      this._confirmationCode,
      this._cancelledAt,
      this._cancellationReason,
      this._producerId,
      this._metadata
    );
  }
  
  /**
   * Set confirmation code
   */
  setConfirmationCode(confirmationCode: string): Booking {
    return new Booking(
      this._id,
      this._packageId,
      this._status,
      this._customerId,
      this._customerDetails,
      this._bookingDate,
      this._items,
      this._createdAt,
      new Date(),
      this._yachtId,
      this._timeSlot,
      this._paymentDetails,
      this._notes,
      this._checkInStatus,
      confirmationCode,
      this._cancelledAt,
      this._cancellationReason,
      this._producerId,
      this._metadata
    );
  }
  
  /**
   * Update booking date and time slot
   */
  updateBookingDateTime(bookingDate: Date, timeSlot?: TimeSlot): Booking {
    // Validate booking date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const bookingDay = new Date(bookingDate);
    bookingDay.setHours(0, 0, 0, 0);
    
    if (bookingDay < today) {
      throw new Error('Booking date cannot be in the past');
    }
    
    return new Booking(
      this._id,
      this._packageId,
      this._status,
      this._customerId,
      this._customerDetails,
      bookingDate,
      this._items,
      this._createdAt,
      new Date(),
      this._yachtId,
      timeSlot,
      this._paymentDetails,
      this._notes,
      this._checkInStatus,
      this._confirmationCode,
      this._cancelledAt,
      this._cancellationReason,
      this._producerId,
      this._metadata
    );
  }
  
  /**
   * Update customer details
   */
  updateCustomerDetails(customerDetails: CustomerDetails): Booking {
    return new Booking(
      this._id,
      this._packageId,
      this._status,
      this._customerId,
      customerDetails,
      this._bookingDate,
      this._items,
      this._createdAt,
      new Date(),
      this._yachtId,
      this._timeSlot,
      this._paymentDetails,
      this._notes,
      this._checkInStatus,
      this._confirmationCode,
      this._cancelledAt,
      this._cancellationReason,
      this._producerId,
      this._metadata
    );
  }
  
  /**
   * Cancel booking
   */
  cancel(reason?: string): Booking {
    // Check if booking can be cancelled
    if (this._status.type === BookingStatusType.COMPLETED) {
      throw new Error('Completed bookings cannot be cancelled');
    }
    
    // Business rule: If booking is already cancelled, just update the reason
    if (this._status.type === BookingStatusType.CANCELLED) {
      return new Booking(
        this._id,
        this._packageId,
        this._status,
        this._customerId,
        this._customerDetails,
        this._bookingDate,
        this._items,
        this._createdAt,
        new Date(),
        this._yachtId,
        this._timeSlot,
        this._paymentDetails,
        this._notes,
        this._checkInStatus,
        this._confirmationCode,
        this._cancelledAt,
        reason || this._cancellationReason,
        this._producerId,
        this._metadata
      );
    }
    
    // Transition to cancelled status
    const cancelledStatus = this._status.transitionTo(BookingStatusType.CANCELLED);
    
    return new Booking(
      this._id,
      this._packageId,
      cancelledStatus,
      this._customerId,
      this._customerDetails,
      this._bookingDate,
      this._items,
      this._createdAt,
      new Date(),
      this._yachtId,
      this._timeSlot,
      this._paymentDetails,
      this._notes,
      this._checkInStatus,
      this._confirmationCode,
      new Date(),
      reason,
      this._producerId,
      this._metadata
    );
  }
  
  /**
   * Update notes
   */
  updateNotes(notes: string): Booking {
    return new Booking(
      this._id,
      this._packageId,
      this._status,
      this._customerId,
      this._customerDetails,
      this._bookingDate,
      this._items,
      this._createdAt,
      new Date(),
      this._yachtId,
      this._timeSlot,
      this._paymentDetails,
      notes,
      this._checkInStatus,
      this._confirmationCode,
      this._cancelledAt,
      this._cancellationReason,
      this._producerId,
      this._metadata
    );
  }
  
  /**
   * Update metadata
   */
  updateMetadata(metadata: Record<string, any>): Booking {
    return new Booking(
      this._id,
      this._packageId,
      this._status,
      this._customerId,
      this._customerDetails,
      this._bookingDate,
      this._items,
      this._createdAt,
      new Date(),
      this._yachtId,
      this._timeSlot,
      this._paymentDetails,
      this._notes,
      this._checkInStatus,
      this._confirmationCode,
      this._cancelledAt,
      this._cancellationReason,
      this._producerId,
      { ...this._metadata, ...metadata }
    );
  }
  
  /**
   * Check if booking can be modified
   */
  canBeModified(): boolean {
    return !this._status.isFinal();
  }
  
  /**
   * Check if booking is confirmed
   */
  isConfirmed(): boolean {
    return this._status.type === BookingStatusType.CONFIRMED || 
           this._status.type === BookingStatusType.CHECKED_IN ||
           this._status.type === BookingStatusType.COMPLETED;
  }
  
  /**
   * Check if booking is paid
   */
  isPaid(): boolean {
    return this._paymentDetails !== undefined && this._paymentDetails.isSuccessful();
  }
  
  /**
   * Create a plain object representation for persistence
   */
  toObject(): Record<string, any> {
    return {
      id: this._id,
      packageId: this._packageId,
      yachtId: this._yachtId,
      status: this._status.toString(),
      customerId: this._customerId,
      customerDetails: this._customerDetails.toObject(),
      bookingDate: this._bookingDate,
      timeSlot: this._timeSlot ? this._timeSlot.toObject() : undefined,
      items: this._items.map(item => item.toObject()),
      totalAmount: this._totalAmount,
      paymentDetails: this._paymentDetails ? this._paymentDetails.toObject() : undefined,
      notes: this._notes,
      checkInStatus: this._checkInStatus,
      confirmationCode: this._confirmationCode,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      cancelledAt: this._cancelledAt,
      cancellationReason: this._cancellationReason,
      producerId: this._producerId,
      metadata: this._metadata
    };
  }
  
  /**
   * Create a Booking from a plain object
   */
  static fromObject(data: Record<string, any>): Booking {
    return new Booking(
      data.id,
      data.packageId,
      BookingStatus.fromString(data.status),
      data.customerId,
      CustomerDetails.fromObject(data.customerDetails),
      data.bookingDate instanceof Date ? data.bookingDate : new Date(data.bookingDate),
      (data.items || []).map(BookingItem.fromObject),
      data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
      data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt),
      data.yachtId,
      data.timeSlot ? TimeSlot.fromObject(data.timeSlot) : undefined,
      data.paymentDetails ? PaymentDetails.fromObject(data.paymentDetails) : undefined,
      data.notes,
      data.checkInStatus,
      data.confirmationCode,
      data.cancelledAt ? (data.cancelledAt instanceof Date ? data.cancelledAt : new Date(data.cancelledAt)) : undefined,
      data.cancellationReason,
      data.producerId,
      data.metadata
    );
  }
  
  /**
   * Create a new draft booking
   */
  static createDraft(
    id: string,
    packageId: string,
    customerId: string,
    customerDetails: CustomerDetails,
    bookingDate: Date,
    yachtId?: string,
    timeSlot?: TimeSlot,
    producerId?: string
  ): Booking {
    return new Booking(
      id,
      packageId,
      BookingStatusType.DRAFT,
      customerId,
      customerDetails,
      bookingDate,
      [], // Empty items list initially
      new Date(),
      new Date(),
      yachtId,
      timeSlot,
      undefined, // No payment details yet
      undefined, // No notes yet
      CheckInStatusType.PENDING,
      undefined, // No confirmation code yet
      undefined, // Not cancelled
      undefined, // No cancellation reason
      producerId
    );
  }
}