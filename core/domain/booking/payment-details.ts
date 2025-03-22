/**
 * Payment Details Entity
 * 
 * Represents payment information for a booking
 */

import { PaymentStatus, PaymentStatusType } from './payment-status';

/**
 * Payment method types
 */
export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  DIGITAL_WALLET = 'digital_wallet'
}

/**
 * Digital wallet provider types
 */
export enum DigitalWalletProviderType {
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  PAYPAL = 'paypal'
}

/**
 * Credit card details
 */
export interface CreditCardInfo {
  lastFourDigits: string;           // Last four digits of card (for display)
  cardholderName: string;           // Name on card
  expiryMonth: string;              // Expiry month (MM)
  expiryYear: string;               // Expiry year (YYYY)
  brand: string;                    // Card brand (Visa, Mastercard, etc.)
}

/**
 * Digital wallet information
 */
export interface DigitalWalletInfo {
  provider: DigitalWalletProviderType;  // Wallet provider
  email?: string;                       // Associated email (if available)
  accountIdentifier?: string;           // Masked account identifier
}

/**
 * Payment method information
 */
export interface PaymentMethodInfo {
  type: PaymentMethodType;              // Payment method type
  creditCardInfo?: CreditCardInfo;      // Credit card details (if applicable)
  digitalWalletInfo?: DigitalWalletInfo; // Digital wallet details (if applicable)
}

/**
 * Payment Details entity
 */
export class PaymentDetails {
  private _id: string;
  private _bookingId: string;
  private _payerId: string;
  private _amount: number;
  private _currency: string;
  private _paymentMethod: PaymentMethodInfo;
  private _status: PaymentStatus;
  private _transactionReference?: string;
  private _receiptUrl?: string;
  private _errorMessage?: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  
  constructor(
    id: string,
    bookingId: string,
    payerId: string,
    amount: number,
    currency: string,
    paymentMethod: PaymentMethodInfo,
    status: PaymentStatus | PaymentStatusType,
    createdAt: Date,
    updatedAt: Date,
    transactionReference?: string,
    receiptUrl?: string,
    errorMessage?: string
  ) {
    this._id = id;
    this._bookingId = bookingId;
    this._payerId = payerId;
    this._amount = amount;
    this._currency = currency;
    this._paymentMethod = paymentMethod;
    this._status = status instanceof PaymentStatus ? status : new PaymentStatus(status);
    this._transactionReference = transactionReference;
    this._receiptUrl = receiptUrl;
    this._errorMessage = errorMessage;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    
    this.validate();
  }
  
  // Getters
  get id(): string { return this._id; }
  get bookingId(): string { return this._bookingId; }
  get payerId(): string { return this._payerId; }
  get amount(): number { return this._amount; }
  get currency(): string { return this._currency; }
  get paymentMethod(): PaymentMethodInfo { return this._paymentMethod; }
  get status(): PaymentStatus { return this._status; }
  get transactionReference(): string | undefined { return this._transactionReference; }
  get receiptUrl(): string | undefined { return this._receiptUrl; }
  get errorMessage(): string | undefined { return this._errorMessage; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  
  /**
   * Validate payment details
   */
  private validate(): void {
    if (!this._id) {
      throw new Error('Payment ID is required');
    }
    
    if (!this._bookingId) {
      throw new Error('Booking ID is required');
    }
    
    if (!this._payerId) {
      throw new Error('Payer ID is required');
    }
    
    if (this._amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }
    
    if (!this._currency) {
      throw new Error('Currency is required');
    }
    
    if (!this._paymentMethod) {
      throw new Error('Payment method is required');
    }
    
    // Validate payment method info based on type
    if (this._paymentMethod.type === PaymentMethodType.CREDIT_CARD && !this._paymentMethod.creditCardInfo) {
      throw new Error('Credit card information is required for credit card payments');
    }
    
    if (this._paymentMethod.type === PaymentMethodType.DIGITAL_WALLET && !this._paymentMethod.digitalWalletInfo) {
      throw new Error('Digital wallet information is required for digital wallet payments');
    }
  }
  
  /**
   * Update payment status
   */
  updateStatus(newStatus: PaymentStatusType): PaymentDetails {
    const updatedStatus = this._status.transitionTo(newStatus);
    
    return new PaymentDetails(
      this._id,
      this._bookingId,
      this._payerId,
      this._amount,
      this._currency,
      this._paymentMethod,
      updatedStatus,
      this._createdAt,
      new Date(),
      this._transactionReference,
      this._receiptUrl,
      this._errorMessage
    );
  }
  
  /**
   * Set transaction reference
   */
  setTransactionReference(reference: string): PaymentDetails {
    return new PaymentDetails(
      this._id,
      this._bookingId,
      this._payerId,
      this._amount,
      this._currency,
      this._paymentMethod,
      this._status,
      this._createdAt,
      new Date(),
      reference,
      this._receiptUrl,
      this._errorMessage
    );
  }
  
  /**
   * Set receipt URL
   */
  setReceiptUrl(url: string): PaymentDetails {
    return new PaymentDetails(
      this._id,
      this._bookingId,
      this._payerId,
      this._amount,
      this._currency,
      this._paymentMethod,
      this._status,
      this._createdAt,
      new Date(),
      this._transactionReference,
      url,
      this._errorMessage
    );
  }
  
  /**
   * Set error message
   */
  setErrorMessage(message: string): PaymentDetails {
    return new PaymentDetails(
      this._id,
      this._bookingId,
      this._payerId,
      this._amount,
      this._currency,
      this._paymentMethod,
      this._status,
      this._createdAt,
      new Date(),
      this._transactionReference,
      this._receiptUrl,
      message
    );
  }
  
  /**
   * Check if payment is successful
   */
  isSuccessful(): boolean {
    return this._status.isSuccessful();
  }
  
  /**
   * Check if payment is refunded
   */
  isRefunded(): boolean {
    return this._status.isRefunded();
  }
  
  /**
   * Check if payment requires further action
   */
  requiresAction(): boolean {
    return this._status.requiresAction();
  }
  
  /**
   * Create plain object representation for persistence
   */
  toObject(): Record<string, any> {
    return {
      id: this._id,
      bookingId: this._bookingId,
      payerId: this._payerId,
      amount: this._amount,
      currency: this._currency,
      paymentMethod: this._paymentMethod,
      status: this._status.toString(),
      transactionReference: this._transactionReference,
      receiptUrl: this._receiptUrl,
      errorMessage: this._errorMessage,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
  
  /**
   * Create PaymentDetails from a plain object
   */
  static fromObject(data: Record<string, any>): PaymentDetails {
    return new PaymentDetails(
      data.id,
      data.bookingId,
      data.payerId,
      data.amount,
      data.currency,
      data.paymentMethod,
      PaymentStatus.fromString(data.status),
      data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
      data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt),
      data.transactionReference,
      data.receiptUrl,
      data.errorMessage
    );
  }
}