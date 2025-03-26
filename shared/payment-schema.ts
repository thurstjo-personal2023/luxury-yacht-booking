import { Timestamp } from 'firebase/firestore';

export type PaymentMethod = 'credit_card' | 'digital_wallet';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type PayoutStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'on_hold';
export type PayoutMethod = 'bank_transfer' | 'paypal' | 'stripe' | 'manual';
export type UserType = 'producer' | 'partner';
export type PayoutFrequency = 'weekly' | 'biweekly' | 'monthly';

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

/**
 * PayoutAccount - Contains banking/payment information for Producers and Partners
 * Used for handling payouts to service providers
 */
export interface PayoutAccount {
  id: string;
  userId: string;
  userType: UserType;
  accountName: string;
  payoutMethod: PayoutMethod;
  currency: string;
  isActive: boolean;
  isVerified: boolean;
  verificationDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Method-specific details
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    routingNumber?: string;
    iban?: string;
    swiftCode?: string;
    bankAddress?: string;
  };
  paypalDetails?: {
    email: string;
  };
  stripeDetails?: {
    accountId: string;
    connectedAccountStatus: string;
  };
  preferredFrequency: PayoutFrequency;
  notes?: string;
}

/**
 * PayoutTransaction - Represents a single payout to a Producer or Partner
 * Tracks the complete lifecycle of a payout
 */
export interface PayoutTransaction {
  id: string;
  userId: string;
  userType: UserType;
  accountId: string; // Reference to PayoutAccount
  amount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  status: PayoutStatus;
  payoutMethod: PayoutMethod;
  reference?: string;
  description: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  createdAt: Timestamp;
  processedAt?: Timestamp;
  completedAt?: Timestamp;
  // For internal tracking
  adminId?: string; // ID of admin who approved/processed
  transactionDetails?: any; // Provider-specific transaction details
  notes?: string;
  // For reconciliation
  relatedBookings: string[]; // Array of booking IDs this payout covers
}

/**
 * EarningsSummary - Provides a summary of earnings for a Producer or Partner
 * Used for dashboard display and reporting
 */
export interface EarningsSummary {
  id: string;
  userId: string;
  userType: UserType;
  totalEarnings: number; // Lifetime earnings
  totalPaidOut: number; // Total amount paid out
  pendingBalance: number; // Current balance awaiting payout
  availableBalance: number; // Balance cleared for payout
  onHoldBalance: number; // Balance on hold due to disputes or verification
  currency: string;
  lastPayoutDate?: Timestamp;
  lastPayoutAmount?: number;
  lastUpdatedAt: Timestamp;
}

/**
 * PayoutSettings - Global settings for the payout system
 * Managed by platform administrators
 */
export interface PayoutSettings {
  id: string; // Usually a singleton like 'global'
  defaultPayoutFrequency: PayoutFrequency;
  minimumPayoutAmount: number;
  platformFeePercentage: number; // e.g., 10 for 10%
  automaticPayoutsEnabled: boolean;
  requireAdminApproval: boolean;
  payoutMethods: PayoutMethod[];
  supportedCurrencies: string[];
  updatedAt: Timestamp;
  updatedBy: string; // Admin ID
}

/**
 * PayoutDispute - Handles disputed payouts
 * Tracks resolution process for payout disagreements
 */
export interface PayoutDispute {
  id: string;
  payoutId: string;
  userId: string;
  userType: UserType;
  reason: string;
  status: 'open' | 'under_review' | 'resolved' | 'rejected';
  amount: number;
  currency: string;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
  resolvedBy?: string; // Admin ID
  resolution?: string;
  attachments?: string[]; // URLs to supporting documents
  notes?: string;
}