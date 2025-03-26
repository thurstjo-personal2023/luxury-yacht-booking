/**
 * Custom hook for managing payout data
 * Provides access to payout transactions, accounts, settings, and disputes
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PayoutAccount, 
  PayoutTransaction, 
  PayoutSettings, 
  PayoutDispute, 
  EarningsSummary, 
  PayoutStatus 
} from '../../shared/payment-schema';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

// Hook for accessing payout settings
export function usePayoutSettings() {
  const queryClient = useQueryClient();

  // Get global payout settings
  const { 
    data: settings, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['/api/admin/payout-settings'],
    retry: 1
  });

  // Update payout settings
  const { mutate: updateSettings, isPending: isUpdating } = useMutation({
    mutationFn: async (updatedSettings: Partial<PayoutSettings>) => {
      return apiRequest('/api/admin/payout-settings', 'POST', updatedSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payout-settings'] });
      toast({
        title: 'Settings Updated',
        description: 'Payout settings have been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to update payout settings:', error);
      toast({
        title: 'Update Failed',
        description: 'There was an error updating the payout settings.',
        variant: 'destructive',
      });
    }
  });

  return { 
    settings: settings as PayoutSettings | null, 
    isLoading, 
    isError, 
    updateSettings, 
    isUpdating 
  };
}

// Hook for managing payout accounts
export function usePayoutAccounts(filters = {}) {
  const queryClient = useQueryClient();
  
  // Get payout accounts with optional filtering
  const { 
    data: accounts, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['/api/admin/payout-accounts', filters],
    retry: 1
  });

  // Get a specific payout account by ID
  const getPayoutAccount = (id: string) => {
    return useQuery({
      queryKey: [`/api/admin/payout-accounts/${id}`],
      enabled: !!id,
      retry: 1
    });
  };

  // Verify a payout account
  const { mutate: verifyAccount, isPending: isVerifying } = useMutation({
    mutationFn: async ({ accountId, verificationData }: { accountId: string, verificationData: any }) => {
      return apiRequest(`/api/admin/payout-accounts/${accountId}/verify`, 'POST', verificationData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payout-accounts'] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/payout-accounts/${variables.accountId}`] });
      toast({
        title: 'Account Verified',
        description: 'The payout account has been verified successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to verify payout account:', error);
      toast({
        title: 'Verification Failed',
        description: 'There was an error verifying the payout account.',
        variant: 'destructive',
      });
    }
  });

  return { 
    accounts: accounts as PayoutAccount[] | null, 
    isLoading, 
    isError, 
    getPayoutAccount, 
    verifyAccount, 
    isVerifying 
  };
}

// Hook for managing payout transactions
export function usePayoutTransactions(filters = {}) {
  const queryClient = useQueryClient();
  
  // Get payout transactions with optional filtering
  const { 
    data: transactions, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['/api/admin/payout-transactions', filters],
    retry: 1
  });

  // Get a specific payout transaction by ID
  const getPayoutTransaction = (id: string) => {
    return useQuery({
      queryKey: [`/api/admin/payout-transactions/${id}`],
      enabled: !!id,
      retry: 1
    });
  };

  // Create a new payout transaction
  const { mutate: createTransaction, isPending: isCreating } = useMutation({
    mutationFn: async (transactionData: Partial<PayoutTransaction>) => {
      return apiRequest('/api/admin/payout-transactions', 'POST', transactionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payout-transactions'] });
      toast({
        title: 'Transaction Created',
        description: 'The payout transaction has been created successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to create payout transaction:', error);
      toast({
        title: 'Creation Failed',
        description: 'There was an error creating the payout transaction.',
        variant: 'destructive',
      });
    }
  });

  // Update payout transaction status
  const { mutate: updateTransactionStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: async ({ 
      transactionId, 
      status, 
      notes 
    }: { 
      transactionId: string, 
      status: PayoutStatus, 
      notes?: string 
    }) => {
      return apiRequest(`/api/admin/payout-transactions/${transactionId}/status`, 'POST', { status, notes });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payout-transactions'] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/payout-transactions/${variables.transactionId}`] });
      
      // Update earnings summaries when status changes
      queryClient.invalidateQueries({ queryKey: ['/api/admin/earnings'] });
      
      toast({
        title: 'Status Updated',
        description: `The payout status has been updated to ${variables.status}.`,
      });
    },
    onError: (error) => {
      console.error('Failed to update payout status:', error);
      toast({
        title: 'Update Failed',
        description: 'There was an error updating the payout status.',
        variant: 'destructive',
      });
    }
  });

  return { 
    transactions: transactions as PayoutTransaction[] | null, 
    isLoading, 
    isError, 
    getPayoutTransaction, 
    createTransaction, 
    isCreating,
    updateTransactionStatus, 
    isUpdatingStatus 
  };
}

// Hook for managing payout disputes
export function usePayoutDisputes(filters = {}) {
  const queryClient = useQueryClient();
  
  // Get payout disputes with optional filtering
  const { 
    data: disputes, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: ['/api/admin/payout-disputes', filters],
    retry: 1
  });

  // Resolve a payout dispute
  const { mutate: resolveDispute, isPending: isResolving } = useMutation({
    mutationFn: async ({ 
      disputeId, 
      resolution, 
      notes 
    }: { 
      disputeId: string, 
      resolution: string, 
      notes?: string 
    }) => {
      return apiRequest(`/api/admin/payout-disputes/${disputeId}/resolve`, 'POST', { resolution, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payout-disputes'] });
      toast({
        title: 'Dispute Resolved',
        description: 'The payout dispute has been resolved successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to resolve payout dispute:', error);
      toast({
        title: 'Resolution Failed',
        description: 'There was an error resolving the payout dispute.',
        variant: 'destructive',
      });
    }
  });

  return { 
    disputes: disputes as PayoutDispute[] | null, 
    isLoading, 
    isError, 
    resolveDispute, 
    isResolving 
  };
}

// Hook for managing user earnings summaries
export function useEarningsSummaries() {
  const queryClient = useQueryClient();
  
  // Get earnings summary for a specific user
  const getEarningsSummary = (userId: string) => {
    return useQuery({
      queryKey: [`/api/admin/earnings/${userId}`],
      enabled: !!userId,
      retry: 1
    });
  };

  // Calculate earnings (trigger calculation for a user)
  const { mutate: calculateEarnings, isPending: isCalculating } = useMutation({
    mutationFn: async ({ userId, userType }: { userId: string, userType: string }) => {
      return apiRequest('/api/admin/calculate-earnings', 'POST', { userId, userType });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/earnings/${variables.userId}`] });
      toast({
        title: 'Earnings Calculated',
        description: 'The earnings have been calculated successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to calculate earnings:', error);
      toast({
        title: 'Calculation Failed',
        description: 'There was an error calculating the earnings.',
        variant: 'destructive',
      });
    }
  });

  return { 
    getEarningsSummary, 
    calculateEarnings, 
    isCalculating 
  };
}