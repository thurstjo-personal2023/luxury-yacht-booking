import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getVerificationStatus, 
  updateEmailVerificationStatus, 
  updatePhoneVerificationStatus,
  updateMfaStatus,
  updateApprovalStatus
} from '@/services/admin/verification-service';
import { useToast } from '@/hooks/use-toast';

/**
 * Verification State
 * 
 * This interface defines the full verification state for an administrator account,
 * tracking each step in the verification and approval process.
 */
interface VerificationState {
  /** Whether the user's email has been verified */
  isEmailVerified: boolean;
  
  /** Whether the user's phone has been verified */
  isPhoneVerified: boolean;
  
  /** Timestamp when email was verified */
  emailVerifiedAt?: string;
  
  /** Timestamp when phone was verified */
  phoneVerifiedAt?: string;
  
  /** Whether the account has been approved by a super admin */
  isApproved: boolean;
  
  /** Timestamp when the account was approved */
  approvedAt?: string;
  
  /** User ID of the admin who approved this account */
  approvedBy?: string;
  
  /** Whether MFA has been set up for this account */
  isMfaEnabled: boolean;
  
  /** Timestamp when MFA was enabled */
  mfaEnabledAt?: string;
  
  /** Type of MFA enabled: 'phone' or 'totp' (authenticator app) */
  mfaType?: 'phone' | 'totp';
  
  /** Whether TOTP-based MFA is enabled */
  totpMfaEnabled?: boolean;
  
  /** Whether phone-based MFA is enabled */
  phoneMfaEnabled?: boolean;
  
  /** Whether the entire registration process is complete */
  registrationComplete: boolean;
  
  /** User's phone number */
  phoneNumber?: string;
  
  /** User's department in the organization */
  department?: string;
  
  /** User's position/title in the organization */
  position?: string;
  
  /** User's administrative role (SUPER_ADMIN, ADMIN, MODERATOR) */
  adminRole?: string;
  
  /** User's full name */
  name?: string;
}

/**
 * Admin Verification Context Type
 * 
 * This interface defines the shape of the context provided by AdminVerificationProvider
 */
interface AdminVerificationContextType {
  /** The user ID being verified */
  userId: string | null;
  
  /** Function to set the user ID */
  setUserId: (id: string | null) => void;
  
  /** The current verification state */
  verificationState: VerificationState | null;
  
  /** Whether a verification operation is in progress */
  loading: boolean;
  
  /** Current error message, if any */
  error: string | null;
  
  /** Function to refresh the verification status */
  refreshStatus: () => Promise<void>;
  
  /** Function to update specific verification status fields */
  updateStatus: (updates: Partial<VerificationState>) => Promise<void>;
  
  /** Function to reset error state and optionally retry */
  resetError: (retry?: boolean) => void;
  
  /** Current step index in the verification process (1-based) */
  currentStepIndex: number;
  
  /** Percentage of verification process completed (0-100) */
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

/**
 * Admin Verification Provider Props
 * 
 * Props for the AdminVerificationProvider component
 */
interface AdminVerificationProviderProps {
  /** Child components to be wrapped by the provider */
  children: ReactNode;
  
  /** Optional initial user ID to immediately start verification for */
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
  
