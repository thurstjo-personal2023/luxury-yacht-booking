/**
 * Payment Status Value Object
 * 
 * Represents the possible states of a payment in its lifecycle
 */

/**
 * Enumeration of possible payment statuses
 */
export enum PaymentStatusType {
  NOT_STARTED = 'not_started',   // Payment has not been initiated
  PENDING = 'pending',           // Payment initiated but not completed
  PROCESSING = 'processing',     // Payment is being processed
  AUTHORIZED = 'authorized',     // Payment authorized but not captured
  COMPLETED = 'completed',       // Payment successfully completed
  PARTIALLY_REFUNDED = 'partially_refunded', // Part of the payment has been refunded
  REFUNDED = 'refunded',         // Payment fully refunded
  FAILED = 'failed',             // Payment attempt failed
  CANCELLED = 'cancelled'        // Payment was cancelled
}

/**
 * Payment Status value object
 * Encapsulates the status of a payment and provides validation and business rules
 */
export class PaymentStatus {
  private _type: PaymentStatusType;
  
  constructor(type: PaymentStatusType) {
    this._type = type;
  }
  
  /**
   * Get the current status type
   */
  get type(): PaymentStatusType {
    return this._type;
  }
  
  /**
   * Check if this payment can be transitioned to a new status
   */
  canTransitionTo(newStatus: PaymentStatusType): boolean {
    // Define valid status transitions
    const validTransitions: Record<PaymentStatusType, PaymentStatusType[]> = {
      [PaymentStatusType.NOT_STARTED]: [
        PaymentStatusType.PENDING,
        PaymentStatusType.CANCELLED
      ],
      [PaymentStatusType.PENDING]: [
        PaymentStatusType.PROCESSING,
        PaymentStatusType.FAILED,
        PaymentStatusType.CANCELLED
      ],
      [PaymentStatusType.PROCESSING]: [
        PaymentStatusType.AUTHORIZED,
        PaymentStatusType.COMPLETED,
        PaymentStatusType.FAILED
      ],
      [PaymentStatusType.AUTHORIZED]: [
        PaymentStatusType.COMPLETED,
        PaymentStatusType.FAILED,
        PaymentStatusType.CANCELLED
      ],
      [PaymentStatusType.COMPLETED]: [
        PaymentStatusType.PARTIALLY_REFUNDED,
        PaymentStatusType.REFUNDED
      ],
      [PaymentStatusType.PARTIALLY_REFUNDED]: [
        PaymentStatusType.REFUNDED
      ],
      [PaymentStatusType.REFUNDED]: [],  // Terminal state
      [PaymentStatusType.FAILED]: [
        PaymentStatusType.PENDING,  // Can retry a failed payment
        PaymentStatusType.CANCELLED
      ],
      [PaymentStatusType.CANCELLED]: []  // Terminal state
    };
    
    return validTransitions[this._type].includes(newStatus);
  }
  
  /**
   * Transition to a new status if valid
   * @returns A new PaymentStatus object with the updated status
   * @throws Error if transition is invalid
   */
  transitionTo(newStatus: PaymentStatusType): PaymentStatus {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this._type} to ${newStatus}`
      );
    }
    
    return new PaymentStatus(newStatus);
  }
  
  /**
   * Check if the payment is in a final state
   */
  isFinal(): boolean {
    return (
      this._type === PaymentStatusType.COMPLETED ||
      this._type === PaymentStatusType.REFUNDED ||
      this._type === PaymentStatusType.CANCELLED
    );
  }
  
  /**
   * Check if the payment is in a successful state
   */
  isSuccessful(): boolean {
    return (
      this._type === PaymentStatusType.COMPLETED ||
      this._type === PaymentStatusType.PARTIALLY_REFUNDED
    );
  }
  
  /**
   * Check if the payment is refunded (partially or fully)
   */
  isRefunded(): boolean {
    return (
      this._type === PaymentStatusType.REFUNDED ||
      this._type === PaymentStatusType.PARTIALLY_REFUNDED
    );
  }
  
  /**
   * Check if the payment requires further action
   */
  requiresAction(): boolean {
    return (
      this._type === PaymentStatusType.PENDING ||
      this._type === PaymentStatusType.PROCESSING ||
      this._type === PaymentStatusType.AUTHORIZED
    );
  }
  
  /**
   * Get a user-friendly label for this status
   */
  getLabel(): string {
    const labels: Record<PaymentStatusType, string> = {
      [PaymentStatusType.NOT_STARTED]: 'Not Started',
      [PaymentStatusType.PENDING]: 'Pending',
      [PaymentStatusType.PROCESSING]: 'Processing',
      [PaymentStatusType.AUTHORIZED]: 'Authorized',
      [PaymentStatusType.COMPLETED]: 'Completed',
      [PaymentStatusType.PARTIALLY_REFUNDED]: 'Partially Refunded',
      [PaymentStatusType.REFUNDED]: 'Refunded',
      [PaymentStatusType.FAILED]: 'Failed',
      [PaymentStatusType.CANCELLED]: 'Cancelled'
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
   * Create a PaymentStatus from a string value
   */
  static fromString(value: string): PaymentStatus {
    if (!Object.values(PaymentStatusType).includes(value as PaymentStatusType)) {
      throw new Error(`Invalid payment status: ${value}`);
    }
    
    return new PaymentStatus(value as PaymentStatusType);
  }
}