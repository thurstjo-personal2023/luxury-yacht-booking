/**
 * Payment Schema
 * 
 * This file defines the schemas and types for the payment and payout system
 */
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { clientNow } from './schema-helpers';

/**
 * User types for payout system
 */
export type UserType = 'producer' | 'partner' | 'admin';

/**
 * Payout methods supported by the platform
 */
export type PayoutMethod = 'paypal' | 'stripe' | 'bank_account' | 'crypto_wallet';

/**
 * Payout transaction statuses
 */
export type PayoutStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'on_hold';

/**
 * Payout dispute statuses
 */
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'canceled';

/**
 * Payout dispute reasons
 */
export type DisputeReason = 'incorrect_amount' | 'missing_payment' | 'processing_delay' | 'other';

/**
 * Payout schedule options
 */
export type PayoutSchedule = 'daily' | 'weekly' | 'biweekly' | 'monthly';

/**
 * Payout transaction model
 */
export interface PayoutTransaction {
  id: string;
  userId: string;
  userType: UserType;
  accountId: string;
  amount: number;
  currency: string;
  description: string;
  payoutMethod: PayoutMethod;
  status: PayoutStatus;
  notes?: string;
  bookingIds?: string[];
  paymentReference?: string;
  processorData?: Record<string, any>;
  createdAt: any; // Timestamp type
  processedAt?: any; // Timestamp type
  completedAt?: any; // Timestamp type
  updatedAt: any; // Timestamp type
}

/**
 * Payout account model
 */
export interface PayoutAccount {
  id: string;
  userId: string;
  userType: UserType;
  accountType: PayoutMethod;
  accountDetails: Record<string, any>;
  isVerified: boolean;
  isDefault: boolean;
  verificationNotes?: string;
  createdAt: any; // Timestamp type
  updatedAt: any; // Timestamp type
  verifiedAt?: any; // Timestamp type
}

/**
 * Payout settings model
 */
export interface PayoutSettings {
  id: string;
  minimumPayoutAmount: number;
  platformFeePercentage: number;
  automaticPayoutsEnabled: boolean;
  payoutMethods: PayoutMethod[];
  allowEarlyPayout: boolean;
  maxRetryAttempts: number;
  payoutSchedule: PayoutSchedule;
  withdrawalFee: number;
  supportContact: string;
  earlyPayoutFee: number;
  updatedAt: any; // Timestamp type
  updatedBy: string;
}

/**
 * Earnings summary model
 */
export interface EarningsSummary {
  id: string;
  userId: string;
  userType: UserType;
  periodStart: any; // Timestamp type
  periodEnd: any; // Timestamp type
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  availableBalance: number;
  currency: string;
  lastUpdated: any; // Timestamp type
}

/**
 * Payout dispute model
 */
export interface PayoutDispute {
  id: string;
  transactionId: string;
  userId: string;
  userType: UserType;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  supportingDocuments?: string[];
  adminNotes?: string;
  resolution?: string;
  createdAt: any; // Timestamp type
  updatedAt: any; // Timestamp type
  resolvedAt?: any; // Timestamp type
}

// Zod schemas for validation

/**
 * Payout Transaction Schema
 */
export const PayoutTransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userType: z.enum(['producer', 'partner', 'admin']),
  accountId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  description: z.string(),
  payoutMethod: z.enum(['paypal', 'stripe', 'bank_account', 'crypto_wallet']),
  status: z.enum(['pending', 'approved', 'processing', 'completed', 'rejected', 'on_hold']).default('pending'),
  notes: z.string().optional(),
  bookingIds: z.array(z.string()).optional(),
  paymentReference: z.string().optional(),
  processorData: z.record(z.any()).optional(),
  createdAt: z.any().default(() => clientNow()),
  processedAt: z.any().optional(),
  completedAt: z.any().optional(),
  updatedAt: z.any().default(() => clientNow()),
});

/**
 * Payout Account Schema
 */
export const PayoutAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userType: z.enum(['producer', 'partner', 'admin']),
  accountType: z.enum(['paypal', 'stripe', 'bank_account', 'crypto_wallet']),
  accountDetails: z.record(z.any()),
  isVerified: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  verificationNotes: z.string().optional(),
  createdAt: z.any().default(() => clientNow()),
  updatedAt: z.any().default(() => clientNow()),
  verifiedAt: z.any().optional(),
});

/**
 * Payout Settings Schema
 */
export const PayoutSettingsSchema = z.object({
  id: z.string().default('default'),
  minimumPayoutAmount: z.number().positive().default(50),
  platformFeePercentage: z.number().min(0).max(100).default(5),
  automaticPayoutsEnabled: z.boolean().default(true),
  payoutMethods: z.array(z.enum(['paypal', 'stripe', 'bank_account', 'crypto_wallet'])),
  allowEarlyPayout: z.boolean().default(true),
  maxRetryAttempts: z.number().int().nonnegative().default(3),
  payoutSchedule: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).default('weekly'),
  withdrawalFee: z.number().nonnegative().default(1),
  supportContact: z.string().email().default('payments@etoileyachts.com'),
  earlyPayoutFee: z.number().nonnegative().default(2),
  updatedAt: z.any().default(() => clientNow()),
  updatedBy: z.string(),
});

/**
 * Earnings Summary Schema
 */
export const EarningsSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  userType: z.enum(['producer', 'partner', 'admin']),
  periodStart: z.any(),
  periodEnd: z.any(),
  totalEarnings: z.number().nonnegative(),
  pendingPayouts: z.number().nonnegative(),
  completedPayouts: z.number().nonnegative(),
  availableBalance: z.number().nonnegative(),
  currency: z.string().default('USD'),
  lastUpdated: z.any().default(() => clientNow()),
});

/**
 * Payout Dispute Schema
 */
export const PayoutDisputeSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  userId: z.string(),
  userType: z.enum(['producer', 'partner', 'admin']),
  reason: z.enum(['incorrect_amount', 'missing_payment', 'processing_delay', 'other']),
  description: z.string(),
  status: z.enum(['open', 'under_review', 'resolved', 'canceled']).default('open'),
  supportingDocuments: z.array(z.string()).optional(),
  adminNotes: z.string().optional(),
  resolution: z.string().optional(),
  createdAt: z.any().default(() => clientNow()),
  updatedAt: z.any().default(() => clientNow()),
  resolvedAt: z.any().optional(),
});

// Insert schemas for creating new records
export const InsertPayoutTransactionSchema = PayoutTransactionSchema.omit({ id: true });
export const InsertPayoutAccountSchema = PayoutAccountSchema.omit({ id: true });
export const InsertPayoutDisputeSchema = PayoutDisputeSchema.omit({ id: true });

// Export type definitions
export type PayoutTransactionInput = z.infer<typeof InsertPayoutTransactionSchema>;
export type PayoutAccountInput = z.infer<typeof InsertPayoutAccountSchema>;
export type PayoutDisputeInput = z.infer<typeof InsertPayoutDisputeSchema>;
export type PayoutSettingsInput = z.infer<typeof PayoutSettingsSchema>;