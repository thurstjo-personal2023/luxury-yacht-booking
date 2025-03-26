/**
 * Payout Service
 * 
 * This service handles payout management for Producers and Partners.
 * It includes functionality for:
 * - Creating and managing payout accounts
 * - Processing payout transactions
 * - Calculating earnings and fees
 * - Managing payout settings
 * - Handling payout disputes
 */
import { adminDb } from '../firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// For type compatibility between admin-side and client-side Timestamps
// We create utility functions that handle the conversion appropriately
// This solves the type mismatch between firebase-admin/firestore and firebase/firestore Timestamps

/**
 * Converts a server-side admin Timestamp to a client-compatible Timestamp
 * Use this when returning data to clients or storing to Firestore
 * 
 * @param adminTimestamp Firebase Admin Timestamp
 * @returns Client-compatible Timestamp (as type assertion)
 */
function toClientTimestamp(adminTimestamp: FirebaseFirestore.Timestamp): Timestamp {
  // At runtime, the Timestamps are compatible, but TypeScript needs this assertion
  return adminTimestamp as unknown as Timestamp;
}

/**
 * Creates a new admin Timestamp that's compatible with client schema
 * 
 * @returns Client-compatible now Timestamp
 */
function clientNow(): Timestamp {
  return toClientTimestamp(Timestamp.now());
}

/**
 * Converts a Date to a client-compatible Timestamp
 * 
 * @param date JavaScript Date object
 * @returns Client-compatible Timestamp
 */
function dateToClientTimestamp(date: Date): Timestamp {
  return toClientTimestamp(Timestamp.fromDate(date));
}
import { 
  PayoutAccount,
  PayoutTransaction,
  EarningsSummary,
  PayoutSettings,
  PayoutDispute,
  PayoutStatus,
  UserType
} from '../../shared/payment-schema';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../vite';

export class PayoutService {
  private db = adminDb;
  
  // Collection references
  private payoutAccountsCollection = this.db.collection('payout_accounts');
  private payoutTransactionsCollection = this.db.collection('payout_transactions');
  private earningsSummariesCollection = this.db.collection('earnings_summaries');
  private payoutSettingsCollection = this.db.collection('payout_settings');
  private payoutDisputesCollection = this.db.collection('payout_disputes');
  private bookingPaymentsCollection = this.db.collection('booking_payments');
  
  constructor() {
    log('PayoutService initialized');
  }
  
  /**
   * Get global payout settings
   */
  async getPayoutSettings(): Promise<PayoutSettings | null> {
    try {
      const settingsDoc = await this.payoutSettingsCollection.doc('global').get();
      
      if (!settingsDoc.exists) {
        return null;
      }
      
      return settingsDoc.data() as PayoutSettings;
    } catch (error) {
      console.error('Error getting payout settings:', error);
      throw new Error('Failed to retrieve payout settings');
    }
  }
  
  /**
   * Update global payout settings
   */
  async updatePayoutSettings(
    settings: Partial<PayoutSettings>,
    adminId: string
  ): Promise<void> {
    try {
      const settingsRef = this.payoutSettingsCollection.doc('global');
      const currentSettings = await settingsRef.get();
      
      if (!currentSettings.exists) {
        // Create initial settings if they don't exist
        await settingsRef.set({
          id: 'global',
          defaultPayoutFrequency: 'monthly',
          minimumPayoutAmount: 100,
          platformFeePercentage: 10,
          automaticPayoutsEnabled: false,
          requireAdminApproval: true,
          payoutMethods: ['bank_transfer', 'paypal'],
          supportedCurrencies: ['USD', 'AED'],
          updatedAt: clientNow(),
          updatedBy: adminId,
          ...settings
        });
      } else {
        // Update existing settings
        await settingsRef.update({
          ...settings,
          updatedAt: clientNow(),
          updatedBy: adminId
        });
      }
    } catch (error) {
      console.error('Error updating payout settings:', error);
      throw new Error('Failed to update payout settings');
    }
  }
  
  /**
   * Get payout account for a specific user
   */
  async getPayoutAccount(userId: string): Promise<PayoutAccount | null> {
    try {
      const accountsSnapshot = await this.payoutAccountsCollection
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .limit(1)
        .get();
      
      if (accountsSnapshot.empty) {
        return null;
      }
      
      return accountsSnapshot.docs[0].data() as PayoutAccount;
    } catch (error) {
      console.error('Error getting payout account:', error);
      throw new Error('Failed to retrieve payout account');
    }
  }
  
