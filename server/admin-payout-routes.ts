/**
 * Admin Payout Routes
 * 
 * This module registers payout management routes for admin users.
 * These routes allow administrators to manage payouts to Producers and Partners.
 */
import { Request, Response, Express, NextFunction } from 'express';
import { verifyAuth } from './firebase-admin';
import { PayoutService } from './services/payout-service';
import { 
  PayoutStatus, 
  PayoutSettings,
  PayoutAccount,
  PayoutTransaction,
  PayoutDispute
} from '../shared/payment-schema';
import { log } from './vite';
import { verifyAdminRole } from './admin-user-routes';
import { AdminRoleType } from '../core/domain/admin/admin-role';

// Initialize payout service
const payoutService = new PayoutService();

/**
 * Register payout management routes
 */
export function registerAdminPayoutRoutes(app: Express) {
  /**
   * Get payout settings
   * 
   * Retrieves the global payout settings for the platform
   * Required role: ADMIN or SUPER_ADMIN
   */
  app.get('/api/admin/payout-settings', 
    verifyAuth, 
    verifyAdminRole(AdminRoleType.ADMIN), 
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const settings = await payoutService.getPayoutSettings();
        
        // If settings don't exist yet, return default values
        if (!settings) {
          return res.status(200).json({
            id: 'global',
            defaultPayoutFrequency: 'monthly',
            minimumPayoutAmount: 100,
            platformFeePercentage: 10,
            automaticPayoutsEnabled: false,
            requireAdminApproval: true,
            payoutMethods: ['bank_transfer', 'paypal'],
            supportedCurrencies: ['USD', 'AED'],
          });
        }
        
        res.status(200).json(settings);
      } catch (error) {
        console.error('Error retrieving payout settings:', error);
        res.status(500).json({ error: 'Failed to retrieve payout settings' });
      }
    }
  );
  
  /**
   * Update payout settings
   * 
   * Updates the global payout settings for the platform
   * Required role: SUPER_ADMIN
   */
  app.post('/api/admin/payout-settings',
    verifyAuth,
    verifyAdminRole(AdminRoleType.SUPER_ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const settings: Partial<PayoutSettings> = req.body;
        const adminId = req.user?.uid;
        
        if (!adminId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Validate request
        if (!settings) {
          return res.status(400).json({ error: 'Settings data is required' });
        }
        
        await payoutService.updatePayoutSettings(settings, adminId);
        
        log(`Payout settings updated by admin ${adminId}`);
        res.status(200).json({ success: true, message: 'Payout settings updated successfully' });
      } catch (error) {
        console.error('Error updating payout settings:', error);
        res.status(500).json({ error: 'Failed to update payout settings' });
      }
    }
  );
  
  /**
   * Get payout accounts
   * 
   * Retrieves all payout accounts with optional filtering
   * Required role: ADMIN or SUPER_ADMIN
   */
  app.get('/api/admin/payout-accounts',
    verifyAuth,
    verifyAdminRole(AdminRoleType.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Extract query parameters
        const { userId, userType, isActive, isVerified } = req.query;
        
        // Fetch accounts from Firestore
        const accountsSnapshot = await payoutService['payoutAccountsCollection']
          .where('isActive', '==', isActive === 'false' ? false : true)
          .get();
        
        if (accountsSnapshot.empty) {
          return res.status(200).json([]);
        }
        
        // Convert to array and apply any additional filtering
        let accounts = accountsSnapshot.docs.map(doc => doc.data() as PayoutAccount);
        
        // Apply additional filtering if needed
        if (userId) {
          accounts = accounts.filter(account => account.userId === userId);
        }
        
        if (userType) {
          accounts = accounts.filter(account => account.userType === userType);
        }
        
        if (isVerified !== undefined) {
          const verified = isVerified === 'true';
          accounts = accounts.filter(account => account.isVerified === verified);
        }
        
        res.status(200).json(accounts);
      } catch (error) {
        console.error('Error retrieving payout accounts:', error);
        res.status(500).json({ error: 'Failed to retrieve payout accounts' });
      }
    }
  );
  
  /**
   * Get payout account
   * 
   * Retrieves a specific payout account by ID
   * Required role: ADMIN or SUPER_ADMIN
   */
  app.get('/api/admin/payout-accounts/:id',
    verifyAuth,
    verifyAdminRole(AdminRoleType.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const accountId = req.params.id;
        
        // Fetch the account
        const accountDoc = await payoutService['payoutAccountsCollection'].doc(accountId).get();
        
        if (!accountDoc.exists) {
          return res.status(404).json({ error: 'Payout account not found' });
        }
        
        res.status(200).json(accountDoc.data());
      } catch (error) {
        console.error('Error retrieving payout account:', error);
        res.status(500).json({ error: 'Failed to retrieve payout account' });
      }
    }
  );
  
  /**
   * Verify payout account
   * 
   * Updates a payout account's verification status
   * Required role: ADMIN or SUPER_ADMIN
   */
  app.post('/api/admin/payout-accounts/:id/verify',
    verifyAuth,
    verifyAdminRole(AdminRoleType.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const accountId = req.params.id;
        const { verified } = req.body;
        const adminId = req.user?.uid;
        
        if (!adminId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Validate request
        if (verified === undefined) {
          return res.status(400).json({ error: 'Verification status is required' });
        }
        
        // Fetch the account to make sure it exists
        const accountDoc = await payoutService['payoutAccountsCollection'].doc(accountId).get();
        
        if (!accountDoc.exists) {
          return res.status(404).json({ error: 'Payout account not found' });
        }
        
        // Update verification status
        await payoutService['payoutAccountsCollection'].doc(accountId).update({
          isVerified: verified,
          verificationDate: verified ? new Date() : null,
          updatedAt: new Date()
        });
        
        log(`Payout account ${accountId} verification status updated to ${verified} by admin ${adminId}`);
        res.status(200).json({ success: true, message: 'Payout account verification updated' });
      } catch (error) {
        console.error('Error verifying payout account:', error);
        res.status(500).json({ error: 'Failed to update account verification' });
      }
    }
  );
  
  /**
   * Get payout transactions
   * 
   * Retrieves all payout transactions with optional filtering
   * Required role: ADMIN or SUPER_ADMIN
   */
  app.get('/api/admin/payout-transactions',
    verifyAuth,
    verifyAdminRole(AdminRoleType.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Extract query parameters
        const { 
          userId, 
          status, 
          fromDate, 
          toDate, 
          limit = '50' 
        } = req.query;
        
        const filters: any = {
          limit: parseInt(limit as string, 10)
        };
        
        if (userId) {
          filters.userId = userId as string;
        }
        
        if (status) {
          filters.status = status as PayoutStatus;
        }
        
        if (fromDate) {
          filters.fromDate = new Date(fromDate as string);
        }
        
        if (toDate) {
          filters.toDate = new Date(toDate as string);
        }
        
        // Fetch transactions
        const transactions = await payoutService.getPayoutTransactions(filters);
        
        res.status(200).json(transactions);
      } catch (error) {
        console.error('Error retrieving payout transactions:', error);
        res.status(500).json({ error: 'Failed to retrieve payout transactions' });
      }
    }
  );
  
  /**
   * Get payout transaction
   * 
   * Retrieves a specific payout transaction by ID
   * Required role: ADMIN or SUPER_ADMIN
   */
  app.get('/api/admin/payout-transactions/:id',
    verifyAuth,
    verifyAdminRole(AdminRoleType.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const payoutId = req.params.id;
        
        // Fetch the transaction
        const transaction = await payoutService.getPayoutTransaction(payoutId);
        
        if (!transaction) {
          return res.status(404).json({ error: 'Payout transaction not found' });
        }
        
        res.status(200).json(transaction);
      } catch (error) {
        console.error('Error retrieving payout transaction:', error);
        res.status(500).json({ error: 'Failed to retrieve payout transaction' });
      }
    }
  );
  
  /**
   * Create a new payout transaction
   * 
   * Creates a manual payout transaction
   * Required role: ADMIN or SUPER_ADMIN
   */
  app.post('/api/admin/payout-transactions',
    verifyAuth,
    verifyAdminRole(AdminRoleType.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const payoutData: Partial<PayoutTransaction> = req.body;
        const adminId = req.user?.uid;
        
        if (!adminId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Validate required fields
        if (!payoutData.userId || !payoutData.userType || !payoutData.amount) {
          return res.status(400).json({ error: 'Missing required payout information' });
        }
        
        // Create the payout transaction
        const payoutId = await payoutService.createPayoutTransaction(payoutData, adminId);
        
        log(`New payout transaction ${payoutId} created by admin ${adminId}`);
        res.status(201).json({ success: true, payoutId, message: 'Payout transaction created' });
      } catch (error) {
        console.error('Error creating payout transaction:', error);
        res.status(500).json({ error: 'Failed to create payout transaction' });
      }
    }
  );
  
  /**
   * Update payout transaction status
   * 
   * Updates the status of a payout transaction (approve, reject, process, complete)
   * Required role: ADMIN or SUPER_ADMIN
   */
  app.post('/api/admin/payout-transactions/:id/status',
    verifyAuth,
    verifyAdminRole(AdminRoleType.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const payoutId = req.params.id;
        const { status, notes } = req.body;
        const adminId = req.user?.uid;
        
        if (!adminId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Validate request
        if (!status || !['pending', 'approved', 'processing', 'completed', 'rejected', 'on_hold'].includes(status)) {
          return res.status(400).json({ error: 'Invalid payout status' });
        }
        
        // Update status
        await payoutService.updatePayoutStatus(payoutId, status as PayoutStatus, adminId, notes);
        
        log(`Payout transaction ${payoutId} status updated to ${status} by admin ${adminId}`);
        res.status(200).json({ success: true, message: 'Payout status updated' });
      } catch (error) {
        console.error('Error updating payout status:', error);
        res.status(500).json({ error: 'Failed to update payout status' });
      }
    }
  );
  
  /**
   * Calculate earnings
   * 
   * Triggers earnings calculation for a specific user or all users
   * Required role: ADMIN or SUPER_ADMIN
   */
  app.post('/api/admin/calculate-earnings',
    verifyAuth,
    verifyAdminRole(AdminRoleType.ADMIN),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { userId, userType } = req.body;
        const adminId = req.user?.uid;
        
        if (!adminId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Validate request
        if (!userId || !userType) {
          return res.status(400).json({ error: 'User ID and type are required' });
        }
        
        // Calculate earnings for the specified user
        await payoutService.calculateEarnings(userId, userType);
        
        log(`Earnings calculated for user ${userId} by admin ${adminId}`);
        res.status(200).json({ success: true, message: 'Earnings calculated successfully' });
      } catch (error) {
        console.error('Error calculating earnings:', error);
        res.status(500).json({ error: 'Failed to calculate earnings' });
      }
    }
  );
  
  /**
   * Get earnings summary
   * 
   * Retrieves earnings summary for a specific user
   * Required role: ADMIN or SUPER_ADMIN
   */
  app.get('/api/admin/earnings/:userId',
    verifyAuth,
    verifyAdminRole(['ADMIN', 'SUPER_ADMIN']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.params.userId;
        
        // Fetch earnings summary
        const earnings = await payoutService.getEarningsSummary(userId);
        
        if (!earnings) {
          return res.status(404).json({ error: 'Earnings summary not found' });
        }
        
        res.status(200).json(earnings);
      } catch (error) {
        console.error('Error retrieving earnings summary:', error);
        res.status(500).json({ error: 'Failed to retrieve earnings summary' });
      }
    }
  );
  
  /**
   * Get payout disputes
   * 
   * Retrieves all payout disputes with optional filtering
   * Required role: ADMIN or SUPER_ADMIN
   */
  app.get('/api/admin/payout-disputes',
    verifyAuth,
    verifyAdminRole(['ADMIN', 'SUPER_ADMIN']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Extract query parameters
        const { userId, status, limit = '50' } = req.query;
        
        const filters: any = {
          limit: parseInt(limit as string, 10)
        };
        
        if (userId) {
          filters.userId = userId as string;
        }
        
        if (status) {
          filters.status = status as string;
        }
        
        // Fetch disputes
        const disputes = await payoutService.getPayoutDisputes(filters);
        
        res.status(200).json(disputes);
      } catch (error) {
        console.error('Error retrieving payout disputes:', error);
        res.status(500).json({ error: 'Failed to retrieve payout disputes' });
      }
    }
  );
  
  /**
   * Resolve payout dispute
   * 
   * Resolves or rejects a payout dispute
   * Required role: ADMIN or SUPER_ADMIN
   */
  app.post('/api/admin/payout-disputes/:id/resolve',
    verifyAuth,
    verifyAdminRole(['ADMIN', 'SUPER_ADMIN']),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const disputeId = req.params.id;
        const { resolution, status } = req.body;
        const adminId = req.user?.uid;
        
        if (!adminId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Validate request
        if (!resolution || !status || !['resolved', 'rejected'].includes(status)) {
          return res.status(400).json({ error: 'Resolution and valid status are required' });
        }
        
        // Resolve the dispute
        await payoutService.resolvePayoutDispute(
          disputeId,
          resolution,
          status as 'resolved' | 'rejected',
          adminId
        );
        
        log(`Payout dispute ${disputeId} ${status} by admin ${adminId}`);
        res.status(200).json({ success: true, message: `Dispute ${status}` });
      } catch (error) {
        console.error('Error resolving payout dispute:', error);
        res.status(500).json({ error: 'Failed to resolve payout dispute' });
      }
    }
  );
}