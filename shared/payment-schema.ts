import { Timestamp } from 'firebase/firestore';

export type PaymentMethod = 'credit_card' | 'digital_wallet';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface CreditCardDetails {
  cardNumber: string;
  cardholderName: string;
  expiryDate: string;
  cvv: string;
}

export interface DigitalWalletDetails {
  provider: 'apple_pay' | 'google_pay' | 'paypal';
  accountEmail?: string;
}

export interface PaymentDetails {
  method: PaymentMethod;
  creditCardDetails?: CreditCardDetails;
  digitalWalletDetails?: DigitalWalletDetails;
}

export interface BookingPayment {
  paymentId: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionReference?: string;
  receiptUrl?: string;
  createdDate: Timestamp;
  lastUpdatedDate: Timestamp;
}

export interface BookingConfirmation {
  confirmationId: string;
  bookingId: string;
  userId: string;
  packageId: string;
  paymentId: string;
  confirmationDate: Timestamp;
  emailSent: boolean;
  notificationSent: boolean;
}