  /**
   * Refresh verification status from server
   * 
   * This function fetches the current verification status for the user
   * and updates the local state. It includes enhanced error handling for different
   * error scenarios with specific error messages and recovery hints.
   */
  const refreshStatus = async () => {
    if (!userId) {
      setError('User ID is missing. Please try registering again or contact support.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const status = await getVerificationStatus(userId);
      
      // Verify that we received a valid status object
      if (!status) {
        throw new Error('No verification data received');
      }
      
      // Map verification status to state and add required fields
      setVerificationState({
        ...status,
        registrationComplete: status.isEmailVerified && 
                             status.isPhoneVerified && 
                             status.isApproved && 
                             status.isMfaEnabled
      });
      
      // Clear any previous errors
      if (error) {
        resetError();
        toast({
          title: 'Connection Restored',
          description: 'Successfully reconnected and loaded your verification status.',
        });
      }
    } catch (err: any) {
      console.error('Error fetching verification status:', err);
      
      // Handle different types of errors with specific messages
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        setError('Network timeout. Please check your internet connection and try again.');
      } else if (err.response && err.response.status === 404) {
        setError('User profile not found. The account may have been deleted or not properly created.');
      } else if (err.response && err.response.status === 403) {
        setError('Access denied. You may not have permission to view this information.');
      } else if (err.response && err.response.status >= 500) {
        setError('Server error. Our team has been notified. Please try again later.');
      } else if (err.message.includes('Firebase') || err.code?.includes('auth/')) {
        setError('Authentication error. Please sign out and sign in again.');
      } else {
        setError(err.message || 'Failed to load verification status');
      }
      
      toast({
        title: 'Error Loading Verification Status',
        description: error || 'Please try again or contact support if the problem persists.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Update verification status
   * 
   * This function updates specific aspects of the verification status based on
   * the provided updates object. It includes enhanced error handling with
   * specific error messages depending on what's being updated.
   * 
   * @param updates - Object containing verification fields to update
   */
  const updateStatus = async (updates: Partial<VerificationState>) => {
    if (!userId) {
      setError('User ID is missing. Please try registering again or contact support.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Track which verification types are being updated
    const updateTypes: string[] = [];
    if (updates.isEmailVerified !== undefined) updateTypes.push('email verification');
    if (updates.isPhoneVerified !== undefined) updateTypes.push('phone verification');
    if (updates.isApproved !== undefined) updateTypes.push('approval status');
    if (updates.isMfaEnabled !== undefined) updateTypes.push('MFA status');
    
    // Create a descriptive update message
    const updateDescription = updateTypes.length > 0 
      ? `Updating ${updateTypes.join(', ')}` 
      : 'Updating verification status';
      
    try {
      // Start with validation
      if (Object.keys(updates).length === 0) {
        throw new Error('No update fields provided');
      }
      
      // Create an array of update operations
      const updateOperations = [];
      
      // Determine which update function to call based on the updates object
      if (updates.isEmailVerified !== undefined) {
        updateOperations.push(updateEmailVerificationStatus(userId, updates.isEmailVerified));
      }
      
      if (updates.isPhoneVerified !== undefined) {
        updateOperations.push(updatePhoneVerificationStatus(userId, updates.isPhoneVerified));
      }
      
      if (updates.isApproved !== undefined) {
        updateOperations.push(updateApprovalStatus(userId, updates.isApproved));
      }
      
      if (updates.isMfaEnabled !== undefined) {
        updateOperations.push(updateMfaStatus(userId, updates.isMfaEnabled));
      }
      
      // Execute all update operations in parallel
      await Promise.all(updateOperations);
      
      // Update local state with new values
      setVerificationState(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: 'Success',
        description: `${updateDescription} completed successfully.`,
      });
    } catch (err: any) {
      console.error('Error updating verification status:', err);
      
      // Handle different types of errors with specific messages
      if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
        setError('Network timeout. Please check your internet connection and try again.');
      } else if (err.response && err.response.status === 404) {
        setError('User profile not found. The account may have been deleted or not properly created.');
      } else if (err.response && err.response.status === 403) {
        setError('Access denied. You do not have permission to update this information.');
      } else if (err.response && err.response.status >= 500) {
        setError('Server error while updating. Our team has been notified. Please try again later.');
      } else if (err.message.includes('Firebase') || err.code?.includes('auth/')) {
        setError('Authentication error. Please sign out and sign in again before updating.');
      } else if (err.message === 'No update fields provided') {
        setError('No valid update data provided. Please try again with proper values.');
      } else {
        setError(err.message || `Failed to update ${updateDescription}`);
      }
      
      // Show toast with specific update type that failed
      toast({
        title: `Error Updating ${updateTypes.join(', ')}`,
        description: error || 'Please try again or contact support if the problem persists.',
        variant: 'destructive',
      });
      
      throw err; // Re-throw the error for the caller to handle
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Reset error state and potentially retry operation
   * 
   * This function clears the error state and optionally
   * refreshes the verification status if requested.
   * 
   * @param retry - Whether to retry fetching the verification status
   */
  const resetError = (retry: boolean = false) => {
    setError(null);
    
    if (retry && userId) {
      // Include a small delay to ensure UI updates before retry
      setTimeout(() => {
        refreshStatus();
      }, 500);
    }
  };
  
  /**
   * Context value for the AdminVerificationProvider
   * This object contains all the values and functions exposed by the context
   */
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