import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useNavigate, useLocation } from 'wouter';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

// Admin user interface with additional properties
interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string;
  isAdmin: boolean;
  mfaVerified: boolean;
  mfaEnabled?: boolean;
  phoneNumber?: string | null;
  lastActivity: Date;
  sessionExpires: Date;
  
  // Firebase methods
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

// Admin auth context type
interface AdminAuthContextType {
  adminUser: AdminUser | null;
  loading: boolean;
  adminSignIn: (email: string, password: string) => Promise<{ user: FirebaseUser; requiresMfa: boolean }>;
  adminSignOut: () => Promise<void>;
  refreshSession: () => void;
  verifyMfa: (code: string) => Promise<boolean>;
  sessionTimeRemaining: number; // in seconds
  isSessionExpiringSoon: boolean;
}

// Create context with undefined default
const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// Default session timeout in seconds (15 minutes)
const DEFAULT_SESSION_TIMEOUT = 15 * 60;
// Warning threshold in seconds (2 minutes before expiry)
const WARNING_THRESHOLD = 2 * 60;

// Props for the AdminAuthProvider component
interface AdminAuthProviderProps {
  children: ReactNode;
  sessionTimeout?: number; // in seconds
}

// Admin authentication provider component
export function AdminAuthProvider({ 
  children, 
  sessionTimeout = DEFAULT_SESSION_TIMEOUT 
}: AdminAuthProviderProps) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(sessionTimeout);
  const [isSessionExpiringSoon, setIsSessionExpiringSoon] = useState(false);
  
  const { toast } = useToast();
  const auth = getAuth();
  const [, navigate] = useLocation();
  const { user } = useAuth(); // Use the main auth context for user state

  // Initialize user session when the component mounts
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get user token to check claims
          const tokenResult = await firebaseUser.getIdTokenResult();
          const role = tokenResult.claims.role;
          
          // Check if user is an admin
          const isAdmin = role === 'admin' || role === 'producer';
          
          if (!isAdmin) {
            // Not an admin user
            setAdminUser(null);
            setLoading(false);
            return;
          }
          
          // Check if MFA is verified (will be implemented based on your system)
          // For now, we'll assume it's not verified initially
          const mfaVerified = false;
          
          // Set admin user with session information
          const now = new Date();
          const expires = new Date(now.getTime() + sessionTimeout * 1000);
          
          setAdminUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: role,
            isAdmin,
            mfaVerified,
            phoneNumber: firebaseUser.phoneNumber,
            lastActivity: now,
            sessionExpires: expires,
            getIdToken: firebaseUser.getIdToken.bind(firebaseUser),
          });
          
          // Start session timer
          startSessionTimer(sessionTimeout);
        } else {
          // No user logged in
          setAdminUser(null);
        }
      } catch (error) {
        console.error('Error in admin auth state change:', error);
        setAdminUser(null);
      } finally {
        setLoading(false);
      }
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [auth, sessionTimeout]);

  // Handle user activity to extend session
  useEffect(() => {
    if (!adminUser) return;
    
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'click'];
    
    const handleActivity = () => {
      refreshSession();
    };
    
    // Add event listeners for user activity
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [adminUser]);

  // Start or reset the session timer
  const startSessionTimer = (seconds: number) => {
    setSessionTimeRemaining(seconds);
    setIsSessionExpiringSoon(false);
    
    // Clear any existing interval
    sessionStorage.removeItem('adminSessionInterval');
    
    // Start a new interval
    const intervalId = setInterval(() => {
      setSessionTimeRemaining(prev => {
        const newTime = prev - 1;
        
        // Check if session is expiring soon
        if (newTime <= WARNING_THRESHOLD && !isSessionExpiringSoon) {
          setIsSessionExpiringSoon(true);
          
          // Show warning toast
          toast({
            title: 'Session Expiring Soon',
            description: 'Your session will expire in 2 minutes. Continue working to extend.',
            duration: 10000,
          });
        }
        
        // Check if session has expired
        if (newTime <= 0) {
          // Session expired, sign out
          adminSignOut();
          clearInterval(Number(sessionStorage.getItem('adminSessionInterval')));
          
          toast({
            title: 'Session Expired',
            description: 'Your session has expired due to inactivity.',
            variant: 'destructive',
          });
          
          navigate('/admin-login');
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
    
    // Store interval ID in session storage
    sessionStorage.setItem('adminSessionInterval', intervalId.toString());
    
    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  };

  // Refresh the user session
  const refreshSession = () => {
    if (!adminUser) return;
    
    // Update last activity time
    const now = new Date();
    const expires = new Date(now.getTime() + sessionTimeout * 1000);
    
    setAdminUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        lastActivity: now,
        sessionExpires: expires,
      };
    });
    
    // Reset the timer
    startSessionTimer(sessionTimeout);
  };

  // Admin sign in function
  const adminSignIn = async (email: string, password: string) => {
    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get token to check role
      const tokenResult = await user.getIdTokenResult();
      const role = tokenResult.claims.role;
      
      // Check if user is an admin
      if (role !== 'admin' && role !== 'producer') {
        // Not an admin, sign out
        await firebaseSignOut(auth);
        throw new Error('This account does not have administrative privileges');
      }
      
      // Check if MFA is required
      // For initial implementation, we'll assume MFA is always required
      const requiresMfa = true;
      
      return { user, requiresMfa };
    } catch (error) {
      // Handle sign-in errors
      console.error('Admin sign in error:', error);
      throw error;
    }
  };

  // Verify MFA function (simplified for now)
  const verifyMfa = async (code: string): Promise<boolean> => {
    // This is a placeholder - actual implementation will vary based on your MFA approach
    // We'll just return true for now
    try {
      if (!adminUser) throw new Error('No admin user found');
      
      // Simulate verification
      if (code === '000000') {
        throw new Error('Invalid verification code');
      }
      
      // Update user with MFA verified status
      setAdminUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          mfaVerified: true,
        };
      });
      
      return true;
    } catch (error) {
      console.error('MFA verification error:', error);
      throw error;
    }
  };

  // Admin sign out function
  const adminSignOut = async () => {
    try {
      // Clear session timer
      const intervalId = sessionStorage.getItem('adminSessionInterval');
      if (intervalId) {
        clearInterval(Number(intervalId));
        sessionStorage.removeItem('adminSessionInterval');
      }
      
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      // Clear admin user state
      setAdminUser(null);
      
      // Redirect to login
      navigate('/admin-login');
    } catch (error) {
      console.error('Admin sign out error:', error);
      throw error;
    }
  };

  // Build context value
  const contextValue: AdminAuthContextType = {
    adminUser,
    loading,
    adminSignIn,
    adminSignOut,
    refreshSession,
    verifyMfa,
    sessionTimeRemaining,
    isSessionExpiringSoon,
  };

  // Return provider with context value
  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
}

// Hook to use admin auth context
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

// Session timeout display helper
export function formatSessionTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}