  /**
   * Create or update a payout account
   */
  async createOrUpdatePayoutAccount(account: Partial<PayoutAccount>): Promise<string> {
    try {
      let accountId = account.id;
      const now = clientNow();
      
      if (!accountId) {
        // Creating a new account
        accountId = `account-${uuidv4()}`;
        
        const newAccount: PayoutAccount = {
          id: accountId,
          userId: account.userId!,
          userType: account.userType!,
          accountName: account.accountName!,
          payoutMethod: account.payoutMethod!,
          currency: account.currency || 'USD',
          isActive: true,
          isVerified: false,
          createdAt: now,
          updatedAt: now,
          preferredFrequency: account.preferredFrequency || 'monthly',
          ...account
        };
        
        await this.payoutAccountsCollection.doc(accountId).set(newAccount);
        
        // Initialize earnings summary for new account
        await this.initializeEarningsSummary(account.userId!, account.userType!);
      } else {
        // Updating existing account
        const updates = {
          ...account,
          updatedAt: now
        };
        
        await this.payoutAccountsCollection.doc(accountId).update(updates);
      }
      
      return accountId;
    } catch (error) {
      console.error('Error creating/updating payout account:', error);
      throw new Error('Failed to save payout account');
    }
  }
  
  /**
   * Initialize earnings summary for a new user
   */
  private async initializeEarningsSummary(userId: string, userType: UserType): Promise<void> {
    const summaryId = `earnings-${userId}`;
    const now = clientNow();
    
    const summary: EarningsSummary = {
      id: summaryId,
      userId,
      userType,
      totalEarnings: 0,
      totalPaidOut: 0,
      pendingBalance: 0,
      availableBalance: 0,
      onHoldBalance: 0,
      currency: 'USD',
      lastUpdatedAt: now
    };
    
    await this.earningsSummariesCollection.doc(summaryId).set(summary);
  }
  
  /**
   * Get earnings summary for a specific user
   */
  async getEarningsSummary(userId: string): Promise<EarningsSummary | null> {
    try {
      const summaryDoc = await this.earningsSummariesCollection.doc(`earnings-${userId}`).get();
      
      if (!summaryDoc.exists) {
        return null;
      }
      
      return summaryDoc.data() as EarningsSummary;
    } catch (error) {
      console.error('Error getting earnings summary:', error);
      throw new Error('Failed to retrieve earnings summary');
    }
  }
  
  /**
   * Calculate earnings from completed bookings
   * This should be called periodically to update earnings records
   */
  async calculateEarnings(userId: string, userType: UserType): Promise<void> {
    try {
      // Get completed payments for this user's services
      const paymentsSnapshot = await this.bookingPaymentsCollection
        .where(userType === 'producer' ? 'producerId' : 'partnerId', '==', userId)
        .where('status', '==', 'completed')
        .get();
      
      if (paymentsSnapshot.empty) {
        return;
      }
      
      const settings = await this.getPayoutSettings();
      if (!settings) {
        throw new Error('Payout settings not found');
      }
      
      // Get current earnings summary
      const summaryRef = this.earningsSummariesCollection.doc(`earnings-${userId}`);
      const summaryDoc = await summaryRef.get();
      
      if (!summaryDoc.exists) {
        await this.initializeEarningsSummary(userId, userType);
      }
      
      let totalNewEarnings = 0;
      const bookingsProcessed: string[] = [];
      
      // Process each payment
      paymentsSnapshot.docs.forEach(doc => {
        const payment = doc.data();
        
        // Skip already processed bookings
        if (payment.earningsProcessed) return;
        
        // Calculate provider's earnings after platform fee
        const platformFeeAmount = (payment.amount * settings.platformFeePercentage) / 100;
        const earningsAmount = payment.amount - platformFeeAmount;
        
        totalNewEarnings += earningsAmount;
        bookingsProcessed.push(payment.bookingId);
      });
      
      if (totalNewEarnings > 0) {
        // Update earnings summary
        await summaryRef.update({
          totalEarnings: FieldValue.increment(totalNewEarnings),
          availableBalance: FieldValue.increment(totalNewEarnings),
          lastUpdatedAt: clientNow()
        });
        
        // Mark bookings as processed for earnings
        for (const bookingId of bookingsProcessed) {
          await this.bookingPaymentsCollection
            .where('bookingId', '==', bookingId)
            .get()
            .then(snapshot => {
              if (!snapshot.empty) {
                snapshot.docs[0].ref.update({ earningsProcessed: true });
              }
            });
        }
      }
    } catch (error) {
      console.error('Error calculating earnings:', error);
      throw new Error('Failed to calculate earnings');
    }
  }
  
