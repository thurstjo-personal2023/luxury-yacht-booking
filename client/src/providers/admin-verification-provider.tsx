import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getVerificationStatus, 
  updateEmailVerificationStatus, 
  updatePhoneVerificationStatus,
  updateMfaStatus,
  updateApprovalStatus
} from '@/services/admin/verification-service';
import { useToast } from '@/hooks/use-toast';

interface VerificationState {
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  isApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  isMfaEnabled: boolean;
  mfaEnabledAt?: string;
  mfaType?: 'phone' | 'totp';
  totpMfaEnabled?: boolean;
  phoneMfaEnabled?: boolean;
  registrationComplete: boolean;
  phoneNumber?: string;
  department?: string;
  position?: string;
  adminRole?: string;
  name?: string;
}

interface AdminVerificationContextType {
  userId: string | null;
  setUserId: (id: string | null) => void;
  verificationState: VerificationState | null;
  loading: boolean;
  error: string | null;
  refreshStatus: () => Promise<void>;
  updateStatus: (updates: Partial<VerificationState>) => Promise<void>;
  resetError: () => void;
  currentStepIndex: number;
  progressPercentage: number;
}

const defaultContext: AdminVerificationContextType = {
  userId: null,
  setUserId: () => {},
  verificationState: null,
  loading: false,
  error: null,
  refreshStatus: async () => {},
  updateStatus: async () => {},
  resetError: () => {},
  currentStepIndex: 0,
  progressPercentage: 0
};

const AdminVerificationContext = createContext<AdminVerificationContextType>(defaultContext);

/**
 * Use Admin Verification Hook
 * 
 * Custom hook to use the admin verification context
 */
export const useAdminVerification = () => useContext(AdminVerificationContext);

interface AdminVerificationProviderProps {
  children: ReactNode;
  initialUserId?: string | null;
}

/**
 * Admin Verification Provider
 * 
 * Provides verification state management for the admin registration flow
 */
export const AdminVerificationProvider: React.FC<AdminVerificationProviderProps> = ({ 
  children, 
  initialUserId = null 
}) => {
  const [userId, setUserId] = useState<string | null>(initialUserId);
  const [verificationState, setVerificationState] = useState<VerificationState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const { toast } = useToast();
  
  // Calculate current step and progress based on verification state
  useEffect(() => {
    if (!verificationState) {
      setCurrentStepIndex(0);
      setProgressPercentage(0);
      return;
    }
    
    let step = 1; // Start at registration step
    
    if (verificationState.isEmailVerified) step = 2;
    if (verificationState.isEmailVerified && verificationState.isPhoneVerified) step = 3;
    if (verificationState.isEmailVerified && verificationState.isPhoneVerified && verificationState.isApproved) step = 4;
    if (verificationState.isEmailVerified && verificationState.isPhoneVerified && verificationState.isApproved && verificationState.isMfaEnabled) step = 5;
    
    setCurrentStepIndex(step);
    
    // Calculate progress (5 total steps: registration, email, phone, approval, MFA)
    const progress = Math.min(100, Math.floor((step / 5) * 100));
    setProgressPercentage(progress);
  }, [verificationState]);
  
  // Fetch verification status when userId changes
  useEffect(() => {
    if (userId) {
      refreshStatus();
    } else {
      setVerificationState(null);
    }
  }, [userId]);
  
  // Refresh verification status from server
  const refreshStatus = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const status = await getVerificationStatus(userId);
      setVerificationState(status);
    } catch (err: any) {
      console.error('Error fetching verification status:', err);
      setError(err.message || 'Failed to load verification status');
      
      toast({
        title: 'Error',
        description: 'Failed to load verification status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Update verification status
  const updateStatus = async (updates: Partial<VerificationState>) => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Determine which update function to call based on the updates object
      if (updates.isEmailVerified !== undefined) {
        await updateEmailVerificationStatus(userId, updates.isEmailVerified);
      }
      
      if (updates.isPhoneVerified !== undefined) {
        await updatePhoneVerificationStatus(userId, updates.isPhoneVerified);
      }
      
      if (updates.isApproved !== undefined) {
        await updateApprovalStatus(userId, updates.isApproved);
      }
      
      if (updates.isMfaEnabled !== undefined) {
        await updateMfaStatus(userId, updates.isMfaEnabled);
      }
      
      // Update local state with new values
      setVerificationState(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: 'Success',
        description: 'Verification status updated successfully.',
      });
    } catch (err: any) {
      console.error('Error updating verification status:', err);
      setError(err.message || 'Failed to update verification status');
      
      toast({
        title: 'Error',
        description: 'Failed to update verification status. Please try again.',
        variant: 'destructive',
      });
      
      throw err; // Re-throw the error for the caller to handle
    } finally {
      setLoading(false);
    }
  };
  
  // Reset error state
  const resetError = () => setError(null);
  
  // Context value
  const contextValue: AdminVerificationContextType = {
    userId,
    setUserId,
    verificationState,
    loading,
    error,
    refreshStatus,
    updateStatus,
    resetError,
    currentStepIndex,
    progressPercentage
  };
  
  return (
    <AdminVerificationContext.Provider value={contextValue}>
      {children}
    </AdminVerificationContext.Provider>
  );
};