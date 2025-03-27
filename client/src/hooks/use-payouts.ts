/**
 * Payouts Management Hooks
 * 
 * These hooks provide data fetching and mutations for the payouts management system.
 * They handle API interactions for transactions, accounts, settings, and disputes.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import { 
  PayoutTransaction, 
  PayoutAccount, 
  PayoutSettings, 
  PayoutDispute,
  PayoutStatus 
} from '../../shared/payment-schema';

// API base path for payouts
const API_BASE = '/api/admin/payouts';

/**
 * Hook for managing payout transactions
 */
export function usePayoutTransactions() {
  const queryClient = useQueryClient();
  
  // Query for fetching transactions
  const { data, isLoading, isError } = useQuery<PayoutTransaction[]>({
    queryKey: [API_BASE, 'transactions'],
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Query function for a single transaction
  const getPayoutTransaction = (id: string) => {
    return useQuery({
      queryKey: [API_BASE, 'transactions', id],
      enabled: !!id,
    });
  };
  
  // Mutation for creating a new transaction
  const { mutate: createTransaction, isPending: isCreating } = useMutation({
    mutationFn: async (transactionData: Partial<PayoutTransaction>) => {
      const response = await apiRequest(
        'POST',
        `${API_BASE}/transactions`, 
        transactionData
      );
      return response;
    },
    onSuccess: () => {
      // Invalidate transactions query to refresh data
      queryClient.invalidateQueries({ queryKey: [API_BASE, 'transactions'] });
      toast({
        title: 'Transaction created',
        description: 'The payout transaction has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create transaction',
        description: error.message || 'An error occurred while creating the transaction.',
        variant: 'destructive',
      });
    },
  });
  
  // Mutation for updating transaction status
  const { mutate: updateTransactionStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: async ({ 
      transactionId, 
      status, 
      notes 
    }: { 
      transactionId: string; 
      status: PayoutStatus; 
      notes?: string;
    }) => {
      const response = await apiRequest(
        'PUT',
        `${API_BASE}/transactions/${transactionId}/status`,
        { status, notes }
      );
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific transaction and all transactions
      queryClient.invalidateQueries({ queryKey: [API_BASE, 'transactions', variables.transactionId] });
      queryClient.invalidateQueries({ queryKey: [API_BASE, 'transactions'] });
      
      const statusMessages: Record<string, string> = {
        'pending': 'Transaction marked as pending',
        'approved': 'Transaction approved',
        'processing': 'Transaction marked as processing',
        'completed': 'Transaction completed',
        'rejected': 'Transaction rejected',
        'on_hold': 'Transaction placed on hold'
      };
      
      toast({
        title: statusMessages[variables.status as string] || 'Status updated',
        description: 'The transaction status has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update status',
        description: error.message || 'An error occurred while updating the status.',
        variant: 'destructive',
      });
    },
  });
  
  return {
    transactions: data,
    isLoading,
    isError,
    getPayoutTransaction,
    createTransaction,
    isCreating,
    updateTransactionStatus,
    isUpdatingStatus,
  };
}

/**
 * Hook for managing payout accounts
 */
export function usePayoutAccounts() {
  const queryClient = useQueryClient();
  
  // Query for fetching accounts
  const { data, isLoading, isError } = useQuery<PayoutAccount[]>({
    queryKey: [API_BASE, 'accounts'],
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Query function for a single account
  const getPayoutAccount = (id: string) => {
    return useQuery({
      queryKey: [API_BASE, 'accounts', id],
      enabled: !!id,
    });
  };
  
  // Mutation for verifying an account
  const { mutate: verifyAccount, isPending: isVerifying } = useMutation({
    mutationFn: async ({ 
      accountId, 
      verificationData 
    }: { 
      accountId: string; 
      verificationData: { isVerified: boolean; notes?: string }
    }) => {
      const response = await apiRequest(
        'PUT',
        `${API_BASE}/accounts/${accountId}/verify`,
        verificationData
      );
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific account and all accounts
      queryClient.invalidateQueries({ queryKey: [API_BASE, 'accounts', variables.accountId] });
      queryClient.invalidateQueries({ queryKey: [API_BASE, 'accounts'] });
      
      const message = variables.verificationData.isVerified
        ? 'Account marked as verified'
        : 'Account marked as unverified';
      
      toast({
        title: message,
        description: 'The account verification status has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update verification',
        description: error.message || 'An error occurred while updating the verification status.',
        variant: 'destructive',
      });
    },
  });
  
  return {
    accounts: data,
    isLoading,
    isError,
    getPayoutAccount,
    verifyAccount,
    isVerifying,
  };
}

/**
 * Hook for managing payout disputes
 */
export function usePayoutDisputes() {
  const queryClient = useQueryClient();
  
  // Query for fetching disputes
  const { data, isLoading, isError } = useQuery<PayoutDispute[]>({
    queryKey: [API_BASE, 'disputes'],
    staleTime: 1000 * 60, // 1 minute
  });
  
  // Mutation for resolving a dispute
  const { mutate: resolveDispute, isPending: isResolving } = useMutation({
    mutationFn: async ({ 
      disputeId, 
      resolution, 
      notes 
    }: { 
      disputeId: string; 
      resolution: string;
      notes?: string;
    }) => {
      const response = await apiRequest(
        'PUT',
        `${API_BASE}/disputes/${disputeId}/status`,
        { 
          status: resolution === 'resolved' ? 'resolved' : 'rejected',
          resolution,
          adminNotes: notes
        }
      );
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate all disputes
      queryClient.invalidateQueries({ queryKey: [API_BASE, 'disputes'] });
      
      const resolutionMessages: Record<string, string> = {
        'resolved': 'Dispute has been resolved',
        'rejected': 'Dispute claim has been rejected'
      };
      
      toast({
        title: resolutionMessages[variables.resolution as string] || 'Dispute updated',
        description: 'The dispute has been successfully processed.',
      });
    },
    onError: (error: any) => {
      console.error('Dispute resolution error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred while processing the dispute.';
      
      // Check for specific error conditions
      if (error.status === 403) {
        toast({
          title: 'Permission Denied',
          description: 'You do not have permission to resolve disputes. Contact an administrator.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to resolve dispute',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
  });
  
  return {
    disputes: data,
    isLoading,
    isError,
    resolveDispute,
    isResolving,
  };
}

/**
 * Hook for managing payout settings
 */
export function usePayoutSettings() {
  const queryClient = useQueryClient();
  
  // Query for fetching settings
  const { data, isLoading, isError } = useQuery<PayoutSettings>({
    queryKey: [API_BASE, 'settings'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Mutation for updating settings
  const { mutate: updateSettings, isPending: isUpdating } = useMutation({
    mutationFn: async (settingsData: Partial<PayoutSettings>) => {
      const response = await apiRequest(
        'PUT',
        `${API_BASE}/settings`,
        settingsData
      );
      return response;
    },
    onSuccess: () => {
      // Invalidate settings query
      queryClient.invalidateQueries({ queryKey: [API_BASE, 'settings'] });
      
      toast({
        title: 'Settings updated',
        description: 'Payout settings have been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update settings',
        description: error.message || 'An error occurred while updating the settings.',
        variant: 'destructive',
      });
    },
  });
  
  return {
    settings: data,
    isLoading,
    isError,
    updateSettings,
    isUpdating,
  };
}