  /**
   * Create a new payout transaction
   */
  async createPayoutTransaction(
    payout: Partial<PayoutTransaction>,
    adminId?: string
  ): Promise<string> {
    try {
      const payoutId = `payout-${uuidv4()}`;
      const now = Timestamp.now();
      
      // Get payout settings
      const settings = await this.getPayoutSettings();
      if (!settings) {
        throw new Error('Payout settings not found');
      }
      
      // Get user's payout account
      const account = await this.getPayoutAccount(payout.userId!);
      if (!account) {
        throw new Error('Payout account not found');
      }
      
      // Calculate platform fee if not provided
      const amount = payout.amount || 0;
      let platformFee = payout.platformFee;
      let netAmount = payout.netAmount;
      
      if (!platformFee) {
        platformFee = (amount * settings.platformFeePercentage) / 100;
      }
      
      if (!netAmount) {
        netAmount = amount - platformFee;
      }
      
      // Create transaction object
      const transaction: PayoutTransaction = {
        id: payoutId,
        userId: payout.userId!,
        userType: payout.userType!,
        accountId: account.id,
        amount,
        platformFee,
        netAmount,
        currency: payout.currency || account.currency,
        status: settings.requireAdminApproval ? 'pending' : 'approved',
        payoutMethod: account.payoutMethod,
        description: payout.description || `Payout for ${payout.userId}`,
        periodStart: payout.periodStart || now,
        periodEnd: payout.periodEnd || now,
        createdAt: now,
        adminId,
        relatedBookings: payout.relatedBookings || [],
        ...payout
      };
      
      await this.payoutTransactionsCollection.doc(payoutId).set(transaction);
      
      // Update earnings summary
      const summaryRef = this.earningsSummariesCollection.doc(`earnings-${payout.userId}`);
      
      await summaryRef.update({
        availableBalance: FieldValue.increment(-amount),
        pendingBalance: FieldValue.increment(amount),
        lastUpdatedAt: now
      });
      
      return payoutId;
    } catch (error) {
      console.error('Error creating payout transaction:', error);
      throw new Error('Failed to create payout transaction');
    }
  }
  
  /**
   * Update payout transaction status
   */
  async updatePayoutStatus(
    payoutId: string,
    status: PayoutStatus,
    adminId: string,
    notes?: string
  ): Promise<void> {
    try {
      const payoutRef = this.payoutTransactionsCollection.doc(payoutId);
      const payoutDoc = await payoutRef.get();
      
      if (!payoutDoc.exists) {
        throw new Error('Payout transaction not found');
      }
      
      const payout = payoutDoc.data() as PayoutTransaction;
      const now = Timestamp.now();
      const updates: any = {
        status,
        adminId,
        notes: notes || payout.notes
      };
      
      // Add timestamps based on status
      if (status === 'processing') {
        updates.processedAt = now;
      } else if (status === 'completed') {
        updates.completedAt = now;
      }
      
      await payoutRef.update(updates);
      
      // Update earnings summary based on status change
      const summaryRef = this.earningsSummariesCollection.doc(`earnings-${payout.userId}`);
      
      if (status === 'completed') {
        // Move from pending to paid
        await summaryRef.update({
          pendingBalance: FieldValue.increment(-payout.amount),
          totalPaidOut: FieldValue.increment(payout.amount),
          lastPayoutDate: now,
          lastPayoutAmount: payout.amount,
          lastUpdatedAt: now
        });
      } else if (status === 'rejected' || status === 'on_hold') {
        // Return to available balance
        await summaryRef.update({
          pendingBalance: FieldValue.increment(-payout.amount),
          availableBalance: FieldValue.increment(payout.amount),
          lastUpdatedAt: now
        });
        
        if (status === 'on_hold') {
          // Additional updates for on-hold status
          await summaryRef.update({
            availableBalance: FieldValue.increment(-payout.amount),
            onHoldBalance: FieldValue.increment(payout.amount)
          });
        }
      }
    } catch (error) {
      console.error('Error updating payout status:', error);
      throw new Error('Failed to update payout status');
    }
  }
  
