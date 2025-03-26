/**
 * Admin Payout Routes
 * 
 * This file contains the Express routes for managing payouts in the admin panel.
 * These routes handle operations like creating/updating payout accounts, 
 * processing transactions, and managing platform payout settings.
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { verifyAuth } from './middleware/auth';
import { verifyFinanceAdmin } from './middleware/admin';
import { PayoutService } from './services/payout-service';

// Create a new router
const router = Router();

// Initialize the payout service
const payoutService = new PayoutService();

// Get payout settings
router.get('/settings', verifyAuth, verifyFinanceAdmin, async (req: Request, res: Response) => {
  try {
    const settings = await payoutService.getPayoutSettings();
    return res.json(settings);
  } catch (error) {
    console.error('Error fetching payout settings:', error);
    return res.status(500).json({ error: 'Failed to fetch payout settings' });
  }
});

// Update payout settings
router.put('/settings', verifyAuth, verifyFinanceAdmin, async (req: Request, res: Response) => {
  try {
    const settingsSchema = z.object({
      automaticPayoutsEnabled: z.boolean(),
      minimumPayoutAmount: z.number().positive(),
      payoutSchedule: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
      platformFeePercentage: z.number().min(0).max(100),
      withdrawalFee: z.number().min(0),
      payoutMethods: z.array(z.string()),
      maxRetryAttempts: z.number().int().positive(),
      supportContact: z.string().email(),
      allowEarlyPayout: z.boolean(),
      earlyPayoutFee: z.number().min(0)
    });

    const validatedData = settingsSchema.parse(req.body);
    const updatedSettings = await payoutService.updatePayoutSettings(validatedData);
    return res.json(updatedSettings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid settings data', details: error.errors });
    }
    console.error('Error updating payout settings:', error);
    return res.status(500).json({ error: 'Failed to update payout settings' });
  }
});

// Get all payout accounts
router.get('/accounts', verifyAuth, verifyFinanceAdmin, async (req: Request, res: Response) => {
  try {
    const accounts = await payoutService.getAllPayoutAccounts();
    return res.json(accounts);
  } catch (error) {
    console.error('Error fetching payout accounts:', error);
    return res.status(500).json({ error: 'Failed to fetch payout accounts' });
  }
});

// Get a specific payout account
router.get('/accounts/:accountId', verifyAuth, verifyFinanceAdmin, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const account = await payoutService.getPayoutAccountById(accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Payout account not found' });
    }
    
    return res.json(account);
  } catch (error) {
    console.error('Error fetching payout account:', error);
    return res.status(500).json({ error: 'Failed to fetch payout account' });
  }
});

// Update a payout account verification status
router.patch('/accounts/:accountId/verify', verifyAuth, verifyFinanceAdmin, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const statusSchema = z.object({
      verified: z.boolean(),
      notes: z.string().optional()
    });

    const validatedData = statusSchema.parse(req.body);
    const updatedAccount = await payoutService.updateAccountVerificationStatus(
      accountId, 
      validatedData.verified, 
      validatedData.notes
    );
    
    return res.json(updatedAccount);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    console.error('Error updating account verification status:', error);
    return res.status(500).json({ error: 'Failed to update account verification status' });
  }
});

// Get all payout transactions with optional filtering
router.get('/transactions', verifyAuth, verifyFinanceAdmin, async (req: Request, res: Response) => {
  try {
    const { status, payeeId, startDate, endDate, limit } = req.query;
    
    const filters: any = {};
    if (status) filters.status = status as string;
    if (payeeId) filters.payeeId = payeeId as string;
    
    if (startDate && !isNaN(Date.parse(startDate as string))) {
      filters.startDate = new Date(startDate as string);
    }
    
    if (endDate && !isNaN(Date.parse(endDate as string))) {
      filters.endDate = new Date(endDate as string);
    }
    
    const transactions = await payoutService.getPayoutTransactions(
      filters, 
      limit ? parseInt(limit as string) : undefined
    );
    
    return res.json(transactions);
  } catch (error) {
    console.error('Error fetching payout transactions:', error);
    return res.status(500).json({ error: 'Failed to fetch payout transactions' });
  }
});

// Get a specific transaction
router.get('/transactions/:transactionId', verifyAuth, verifyFinanceAdmin, async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const transaction = await payoutService.getTransactionById(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    return res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create a new payout transaction
router.post('/transactions', verifyAuth, verifyFinanceAdmin, async (req: Request, res: Response) => {
  try {
    const transactionSchema = z.object({
      payeeId: z.string(),
      payeeType: z.enum(['producer', 'partner']),
      accountId: z.string(),
      amount: z.number().positive(),
      currency: z.string().length(3),
      description: z.string(),
      notes: z.string().optional(),
      metadata: z.record(z.string()).optional()
    });

    const validatedData = transactionSchema.parse(req.body);
    const newTransaction = await payoutService.createPayoutTransaction(validatedData);
    
    return res.status(201).json(newTransaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid transaction data', details: error.errors });
    }
    console.error('Error creating payout transaction:', error);
    return res.status(500).json({ error: 'Failed to create payout transaction' });
  }
});

// Update a transaction status
router.patch('/transactions/:transactionId/status', verifyAuth, verifyFinanceAdmin, async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const statusSchema = z.object({
      status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
      notes: z.string().optional(),
      metadata: z.record(z.string()).optional()
    });

    const validatedData = statusSchema.parse(req.body);
    const updatedTransaction = await payoutService.updateTransactionStatus(
      transactionId,
      validatedData.status,
      validatedData.notes,
      validatedData.metadata
    );
    
    return res.json(updatedTransaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid status data', details: error.errors });
    }
    console.error('Error updating transaction status:', error);
    return res.status(500).json({ error: 'Failed to update transaction status' });
  }
});

// Get all payout disputes
router.get('/disputes', verifyAuth, verifyFinanceAdmin, async (req: Request, res: Response) => {
  try {
    const { status, userId } = req.query;
    
    const filters: any = {};
    if (status) filters.status = status as string;
    if (userId) filters.userId = userId as string;
    
    const disputes = await payoutService.getPayoutDisputes(filters);
    return res.json(disputes);
  } catch (error) {
    console.error('Error fetching payout disputes:', error);
    return res.status(500).json({ error: 'Failed to fetch payout disputes' });
  }
});

// Update a dispute status
router.patch('/disputes/:disputeId/status', verifyAuth, verifyFinanceAdmin, async (req: Request, res: Response) => {
  try {
    const { disputeId } = req.params;
    const statusSchema = z.object({
      status: z.enum(['open', 'under_review', 'resolved', 'rejected']),
      resolution: z.string().optional(),
      adminNotes: z.string().optional()
    });

    const validatedData = statusSchema.parse(req.body);
    const updatedDispute = await payoutService.updateDisputeStatus(
      disputeId,
      validatedData.status,
      validatedData.resolution,
      validatedData.adminNotes
    );
    
    return res.json(updatedDispute);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid dispute status data', details: error.errors });
    }
    console.error('Error updating dispute status:', error);
    return res.status(500).json({ error: 'Failed to update dispute status' });
  }
});

// Get earning summaries
router.get('/earnings', verifyAuth, verifyFinanceAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, period } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const summaries = await payoutService.getEarningsSummaries(
      userId as string,
      period as string
    );
    
    return res.json(summaries);
  } catch (error) {
    console.error('Error fetching earnings summaries:', error);
    return res.status(500).json({ error: 'Failed to fetch earnings summaries' });
  }
});

// Export the router
export { router as adminPayoutRoutes };