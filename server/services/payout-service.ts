/**
 * Payout Service
 * 
 * This service handles payout-related operations including transaction management,
 * account management, and earning calculations for the platform.
 */
import { adminDb } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { 
  PayoutAccount, 
  PayoutTransaction, 
  PayoutDispute, 
  EarningsSummary,
  PayoutSettings,
  PayoutStatus,
  DisputeStatus
} from '../../shared/payment-schema';
import { clientNow, toClientDate } from '../../shared/schema-helpers';
import { v4 as uuidv4 } from 'uuid';

// Types needed for the service
type PayoutTransactionType = 'regular' | 'refund' | 'early_payout';
type PayoutDisputeStatus = DisputeStatus;

// Helper function to convert account timestamps
function convertPayoutAccountTimestamps(account: any): PayoutAccount {
  if (!account) return account;
  
  return {
    ...account,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    verifiedAt: account.verifiedAt || null,
    // Add missing properties with default values
    isDefault: account.isDefault || false,
    isVerified: account.isVerified || false,
  };
}

// Helper function to convert transaction timestamps
function convertPayoutTransactionTimestamps(transaction: any): PayoutTransaction {
  if (!transaction) return transaction;
  
  return {
    ...transaction,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    processedAt: transaction.processedAt || null,
    completedAt: transaction.completedAt || null
  };
}

// Helper function to convert dispute timestamps
function convertPayoutDisputeTimestamps(dispute: any): PayoutDispute {
  if (!dispute) return dispute;
  
  return {
    ...dispute,
    createdAt: dispute.createdAt,
    updatedAt: dispute.updatedAt,
    resolvedAt: dispute.resolvedAt || null
  };
}

// Helper function to convert earnings summary timestamps
function convertEarningsSummaryTimestamps(summary: any): EarningsSummary {
  if (!summary) return summary;
  
  return {
    ...summary,
    periodStart: summary.periodStart,
    periodEnd: summary.periodEnd,
    lastUpdated: summary.lastUpdated
  };
}

// Helper function to convert payout settings timestamps
function convertPayoutSettingsTimestamps(settings: any): PayoutSettings {
  if (!settings) return settings;
  
  return {
    ...settings,
    updatedAt: settings.updatedAt
  };
}

/**
 * Payout Service class
 */
export class PayoutService {
  // Collection references
  private payoutAccountsCollection = adminDb.collection('payout_accounts');
  private payoutTransactionsCollection = adminDb.collection('payout_transactions');
  private payoutDisputesCollection = adminDb.collection('payout_disputes');
  private earningsSummariesCollection = adminDb.collection('earnings_summaries');
  private payoutSettingsCollection = adminDb.collection('payout_settings');

  /**
   * Constructor
   */
  constructor() {
    // Initialize default payout settings if not existing
    this.initializePayoutSettings();
  }