  /**
   * Get all payout transactions with optional filtering
   */
  async getPayoutTransactions(
    filters: {
      userId?: string;
      status?: PayoutStatus;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    } = {}
  ): Promise<PayoutTransaction[]> {
    try {
      let query: any = this.payoutTransactionsCollection;
      
      // Apply filters
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      
      if (filters.fromDate) {
        query = query.where('createdAt', '>=', Timestamp.fromDate(filters.fromDate));
      }
      
      if (filters.toDate) {
        query = query.where('createdAt', '<=', Timestamp.fromDate(filters.toDate));
      }
      
      // Apply sorting
      query = query.orderBy('createdAt', 'desc');
      
      // Apply limit
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      const snapshot = await query.get();
      
      return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as PayoutTransaction);
    } catch (error) {
      console.error('Error getting payout transactions:', error);
      throw new Error('Failed to retrieve payout transactions');
    }
  }
  
  /**
   * Get a single payout transaction
   */
  async getPayoutTransaction(payoutId: string): Promise<PayoutTransaction | null> {
    try {
      const payoutDoc = await this.payoutTransactionsCollection.doc(payoutId).get();
      
      if (!payoutDoc.exists) {
        return null;
      }
      
      return payoutDoc.data() as PayoutTransaction;
    } catch (error) {
      console.error('Error getting payout transaction:', error);
      throw new Error('Failed to retrieve payout transaction');
    }
  }
  
  /**
   * Create a payout dispute
   */
  async createPayoutDispute(
    payoutId: string,
    reason: string,
    userId: string,
    userType: UserType
  ): Promise<string> {
    try {
      const payout = await this.getPayoutTransaction(payoutId);
      
      if (!payout) {
        throw new Error('Payout transaction not found');
      }
      
      if (payout.userId !== userId) {
        throw new Error('User is not authorized to dispute this payout');
      }
      
      const disputeId = `dispute-${uuidv4()}`;
      const now = Timestamp.now();
      
      const dispute: PayoutDispute = {
        id: disputeId,
        payoutId,
        userId,
        userType,
        reason,
        status: 'open',
        amount: payout.amount,
        currency: payout.currency,
        createdAt: now
      };
      
      await this.payoutDisputesCollection.doc(disputeId).set(dispute);
      
      // Update payout status
      await this.payoutTransactionsCollection.doc(payoutId).update({
        status: 'on_hold',
        notes: `Dispute opened: ${reason}`
      });
      
      return disputeId;
    } catch (error) {
      console.error('Error creating payout dispute:', error);
      throw new Error('Failed to create payout dispute');
    }
  }
  
  /**
   * Get all payout disputes with optional filtering
   */
  async getPayoutDisputes(
    filters: {
      userId?: string;
      status?: string;
      limit?: number;
    } = {}
  ): Promise<PayoutDispute[]> {
    try {
      let query: any = this.payoutDisputesCollection;
      
      // Apply filters
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      
      // Apply sorting
      query = query.orderBy('createdAt', 'desc');
      
      // Apply limit
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      const snapshot = await query.get();
      
      return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as PayoutDispute);
    } catch (error) {
      console.error('Error getting payout disputes:', error);
      throw new Error('Failed to retrieve payout disputes');
    }
  }
  
  /**
   * Resolve a payout dispute
   */
  async resolvePayoutDispute(
    disputeId: string,
    resolution: string,
    status: 'resolved' | 'rejected',
    adminId: string
  ): Promise<void> {
    try {
      const disputeRef = this.payoutDisputesCollection.doc(disputeId);
      const disputeDoc = await disputeRef.get();
      
      if (!disputeDoc.exists) {
        throw new Error('Payout dispute not found');
      }
      
      const dispute = disputeDoc.data() as PayoutDispute;
      const now = Timestamp.now();
      
      await disputeRef.update({
        status,
        resolution,
        resolvedAt: now,
        resolvedBy: adminId
      });
      
      // Update related payout based on resolution
      const payoutStatus = status === 'resolved' ? 'approved' : 'rejected';
      await this.updatePayoutStatus(
        dispute.payoutId,
        payoutStatus,
        adminId,
        `Dispute ${status}: ${resolution}`
      );
      
      // Update earnings summary
      const summaryRef = this.earningsSummariesCollection.doc(`earnings-${dispute.userId}`);
      
      // Move from on-hold to appropriate status
      await summaryRef.update({
        onHoldBalance: FieldValue.increment(-dispute.amount),
        [status === 'resolved' ? 'pendingBalance' : 'availableBalance']: FieldValue.increment(dispute.amount),
        lastUpdatedAt: now
      });
    } catch (error) {
      console.error('Error resolving payout dispute:', error);
      throw new Error('Failed to resolve payout dispute');
    }
  }
}