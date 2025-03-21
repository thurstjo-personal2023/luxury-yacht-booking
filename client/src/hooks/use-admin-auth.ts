import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode,
  useCallback
} from 'react';
import { useLocation, navigate } from 'wouter';
import { useToast } from './use-toast';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  User as FirebaseUser,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';

// Admin user type with additional fields
interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  permissions: string[];
  role: 'admin' | 'super_admin';
  phoneNumber?: string | null;
  lastLoginAt?: any; // Firestore timestamp
  lastActivityAt?: any; // Firestore timestamp
}

// Admin authentication context type
interface AdminAuthContextType {
  adminUser: AdminUser | null;
  loading: boolean;
  error: string | null;
  adminSignIn: (email: string, password: string) => Promise<FirebaseUser>;
  adminSignOut: () => Promise<void>;
  verifyMfa: (otp: string) => Promise<boolean>;
  setupMfa: (phoneNumber: string) => Promise<string>;
  confirmMfaSetup: (otp: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
  sessionTimeout: number;
}

// Create the context with default values
const AdminAuthContext = createContext<AdminAuthContextType>({
  adminUser: null,
  loading: true,
  error: null,
  adminSignIn: async () => { throw new Error('Not implemented'); },
  adminSignOut: async () => { throw new Error('Not implemented'); },
  verifyMfa: async () => { throw new Error('Not implemented'); },
  setupMfa: async () => { throw new Error('Not implemented'); },
  confirmMfaSetup: async () => { throw new Error('Not implemented'); },
  refreshSession: async () => { throw new Error('Not implemented'); },
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth();
  const db = getFirestore();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check if user is an admin
          const userDoc = await getDoc(doc(db, 'admin_users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
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
            // User is not an admin, sign them out
            await signOut(auth);
            localStorage.removeItem('adminSessionActive');
            setAdminUser(null);
          }
        } catch (err) {
          console.error('Error fetching admin user data:', err);
          setError('Failed to verify admin credentials');
        }
      } else {
        // User is signed out
        localStorage.removeItem('adminSessionActive');
        setAdminUser(null);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [auth, db]);

  // Sign in as admin
  const adminSignIn = async (email: string, password: string): Promise<FirebaseUser> => {
    try {
      setLoading(true);
      setError(null);
      
      // Set persistence to LOCAL
      await setPersistence(auth, browserLocalPersistence);
      
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user is an admin
      const userDoc = await getDoc(doc(db, 'admin_users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        // User is not an admin, sign them out
        await signOut(auth);
        localStorage.removeItem('adminSessionActive');
        throw new Error('Invalid admin credentials');
      }
      
      // Call login audit API
      try {
        const response = await fetch('/api/admin/login-audit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await userCredential.user.getIdToken()}`
          }
        });
        
        if (!response.ok) {
          console.warn('Failed to record login audit:', await response.text());
        }
      } catch (auditError) {
        console.warn('Error recording login audit:', auditError);
      }
      
      return userCredential.user;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign in';
      console.error('Admin sign in error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out admin user
  const adminSignOut = async (): Promise<void> => {
    try {
      await signOut(auth);
      localStorage.removeItem('adminSessionActive');
      setAdminUser(null);
      setLocation('/admin-login');
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
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      // In a real implementation, this would verify OTP against Firebase Auth
      // For now, we'll simulate the verification with a simple check
      if (otp === '123456') {
        // Update user doc to mark MFA as verified for this session
        await updateDoc(doc(db, 'admin_users', auth.currentUser.uid), {
          mfaVerified: true,
          lastActivityAt: new Date()
        });
        
        // Update local state
        setAdminUser(prev => prev ? { ...prev, mfaVerified: true } : null);
        
        return true;
      }
      
      throw new Error('Invalid verification code');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to verify MFA';
      console.error('MFA verification error:', err);
      setError(errorMessage);
      throw err;
    }
  };

  // Set up MFA for user
  const setupMfa = async (phoneNumber: string): Promise<string> => {
    try {
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      // In a real implementation, this would send OTP to the phone via Firebase Auth
      // For now, we'll simulate the setup process
      await updateDoc(doc(db, 'admin_users', auth.currentUser.uid), {
        phone: phoneNumber,
        mfaEnabled: false, // Will be set to true after verification
        lastActivityAt: new Date()
      });
      
      // Update local state
      setAdminUser(prev => prev ? { ...prev, phoneNumber } : null);
      
      // Return verification ID (would come from Firebase in real implementation)
      return 'verification-id-123456';
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to set up MFA';
      console.error('MFA setup error:', err);
      setError(errorMessage);
      throw err;
    }
  };

  // Confirm MFA setup with verification code
  const confirmMfaSetup = async (otp: string): Promise<boolean> => {
    try {
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      // In a real implementation, this would confirm OTP via Firebase Auth
      // For now, we'll simulate the confirmation
      if (otp === '123456') {
        // Update user doc to mark MFA as enabled and verified
        await updateDoc(doc(db, 'admin_users', auth.currentUser.uid), {
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
        
        return true;
      }
      
      throw new Error('Invalid verification code');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to confirm MFA setup';
      console.error('MFA confirmation error:', err);
      setError(errorMessage);
      throw err;
    }
  };

  // Refresh the session
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      if (!auth.currentUser || !adminUser) {
        throw new Error('No authenticated user');
      }
      
      // Update last activity timestamp
      await updateDoc(doc(db, 'admin_users', auth.currentUser.uid), {
        lastActivityAt: new Date()
      });
      
      // Call activity API endpoint
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/admin/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh session');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to refresh session';
      console.error('Session refresh error:', err);
      toast({
        title: 'Session Refresh Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  }, [auth, adminUser, db, toast]);

  // Context value
  const contextValue: AdminAuthContextType = {
    adminUser,
    loading,
    error,
    adminSignIn,
    adminSignOut,
    verifyMfa,
    setupMfa,
    confirmMfaSetup,
    refreshSession,
    sessionTimeout,
  };

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
}