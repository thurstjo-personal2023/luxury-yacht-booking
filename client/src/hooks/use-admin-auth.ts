import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode,
  useCallback,
  createElement
} from 'react';
import { useLocation } from 'wouter';
import { useToast } from './use-toast';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import { authService } from '@/services/auth/auth-service';

// Utility function to decode JWT tokens
function decodeJwt(token: string): any {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
}

// Admin user type with additional fields
interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  permissions: string[];
  role: 'admin' | 'super_admin' | 'ADMIN' | 'SUPER_ADMIN' | 'MODERATOR';
  phoneNumber?: string | null;
  lastLoginAt?: any; // Firestore timestamp
  lastActivityAt?: any; // Firestore timestamp
}

// Admin authentication context type
interface AdminAuthContextType {
  adminUser: AdminUser | null;
  isLoading: boolean;
  error: string | null;
  adminSignIn: (email: string, password: string) => Promise<FirebaseUser>;
  adminSignOut: () => Promise<void>;
  verifyMfa: (otp: string) => Promise<boolean>;
  setupMfa: (phoneNumber: string) => Promise<string>;
  confirmMfaSetup: (otp: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
  verifyAdminSession: () => Promise<boolean>;
  sessionTimeout: number;
}

// Create the context with default values
const AdminAuthContext = createContext<AdminAuthContextType>({
  adminUser: null,
  isLoading: true,
  error: null,
  adminSignIn: async () => { throw new Error('Not implemented'); },
  adminSignOut: async () => { throw new Error('Not implemented'); },
  verifyMfa: async () => { throw new Error('Not implemented'); },
  setupMfa: async () => { throw new Error('Not implemented'); },
  confirmMfaSetup: async () => { throw new Error('Not implemented'); },
  refreshSession: async () => { throw new Error('Not implemented'); },
  verifyAdminSession: async () => { throw new Error('Not implemented'); },
  sessionTimeout: 900, // 15 minutes default
});

// Custom hook to use the admin auth context
export const useAdminAuth = () => useContext(AdminAuthContext);

// Provider component for admin authentication
interface AdminAuthProviderProps {
  children: ReactNode;
  sessionTimeout?: number; // Session timeout in seconds
}

export function AdminAuthProvider({ 
  children, 
  sessionTimeout = 900 // 15 minutes default
}: AdminAuthProviderProps) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth();
  const db = getFirestore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Listen for auth state changes using the centralized authService
  useEffect(() => {
    console.log('AdminAuthProvider: Setting up auth state listener via authService');
    
    // Use the centralized authService for auth state changes
    const unsubscribe = authService.onAuthStateChanged(async (user: FirebaseUser | null) => {
      console.log('AdminAuthProvider: Auth state changed:', user ? 'User signed in' : 'User signed out');
      
      if (user) {
        try {
          // Check if user is an admin
          const userDoc = await getDoc(doc(db, 'admin_users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('AdminAuthProvider: User is an admin, setting up admin session');
            
            // Set session flag in localStorage
            localStorage.setItem('adminSessionActive', 'true');
            
            // Create admin user object
            setAdminUser({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              mfaEnabled: userData.mfaEnabled || false,
              mfaVerified: userData.mfaVerified || false,
              permissions: userData.permissions || [],
              role: userData.role || 'admin',
              phoneNumber: userData.phone || user.phoneNumber,
              lastLoginAt: userData.lastLoginAt,
              lastActivityAt: userData.lastActivityAt
            });
          } else {
            console.log('AdminAuthProvider: User is not an admin');
            // User is not an admin, but don't sign them out automatically
            // This allows regular users to stay signed in even if they're not admins
            localStorage.removeItem('adminSessionActive');
            setAdminUser(null);
          }
        } catch (err) {
          console.error('AdminAuthProvider: Error fetching admin user data:', err);
          setError('Failed to verify admin credentials');
        }
      } else {
        // User is signed out
        console.log('AdminAuthProvider: User is signed out, clearing admin session');
        localStorage.removeItem('adminSessionActive');
        setAdminUser(null);
      }
      
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [db]);

  // Sign in as admin
  const adminSignIn = async (email: string, password: string): Promise<FirebaseUser> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('AdminAuthProvider: Attempting to sign in admin user');
      
      // Use the centralized authService for sign-in
      // This will trigger our auth state change listener with the new user
      const authResult = await authService.signIn(email, password);
      console.log('AdminAuthProvider: User signed in, checking admin status');
      
      // Check if user is an admin
      const userDoc = await getDoc(doc(db, 'admin_users', authResult.user.uid));
      
      if (!userDoc.exists()) {
        console.log('AdminAuthProvider: User is not an admin, signing out');
        // User is not an admin, sign them out
        await authService.signOut();
        localStorage.removeItem('adminSessionActive');
        throw new Error('Invalid admin credentials');
      }
      
      console.log('AdminAuthProvider: Admin sign-in successful');
      
      // Call login audit API
      try {
        const response = await fetch('/api/admin/login-audit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await authResult.user.getIdToken()}`
          }
        });
        
        if (!response.ok) {
          console.warn('Failed to record login audit:', await response.text());
        }
      } catch (auditError) {
        console.warn('Error recording login audit:', auditError);
      }
      
      return authResult.user;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign in';
      console.error('Admin sign in error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out admin user
  const adminSignOut = async (): Promise<void> => {
    try {
      console.log('AdminAuthProvider: Signing out admin user');
      // Use centralized authService for sign-out
      await authService.signOut();
      localStorage.removeItem('adminSessionActive');
      setAdminUser(null);
      setLocation('/admin-login');
      console.log('AdminAuthProvider: Admin user signed out successfully');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign out';
      console.error('Admin sign out error:', err);
      setError(errorMessage);
      throw err;
    }
  };

  // Verify MFA code
  const verifyMfa = async (otp: string): Promise<boolean> => {
    try {
      // Use the current user from the centralized auth service
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        console.error('AdminAuthProvider: Cannot verify MFA - no authenticated user');
        throw new Error('No authenticated user');
      }
      
      console.log('AdminAuthProvider: Verifying MFA code');
      
      // In a real implementation, this would verify OTP against Firebase Auth
      // For now, we'll simulate the verification with a simple check
      if (otp === '123456') {
        // Update user doc to mark MFA as verified for this session
        await updateDoc(doc(db, 'admin_users', currentUser.uid), {
          mfaVerified: true,
          lastActivityAt: new Date()
        });
        
        // Update local state
        setAdminUser(prev => prev ? { ...prev, mfaVerified: true } : null);
        
        console.log('AdminAuthProvider: MFA code verified successfully');
        return true;
      }
      
      console.error('AdminAuthProvider: Invalid MFA verification code');
      throw new Error('Invalid verification code');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to verify MFA';
      console.error('AdminAuthProvider: MFA verification error:', err);
      setError(errorMessage);
      throw err;
    }
  };

  // Set up MFA for user
  const setupMfa = async (phoneNumber: string): Promise<string> => {
    try {
      // Use the current user from the centralized auth service
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        console.error('AdminAuthProvider: Cannot setup MFA - no authenticated user');
        throw new Error('No authenticated user');
      }
      
      console.log('AdminAuthProvider: Setting up MFA with phone number');
      
      // In a real implementation, this would send OTP to the phone via Firebase Auth
      // For now, we'll simulate the setup process
      await updateDoc(doc(db, 'admin_users', currentUser.uid), {
        phone: phoneNumber,
        mfaEnabled: false, // Will be set to true after verification
        lastActivityAt: new Date()
      });
      
      // Update local state
      setAdminUser(prev => prev ? { ...prev, phoneNumber } : null);
      
      console.log('AdminAuthProvider: MFA setup successful, waiting for verification');
      
      // Return verification ID (would come from Firebase in real implementation)
      return 'verification-id-123456';
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to set up MFA';
      console.error('AdminAuthProvider: MFA setup error:', err);
      setError(errorMessage);
      throw err;
    }
  };

  // Confirm MFA setup with verification code
  const confirmMfaSetup = async (otp: string): Promise<boolean> => {
    try {
      // Use the current user from the centralized auth service
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        console.error('AdminAuthProvider: Cannot confirm MFA setup - no authenticated user');
        throw new Error('No authenticated user');
      }
      
      console.log('AdminAuthProvider: Confirming MFA setup with verification code');
      
      // In a real implementation, this would confirm OTP via Firebase Auth
      // For now, we'll simulate the confirmation
      if (otp === '123456') {
        // Update user doc to mark MFA as enabled and verified
        await updateDoc(doc(db, 'admin_users', currentUser.uid), {
          mfaEnabled: true,
          mfaVerified: true,
          lastActivityAt: new Date()
        });
        
        // Update local state
        setAdminUser(prev => prev ? { 
          ...prev, 
          mfaEnabled: true,
          mfaVerified: true  
        } : null);
        
        console.log('AdminAuthProvider: MFA setup confirmed successfully');
        return true;
      }
      
      console.error('AdminAuthProvider: Invalid MFA confirmation code');
      throw new Error('Invalid verification code');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to confirm MFA setup';
      console.error('AdminAuthProvider: MFA confirmation error:', err);
      setError(errorMessage);
      throw err;
    }
  };

