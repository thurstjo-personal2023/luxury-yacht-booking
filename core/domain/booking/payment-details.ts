/**
 * Payment Details
 * 
 * Domain entities and value objects for payment processing.
 */

import { PaymentStatus } from './payment-status';

/**
 * Payment Intent
 * Represents a payment intent created by a payment provider
 */
export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

/**
 * Payment Result
 * Represents the result of a payment processing operation
 */
export interface PaymentResult {
  paymentIntentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
  processedAt: Date;
  error?: string;
}

/**
 * Payment Details
 * Value object for payment information stored with a booking
 */
export class PaymentDetails {
  private _method: string;
  private _status: PaymentStatus;
  private _amount: number;
  private _currency: string;
  private _transactionId?: string;
  private _processingDate?: Date;
  
  constructor(
    method: string,
    status: PaymentStatus,
    amount: number,
    currency: string,
    transactionId?: string,
    processingDate?: Date
  ) {
    this._method = method;
    this._status = status;
    this._amount = amount;
    this._currency = currency;
    this._transactionId = transactionId;
    this._processingDate = processingDate;
  }
  
  /**
   * Create PaymentDetails from a payment result
   */
  static fromPaymentResult(method: string, result: PaymentResult): PaymentDetails {
    return new PaymentDetails(
      method,
      result.status,
      result.amount,
      result.currency,
      result.paymentIntentId,
      result.processedAt
    );
  }
  
  /**
   * Create PaymentDetails from an object
   */
  static fromObject(data: any): PaymentDetails {
    return new PaymentDetails(
      data.method,
      data.status,
      data.amount,
      data.currency,
      data.transactionId,
      data.processingDate ? new Date(data.processingDate) : undefined
    );
  }
  
  // Getters
  get method(): string { return this._method; }
  get status(): PaymentStatus { return this._status; }
  get amount(): number { return this._amount; }
  get currency(): string { return this._currency; }
  get transactionId(): string | undefined { return this._transactionId; }
  get processingDate(): Date | undefined { return this._processingDate; }
  
  /**
   * Update payment status
   */
  updateStatus(status: PaymentStatus): void {
    this._status = status;
  }
  
  /**
   * Update transaction ID
   */
  updateTransactionId(transactionId: string): void {
    this._transactionId = transactionId;
  }
  
  /**
   * Update processing date
   */
  updateProcessingDate(date: Date): void {
    this._processingDate = date;
  }
  
  /**
   * Convert to plain object for storage
   */
  toObject(): any {
    return {
      method: this._method,
      status: this._status,
      amount: this._amount,
      currency: this._currency,
      transactionId: this._transactionId,
      processingDate: this._processingDate
    };
  }
}