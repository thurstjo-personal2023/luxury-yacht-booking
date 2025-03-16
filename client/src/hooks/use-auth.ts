import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { UserRoleType } from '@shared/user-schema';

// User model with Firebase authentication properties
interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: string;
  phoneNumber?: string | null;
  photoURL?: string | null;
}

// Context type definition
interface AuthContextType {
  user: AuthUser | null;
  currentUser: AuthUser | null; // Alias for user, for compatibility
  userRole: UserRoleType | null; // Explicit role accessor for easier role checks
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

// Create the auth context with undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

// Authentication provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log('Auth state changed: User signed in, ID:', firebaseUser.uid);
          
          // Force token refresh to ensure the latest claims
          await firebaseUser.getIdToken(true);
          console.log('Auth token refreshed');
          
          // Use the shared mapFirebaseUser function to get user with role
          const mappedUser = await mapFirebaseUser(firebaseUser);
          console.log('Auth state changed - user mapped with role:', mappedUser.role);
          
          // If role is missing from token but user exists, try to sync with Firestore
          if (!mappedUser.role) {
            console.log('Role missing from token after auth state change, attempting to sync');
            try {
              // Dynamically import to avoid circular dependencies
              const { syncAuthClaims } = await import('@/lib/user-profile-utils');
              const syncResult = await syncAuthClaims();
              
              if (syncResult.success && syncResult.newRole) {
                console.log('Successfully synchronized claims, new role:', syncResult.newRole);
                mappedUser.role = syncResult.newRole;
              }
            } catch (syncError) {
              console.error('Failed to sync claims after auth state change:', syncError);
            }
          }
          
          // Update auth token in localStorage for API calls
          const token = await firebaseUser.getIdToken();
          localStorage.setItem('authToken', token);
          console.log('Auth token stored in localStorage');
          
          setUser(mappedUser);
        } else {
          console.log('Auth state change: User signed out');
          localStorage.removeItem('authToken');
          console.log('Auth token removed from localStorage');
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
        // Still set user to null if we can't process the user
        localStorage.removeItem('authToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const signIn = async (email: string, password: string): Promise<AuthUser> => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Force token refresh to ensure we have the latest claims
      await userCredential.user.getIdToken(true);
      
      // After forcing refresh, get the user with updated role information
      const user = await mapFirebaseUser(userCredential.user);
      console.log('User signed in with initial role from token:', user.role);
      
      // If role is missing from token, try to get it from Firestore using API
      if (!user.role) {
        console.log('Role missing from token, attempting to synchronize with Firestore');
        try {
          // Dynamically import to avoid circular dependencies
          const { syncAuthClaims } = await import('@/lib/user-profile-utils');
          const syncResult = await syncAuthClaims();
          
          if (syncResult.success && syncResult.newRole) {
            console.log('Successfully synchronized claims, new role:', syncResult.newRole);
            // Update user object with the role from synchronization
            user.role = syncResult.newRole;
          } else {
            console.warn('Role synchronization failed or returned no role');
          }
        } catch (syncError) {
          console.error('Error during role synchronization:', syncError);
        }
      }
      
      // Store the updated user in state
      setUser(user);
      
      // Store authentication token in localStorage for API calls
      const token = await userCredential.user.getIdToken();
      localStorage.setItem('authToken', token);
      console.log('Auth token stored in localStorage');
      
      return user;
    } catch (error: any) {
      let errorMessage = 'Failed to sign in';
      
      // Handle specific Firebase auth errors with more user-friendly messages
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many unsuccessful login attempts. Please try again later';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error.code) {
        errorMessage = `Authentication error: ${error.code}`;
      }
      
      toast({
        title: 'Sign In Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string): Promise<AuthUser> => {
    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const user = await mapFirebaseUser(userCredential.user);
      setUser(user);
      return user;
    } catch (error: any) {
      let errorMessage = 'Failed to create account';
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.code) {
        errorMessage = `Registration error: ${error.code}`;
      }
      
      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

    // Calculate the user role from the user object
  const userRole = user?.role as UserRoleType | null;
  
  // Create the context value object
  const contextValue: AuthContextType = {
    user,
    currentUser: user,
    userRole,
    loading,
    signIn,
    signUp,
    signOut
  };
  
  // Return the auth context provider with all values
  return React.createElement(
    AuthContext.Provider,
    { value: contextValue },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Alias for useAuth for compatibility with different naming conventions
export const useAuthContext = useAuth;

// Helper function to map Firebase user to our AuthUser type
async function mapFirebaseUser(firebaseUser: FirebaseUser): Promise<AuthUser> {
  try {
    // Get custom claims including role from token
    const token = await firebaseUser.getIdTokenResult();
    const role = token.claims.role as string | undefined;
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      phoneNumber: firebaseUser.phoneNumber,
      photoURL: firebaseUser.photoURL,
      role: role,
    };
  } catch (error) {
    console.error('Error getting user token claims in mapFirebaseUser:', error);
    // Fallback to basic user info without role
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      phoneNumber: firebaseUser.phoneNumber,
      photoURL: firebaseUser.photoURL,
    };
  }
}