  // Refresh the session
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      // Use the current user from the centralized auth service
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !adminUser) {
        console.error('AdminAuthProvider: Cannot refresh session - no authenticated user');
        throw new Error('No authenticated user');
      }
      
      console.log('AdminAuthProvider: Refreshing admin session');
      
      // Update last activity timestamp
      await updateDoc(doc(db, 'admin_users', currentUser.uid), {
        lastActivityAt: new Date()
      });
      
      // Call activity API endpoint with token from authService
      const idToken = await authService.getIdToken();
      const response = await fetch('/api/admin/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        console.error('AdminAuthProvider: Failed to refresh session via API');
        throw new Error('Failed to refresh session');
      }
      
      console.log('AdminAuthProvider: Session refreshed successfully');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to refresh session';
      console.error('AdminAuthProvider: Session refresh error:', err);
      toast({
        title: 'Session Refresh Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  }, [adminUser, db, toast]);
  
  // Verify admin session is valid
  const verifyAdminSession = useCallback(async (): Promise<boolean> => {
    try {
      console.log('AdminAuthProvider: Verifying admin session');
      
      // Check if there's a current user
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        console.log('AdminAuthProvider: No current user found');
        return false;
      }
      
      // Get a fresh token and verify it's valid
      const idToken = await authService.getIdToken(true);
      if (!idToken) {
        console.log('AdminAuthProvider: Failed to get fresh ID token');
        return false;
      }
      
      // Verify admin status in Firestore
      const userDoc = await getDoc(doc(db, 'admin_users', currentUser.uid));
      if (!userDoc.exists()) {
        console.log('AdminAuthProvider: User is not an admin');
        return false;
      }
      
      // Decode the token to get role information
      const decodedToken = decodeJwt(idToken);
      const adminRole = decodedToken?.role;
      
      // Check if the role is an admin role
      const isAdmin = 
        adminRole === 'admin' || 
        adminRole === 'ADMIN' || 
        adminRole === 'super_admin' || 
        adminRole === 'SUPER_ADMIN' || 
        adminRole === 'MODERATOR';
      
      if (!isAdmin) {
        console.log('AdminAuthProvider: User has no admin role in token claims');
        return false;
      }
      
      // Check if session has timed out
      const lastActivity = localStorage.getItem('adminLastActivity');
      if (lastActivity) {
        const lastActivityTime = parseInt(lastActivity, 10);
        const currentTime = Date.now();
        const timeSinceLastActivity = (currentTime - lastActivityTime) / 1000; // In seconds
        
        if (timeSinceLastActivity > sessionTimeout) {
          console.log(`AdminAuthProvider: Admin session timed out (${timeSinceLastActivity.toFixed(1)}s > ${sessionTimeout}s)`);
          return false;
        }
      }
      
      // All checks passed, update the last activity time
      localStorage.setItem('adminLastActivity', Date.now().toString());
      console.log('AdminAuthProvider: Admin session verified successfully');
      return true;
    } catch (err: any) {
      console.error('AdminAuthProvider: Session verification error:', err);
      return false;
    }
  }, [db, sessionTimeout]);

  // Context value
  const contextValue = {
    adminUser,
    isLoading,
    error,
    adminSignIn,
    adminSignOut,
    verifyMfa,
    setupMfa,
    confirmMfaSetup,
    refreshSession,
    verifyAdminSession,
    sessionTimeout,
  };

  // Note: We're returning JSX, but TypeScript is having trouble parsing it
  // This is a common issue with JSX in TypeScript files
  return createElement(
    AdminAuthContext.Provider,
    { value: contextValue },
    children
  );
}