  /**
   * Initialize default payout settings if they don't exist
   */
  private async initializePayoutSettings() {
    try {
      const settingsQuery = await this.payoutSettingsCollection.where('isDefault', '==', true).limit(1).get();
      
      if (settingsQuery.empty) {
        // Create default payout settings
        await this.payoutSettingsCollection.add({
          id: uuidv4(),
          defaultPayoutFrequency: 'weekly',
          minimumPayoutAmount: 100,
          platformFeePercentage: 5,
          automaticPayoutsEnabled: true,
          requireAdminApproval: true,
          payoutMethods: ['bank_account', 'paypal', 'stripe'],
          supportedCurrencies: ['USD', 'EUR', 'AED'],
          allowEarlyPayout: true,
          earlyPayoutFeePercentage: 1.5,
          maxRetryAttempts: 3,
          payoutProcessingDay: 5,
          updatedBy: 'system',
          isDefault: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error initializing payout settings:', error);
    }
  }

  /**
   * Get payout settings
   */
  async getPayoutSettings(): Promise<PayoutSettings | null> {
    try {
      const settingsQuery = await this.payoutSettingsCollection.where('isDefault', '==', true).limit(1).get();
      
      if (settingsQuery.empty) {
        return null;
      }
      
      const settingsDoc = settingsQuery.docs[0];
      return convertPayoutSettingsTimestamps({
        id: settingsDoc.id,
        ...settingsDoc.data()
      });
    } catch (error) {
      console.error('Error getting payout settings:', error);
      return null;
    }
  }

  /**
   * Update payout settings
   */
  async updatePayoutSettings(settings: Partial<PayoutSettings>, adminUserId: string = 'system'): Promise<PayoutSettings | null> {
    try {
      const currentSettings = await this.getPayoutSettings();
      
      if (!currentSettings) {
        throw new Error('Payout settings not found');
      }
      
      const settingsRef = this.payoutSettingsCollection.doc(currentSettings.id);
      
      await settingsRef.update({
        ...settings,
        updatedBy: adminUserId,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Get the updated settings
      const updatedDoc = await settingsRef.get();
      return convertPayoutSettingsTimestamps({
        id: updatedDoc.id,
        ...updatedDoc.data()
      });
    } catch (error) {
      console.error('Error updating payout settings:', error);
      return null;
    }
  }

  /**
   * Get a payout account by ID
   */
  async getPayoutAccount(accountId: string): Promise<PayoutAccount | null> {
    try {
      const accountDoc = await this.payoutAccountsCollection.doc(accountId).get();
      
      if (!accountDoc.exists) {
        return null;
      }
      
      return convertPayoutAccountTimestamps({
        id: accountDoc.id,
        ...accountDoc.data()
      });
    } catch (error) {
      console.error('Error getting payout account:', error);
      return null;
    }
  }

  /**
   * Get all payout accounts
   */
  async getAllPayoutAccounts(): Promise<PayoutAccount[]> {
    try {
      const accountsQuery = await this.payoutAccountsCollection.get();
      
      return accountsQuery.docs.map(doc => convertPayoutAccountTimestamps({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting all payout accounts:', error);
      return [];
    }
  }

  /**
   * Get payout accounts for a specific user
   */
  async getUserPayoutAccounts(userId: string): Promise<PayoutAccount[]> {
    try {
      const accountsQuery = await this.payoutAccountsCollection
        .where('userId', '==', userId)
        .get();
      
      return accountsQuery.docs.map(doc => convertPayoutAccountTimestamps({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user payout accounts:', error);
      return [];
    }
  }

  /**
   * Create a new payout account
   */
  async createPayoutAccount(accountData: Omit<PayoutAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<PayoutAccount | null> {
    try {
      // Generate a new ID
      const accountId = uuidv4();
      
      // Create the account document
      const accountDoc = {
        ...accountData,
        id: accountId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
      
      // Add to Firestore
      await this.payoutAccountsCollection.doc(accountId).set(accountDoc);
      
      // Return the created account
      return this.getPayoutAccount(accountId);
    } catch (error) {
      console.error('Error creating payout account:', error);
      return null;
    }
  }

  /**
   * Update a payout account
   */
  async updatePayoutAccount(accountId: string, accountData: Partial<PayoutAccount>): Promise<PayoutAccount | null> {
    try {
      const accountRef = this.payoutAccountsCollection.doc(accountId);
      
      await accountRef.update({
        ...accountData,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      return this.getPayoutAccount(accountId);
    } catch (error) {
      console.error('Error updating payout account:', error);
      return null;
    }
  }

  /**
   * Update account verification status
   */
  async updateAccountVerificationStatus(accountId: string, isVerified: boolean, notes?: string, adminUserId: string = 'system'): Promise<PayoutAccount | null> {
    try {
      const accountRef = this.payoutAccountsCollection.doc(accountId);
      
      const updates: any = {
        isVerified,
        updatedAt: FieldValue.serverTimestamp()
      };
      
      if (isVerified) {
        updates.verificationDate = FieldValue.serverTimestamp();
        updates.verifiedBy = adminUserId;
      }
      
      if (notes) {
        updates.notes = notes;
      }
      
      await accountRef.update(updates);
      
      return this.getPayoutAccount(accountId);
    } catch (error) {
      console.error('Error updating account verification status:', error);
      return null;
    }
  }

  /**
   * Get a transaction by ID
   */
  async getTransaction(transactionId: string): Promise<PayoutTransaction | null> {
    try {
      const transactionDoc = await this.payoutTransactionsCollection.doc(transactionId).get();
      
      if (!transactionDoc.exists) {
        return null;
      }
      
      return convertPayoutTransactionTimestamps({
        id: transactionDoc.id,
        ...transactionDoc.data()
      });
    } catch (error) {
      console.error('Error getting transaction:', error);
      return null;
    }
  }

  /**
   * Get payout transactions with optional filtering
   */
  async getPayoutTransactions(
    filters?: { 
      status?: PayoutStatus, 
      payeeId?: string,
      startDate?: Date,
      endDate?: Date
    },
    limit?: number
  ): Promise<PayoutTransaction[]> {
    try {
      let query = this.payoutTransactionsCollection as any;
      
      // Apply filters if provided
      if (filters) {
        if (filters.status) {
          query = query.where('status', '==', filters.status);
        }
        
        if (filters.payeeId) {
          query = query.where('userId', '==', filters.payeeId);
        }
        
        // Date range filtering - requires composite indexes in Firestore
        if (filters.startDate) {
          query = query.where('createdAt', '>=', filters.startDate);
        }
        
        if (filters.endDate) {
          query = query.where('createdAt', '<=', filters.endDate);
        }
      }
      
      // Order by creation date (newest first) and apply limit if provided
      query = query.orderBy('createdAt', 'desc');
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const transactionsQuery = await query.get();
      
      return transactionsQuery.docs.map((doc: any) => convertPayoutTransactionTimestamps({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting payout transactions:', error);
      return [];
    }
  }

  /**
   * Create a new payout transaction
   */
  async createPayoutTransaction(transactionData: {
    payeeId: string,
    payeeType: 'producer' | 'partner',
    accountId: string,
    amount: number,
    currency: string,
    description: string,
    notes?: string,
    metadata?: Record<string, string>
  }): Promise<PayoutTransaction | null> {
    try {
      // Verify the payout account exists and is valid
      const account = await this.getPayoutAccount(transactionData.accountId);
      
      if (!account) {
        throw new Error('Payout account not found');
      }
      
      if (account.isVerified === false) {
        throw new Error('Payout account is not verified');
      }
      
      // Generate a transaction ID
      const transactionId = uuidv4();
      
      // Create the transaction record
      const transaction: any = {
        id: transactionId,
        userId: transactionData.payeeId,
        userType: transactionData.payeeType,
        accountId: transactionData.accountId,
        status: 'pending' as PayoutStatus,
        amount: transactionData.amount,
        currency: transactionData.currency,
        description: transactionData.description,
        transactionType: 'regular' as PayoutTransactionType,
        retryCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
      
      // Add optional fields if provided
      if (transactionData.notes) {
        transaction.notes = transactionData.notes;
      }
      
      if (transactionData.metadata) {
        transaction.metadata = transactionData.metadata;
      }
      
      // Add to Firestore
      await this.payoutTransactionsCollection.doc(transactionId).set(transaction);
      
      // Return the created transaction
      return this.getTransaction(transactionId);
    } catch (error) {
      console.error('Error creating payout transaction:', error);
      return null;
    }
  }

  /**
   * Update a transaction status
   */
  async updateTransactionStatus(
    transactionId: string, 
    status: PayoutStatus, 
    notes?: string,
    metadata?: Record<string, string>
  ): Promise<PayoutTransaction | null> {
    try {
      const transaction = await this.getTransaction(transactionId);
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      const updates: any = {
        status,
        updatedAt: FieldValue.serverTimestamp()
      };
      
      // Set appropriate timestamp fields based on status
      if (status === 'processing' && !transaction.processedAt) {
        updates.processedAt = FieldValue.serverTimestamp();
      }
      
      if (status === 'completed' && !transaction.completedAt) {
        updates.completedAt = FieldValue.serverTimestamp();
      }
      
      // Add notes if provided
      if (notes) {
        updates.notes = notes;
      }
      
      // Add metadata if provided
      if (metadata) {
        updates.metadata = metadata;
      }
      
      // Update the transaction
      await this.payoutTransactionsCollection.doc(transactionId).update(updates);
      
      // Return the updated transaction
      return this.getTransaction(transactionId);
    } catch (error) {
      console.error('Error updating transaction status:', error);
      return null;
    }
  }

  /**
   * Get a dispute by ID
   */
  async getDispute(disputeId: string): Promise<PayoutDispute | null> {
    try {
      const disputeDoc = await this.payoutDisputesCollection.doc(disputeId).get();
      
      if (!disputeDoc.exists) {
        return null;
      }
      
      return convertPayoutDisputeTimestamps({
        id: disputeDoc.id,
        ...disputeDoc.data()
      });
    } catch (error) {
      console.error('Error getting dispute:', error);
      return null;
    }
  }

  /**
   * Get payout disputes with optional filtering
   */
  async getPayoutDisputes(
    filters?: { 
      status?: PayoutDisputeStatus, 
      userId?: string
    }
  ): Promise<PayoutDispute[]> {
    try {
      let query = this.payoutDisputesCollection as any;
      
      // Apply filters if provided
      if (filters) {
        if (filters.status) {
          query = query.where('status', '==', filters.status);
        }
        
        if (filters.userId) {
          query = query.where('userId', '==', filters.userId);
        }
      }
      
      // Order by creation date (newest first)
      query = query.orderBy('createdAt', 'desc');
      
      const disputesQuery = await query.get();
      
      return disputesQuery.docs.map((doc: any) => convertPayoutDisputeTimestamps({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting payout disputes:', error);
      return [];
    }
  }

  /**
   * Create a new payout dispute
   */
  async createPayoutDispute(disputeData: Omit<PayoutDispute, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<PayoutDispute | null> {
    try {
      // Verify the transaction exists
      const transaction = await this.getTransaction(disputeData.transactionId);
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      // Generate a dispute ID
      const disputeId = uuidv4();
      
      // Create the dispute record
      const dispute = {
        ...disputeData,
        id: disputeId,
        status: 'open' as PayoutDisputeStatus,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
      
      // Add to Firestore
      await this.payoutDisputesCollection.doc(disputeId).set(dispute);
      
      // Return the created dispute
      return this.getDispute(disputeId);
    } catch (error) {
      console.error('Error creating payout dispute:', error);
      return null;
    }
  }

  /**
   * Update a dispute status
   */
  async updateDisputeStatus(
    disputeId: string, 
    status: PayoutDisputeStatus, 
    resolution?: string,
    adminNotes?: string,
    adminUserId: string = 'system'
  ): Promise<PayoutDispute | null> {
    try {
      const dispute = await this.getDispute(disputeId);
      
      if (!dispute) {
        throw new Error('Dispute not found');
      }
      
      const updates: any = {
        status,
        updatedAt: FieldValue.serverTimestamp()
      };
      
      // Add resolution information if provided
      if (resolution) {
        updates.resolution = resolution;
      }
      
      // Add admin notes if provided
      if (adminNotes) {
        updates.adminNotes = adminNotes;
      }
      
      // Add resolved information if dispute is resolved
      if (status === 'resolved' && !dispute.resolvedAt) {
        updates.resolvedAt = FieldValue.serverTimestamp();
        updates.resolvedBy = adminUserId;
      }
      
      // Update the dispute
      await this.payoutDisputesCollection.doc(disputeId).update(updates);
      
      // Return the updated dispute
      return this.getDispute(disputeId);
    } catch (error) {
      console.error('Error updating dispute status:', error);
      return null;
    }
  }

  /**
   * Get earnings summary for a user
   */
  async getEarningsSummary(userId: string, period?: string): Promise<EarningsSummary[]> {
    try {
      let query = this.earningsSummariesCollection.where('userId', '==', userId) as any;
      
      if (period) {
        // Format for period is expected to be 'YYYY-MM' or 'YYYY-QQ'
        const [year, subPeriod] = period.split('-');
        
        if (year && subPeriod) {
          // Create date ranges based on period format
          let startDate, endDate;
          
          if (subPeriod.length === 2 && !isNaN(parseInt(subPeriod))) {
            // Monthly: YYYY-MM
            const month = parseInt(subPeriod) - 1; // JavaScript months are 0-indexed
            startDate = new Date(parseInt(year), month, 1);
            endDate = new Date(parseInt(year), month + 1, 0);
          } else if (subPeriod.startsWith('Q') && subPeriod.length === 2) {
            // Quarterly: YYYY-QN
            const quarter = parseInt(subPeriod.substring(1));
            startDate = new Date(parseInt(year), (quarter - 1) * 3, 1);
            endDate = new Date(parseInt(year), quarter * 3, 0);
          }
          
          if (startDate && endDate) {
            query = query.where('periodStart', '>=', startDate)
                         .where('periodEnd', '<=', endDate);
          }
        }
      }
      
      // Order by period start (newest first)
      query = query.orderBy('periodStart', 'desc');
      
      const summariesQuery = await query.get();
      
      return summariesQuery.docs.map((doc: any) => convertEarningsSummaryTimestamps({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting earnings summary:', error);
      return [];
    }
  }

  /**
   * Create or update an earnings summary
   */
  async updateEarningsSummary(summaryData: Omit<EarningsSummary, 'id' | 'createdAt' | 'updatedAt'>): Promise<EarningsSummary | null> {
    try {
      // Determine if there's an existing summary for this period
      const existingSummaries = await this.earningsSummariesCollection
        .where('userId', '==', summaryData.userId)
        .where('periodStart', '==', summaryData.periodStart)
        .where('periodEnd', '==', summaryData.periodEnd)
        .limit(1)
        .get();
      
      let summaryId;
      
      if (!existingSummaries.empty) {
        // Update existing summary
        summaryId = existingSummaries.docs[0].id;
        
        await this.earningsSummariesCollection.doc(summaryId).update({
          ...summaryData,
          updatedAt: FieldValue.serverTimestamp()
        });
      } else {
        // Create new summary
        summaryId = uuidv4();
        
        await this.earningsSummariesCollection.doc(summaryId).set({
          ...summaryData,
          id: summaryId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
      }
      
      // Get the updated summary
      const summaryDoc = await this.earningsSummariesCollection.doc(summaryId).get();
      
      return convertEarningsSummaryTimestamps({
        id: summaryDoc.id,
        ...summaryDoc.data()
      });
    } catch (error) {
      console.error('Error updating earnings summary:', error);
      return null;
    }
  }

  /**
   * Calculate earnings for a given period
   * This is a utility method that calculates earnings based on transaction data
   */
  async calculateEarnings(userId: string, userType: 'producer' | 'partner', periodStart: Date, periodEnd: Date): Promise<{
    totalEarnings: number;
    platformFees: number;
    netEarnings: number;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    paidAmount: number;
    pendingAmount: number;
    transactionIds: string[];
  }> {
    try {
      // Get settings to determine platform fee percentage
      const settings = await this.getPayoutSettings();
      const platformFeePercentage = settings?.platformFeePercentage || 5; // Default to 5% if not found
      
      // Query transactions for this user within the period
      const transactionsQuery = await this.payoutTransactionsCollection
        .where('userId', '==', userId)
        .where('userType', '==', userType)
        .where('createdAt', '>=', periodStart)
        .where('createdAt', '<=', periodEnd)
        .get();
      
      // Initialize counters
      let totalEarnings = 0;
      let totalBookings = 0;
      let completedBookings = 0;
      let cancelledBookings = 0;
      let paidAmount = 0;
      let pendingAmount = 0;
      const transactionIds: string[] = [];
      
      // Process each transaction
      transactionsQuery.forEach((doc: any) => {
        const transaction = doc.data();
        transactionIds.push(doc.id);
        
        // Count bookings
        if (transaction.bookingIds) {
          totalBookings += transaction.bookingIds.length;
        }
        
        // Sum amounts
        totalEarnings += transaction.amount;
        
        // Track completed vs pending amounts
        if (transaction.status === 'completed') {
          paidAmount += transaction.amount;
          completedBookings += transaction.bookingIds?.length || 0;
        } else if (transaction.status === 'cancelled' || transaction.status === 'failed') {
          cancelledBookings += transaction.bookingIds?.length || 0;
        } else {
          pendingAmount += transaction.amount;
        }
      });
      
      // Calculate platform fees and net earnings
      const platformFees = totalEarnings * (platformFeePercentage / 100);
      const netEarnings = totalEarnings - platformFees;
      
      return {
        totalEarnings,
        platformFees,
        netEarnings,
        totalBookings,
        completedBookings,
        cancelledBookings,
        paidAmount,
        pendingAmount,
        transactionIds
      };
    } catch (error) {
      console.error('Error calculating earnings:', error);
      return {
        totalEarnings: 0,
        platformFees: 0,
        netEarnings: 0,
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        paidAmount: 0,
        pendingAmount: 0,
        transactionIds: []
      };
    }
  }
}