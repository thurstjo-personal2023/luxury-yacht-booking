/**
 * Booking Status Value Object
 * 
 * Represents the possible states of a booking in its lifecycle
 */

/**
 * Enumeration of possible booking statuses
 */
export enum BookingStatusType {
  DRAFT = 'draft',             // Initial state when booking is being created
  PENDING = 'pending',         // Booking created but not yet confirmed (e.g. awaiting payment)
  CONFIRMED = 'confirmed',     // Booking has been confirmed (payment processed)
  CHECKED_IN = 'checked_in',   // Customer has checked in for their booking
  COMPLETED = 'completed',     // Booking has been fulfilled
  CANCELLED = 'cancelled',     // Booking was cancelled
  NO_SHOW = 'no_show'          // Customer did not show up
}

/**
 * Booking Status value object
 * Encapsulates the status of a booking and provides validation and business rules
 */
export class BookingStatus {
  private _type: BookingStatusType;
  
  constructor(type: BookingStatusType) {
    this._type = type;
  }
  
  /**
   * Get the current status type
   */
  get type(): BookingStatusType {
    return this._type;
  }
  
  /**
   * Check if this booking can be transitioned to a new status
   */
  canTransitionTo(newStatus: BookingStatusType): boolean {
    // Define valid status transitions
    const validTransitions: Record<BookingStatusType, BookingStatusType[]> = {
      [BookingStatusType.DRAFT]: [
        BookingStatusType.PENDING,
        BookingStatusType.CANCELLED
      ],
      [BookingStatusType.PENDING]: [
        BookingStatusType.CONFIRMED,
        BookingStatusType.CANCELLED
      ],
      [BookingStatusType.CONFIRMED]: [
        BookingStatusType.CHECKED_IN,
        BookingStatusType.NO_SHOW,
        BookingStatusType.CANCELLED,
        BookingStatusType.COMPLETED
      ],
      [BookingStatusType.CHECKED_IN]: [
        BookingStatusType.COMPLETED,
        BookingStatusType.CANCELLED
      ],
      [BookingStatusType.COMPLETED]: [],  // Terminal state, no further transitions
      [BookingStatusType.CANCELLED]: [],  // Terminal state, no further transitions
      [BookingStatusType.NO_SHOW]: [
        BookingStatusType.CANCELLED
      ]
    };
    
    return validTransitions[this._type].includes(newStatus);
  }
  
  /**
   * Transition to a new status if valid
   * @returns A new BookingStatus object with the updated status
   * @throws Error if transition is invalid
   */
  transitionTo(newStatus: BookingStatusType): BookingStatus {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this._type} to ${newStatus}`
      );
    }
    
    return new BookingStatus(newStatus);
  }
  
  /**
   * Check if the booking is in a final state
   */
  isFinal(): boolean {
    return (
      this._type === BookingStatusType.COMPLETED ||
      this._type === BookingStatusType.CANCELLED
    );
  }
  
  /**
   * Check if the booking is active (confirmed but not completed/cancelled)
   */
  isActive(): boolean {
    return (
      this._type === BookingStatusType.CONFIRMED ||
      this._type === BookingStatusType.CHECKED_IN
    );
  }
  
  /**
   * Check if the booking is pending confirmation
   */
  isPending(): boolean {
    return (
      this._type === BookingStatusType.PENDING ||
      this._type === BookingStatusType.DRAFT
    );
  }
  
  /**
   * Get a user-friendly label for this status
   */
  getLabel(): string {
    const labels: Record<BookingStatusType, string> = {
      [BookingStatusType.DRAFT]: 'Draft',
      [BookingStatusType.PENDING]: 'Pending',
      [BookingStatusType.CONFIRMED]: 'Confirmed',
      [BookingStatusType.CHECKED_IN]: 'Checked In',
      [BookingStatusType.COMPLETED]: 'Completed',
      [BookingStatusType.CANCELLED]: 'Cancelled',
      [BookingStatusType.NO_SHOW]: 'No Show'
    };
    
    return labels[this._type];
  }
  
  /**
   * Convert to a primitive string for storage
   */
  toString(): string {
    return this._type;
  }
  
  /**
   * Create a BookingStatus from a string value
   */
  static fromString(value: string): BookingStatus {
    if (!Object.values(BookingStatusType).includes(value as BookingStatusType)) {
      throw new Error(`Invalid booking status: ${value}`);
    }
    
    return new BookingStatus(value as BookingStatusType);
  }
}