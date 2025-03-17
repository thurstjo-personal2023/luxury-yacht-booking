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
  
  // Firebase Auth methods for token/claims management
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  getIdTokenResult: (forceRefresh?: boolean) => Promise<any>;
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
  refreshUserRole: () => Promise<UserRoleType | null>; // Method to refresh role from token
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
          console.log('🔵 Auth state changed: User signed in, ID:', firebaseUser.uid);
          
          // Force token refresh to ensure the latest claims
          try {
            await firebaseUser.getIdToken(true);
            console.log('✅ Auth token refreshed successfully');
          } catch (refreshError) {
            console.error('❌ Error refreshing auth token:', refreshError);
          }
          
          // Use the shared mapFirebaseUser function to get user with role
          const mappedUser = await mapFirebaseUser(firebaseUser);
          console.log('📋 Auth state changed - user mapped with initial role:', mappedUser.role);
          
          // Always try to synchronize with Firestore, not just when role is missing
          console.log('🔄 Always attempting to sync claims during auth state change');
          
          try {
            // Dynamically import to avoid circular dependencies
            const { syncAuthClaims } = await import('@/lib/user-profile-utils');
            const syncResult = await syncAuthClaims();
            
            if (syncResult.success) {
              console.log('✅ Auth state change - claims synchronized successfully:', syncResult);
              
              // If we have a new role from sync that differs from the initial token, update it
              if (syncResult.newRole && syncResult.newRole !== mappedUser.role) {
                console.log(`🔄 Auth state change - updating role from "${mappedUser.role || 'undefined'}" to "${syncResult.newRole}"`);
                mappedUser.role = syncResult.newRole;
              } else {
                console.log('📋 Auth state change - role remained the same after sync:', mappedUser.role);
              }
            } else {
              console.warn('⚠️ Auth state change - role synchronization failed:', syncResult.message);
            }
          } catch (syncError) {
            console.error('❌ Auth state change - error during role synchronization:', syncError);
          }
          
          // Verify the role is a valid user role type
          const validRoles = ['consumer', 'producer', 'partner'];
          if (mappedUser.role && !validRoles.includes(mappedUser.role as UserRoleType)) {
            console.warn(`⚠️ Auth state change - invalid role type "${mappedUser.role}" found after sync, clearing it`);
            mappedUser.role = undefined;
          }
          
          // If we still don't have a role after sync, default to consumer for safety
          if (!mappedUser.role) {
            console.warn('⚠️ Auth state change - no valid role determined after sync, defaulting to "consumer"');
            mappedUser.role = 'consumer';
            console.log('⚠️ Using fallback role assignment - should be temporary');
          }
          
          // Update auth token in localStorage for API calls
          try {
            const token = await firebaseUser.getIdToken();
            localStorage.setItem('authToken', token);
            console.log('✅ Auth token stored in localStorage');
          } catch (tokenError) {
            console.error('❌ Error getting/storing token:', tokenError);
          }
          
          console.log('✅ Auth state change - setting user with final role:', mappedUser.role);
          setUser(mappedUser);
        } else {
          console.log('🔵 Auth state change: User signed out');
          localStorage.removeItem('authToken');
          console.log('✅ Auth token removed from localStorage');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Error in auth state change handler:', error);
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
    console.log('Beginning sign-in process for user:', email);
    
    try {
      setLoading(true);
      
      // Perform Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase auth successful, retrieving user details');
      
      // Force token refresh to ensure we have the latest claims
      await userCredential.user.getIdToken(true);
      console.log('Forced token refresh to get latest claims');
      
      // Map Firebase user to our user format with enhanced debugging
      const user = await mapFirebaseUser(userCredential.user);
      console.log('User mapped with initial role from token:', user.role);
      
      // Always attempt to synchronize with Firestore for consistent role information
      console.log('Attempting role synchronization regardless of initial token state');
      
      try {
        // Dynamically import to avoid circular dependencies
        const { syncAuthClaims } = await import('@/lib/user-profile-utils');
        
        // Always call syncAuthClaims to ensure roles are synchronized
        console.log('Calling syncAuthClaims to verify role information');
        const syncResult = await syncAuthClaims();
        
        if (syncResult.success) {
          console.log('Role synchronization completed with result:', syncResult);
          
          // If we have a new role from sync that differs from the initial token, update it
          if (syncResult.newRole && syncResult.newRole !== user.role) {
            console.log(`Updating user role from "${user.role || 'undefined'}" to "${syncResult.newRole}"`);
            user.role = syncResult.newRole;
          } else {
            console.log('Role remained the same after synchronization:', user.role);
          }
        } else {
          console.warn('Role synchronization failed:', syncResult.message);
        }
      } catch (syncError) {
        console.error('Error during role synchronization:', syncError);
      }
      
      // Verify the role is a valid user role type
      const validRoles = ['consumer', 'producer', 'partner'];
      if (user.role && !validRoles.includes(user.role as UserRoleType)) {
        console.warn(`Invalid role type "${user.role}" found after sync, clearing it`);
        user.role = undefined;
      }
      
      // If we still don't have a role after sync, default to consumer for safety
      if (!user.role) {
        console.warn('No valid role determined after synchronization, defaulting to "consumer"');
        user.role = 'consumer';
        
        // This is a fallback only - in production we should investigate why sync failed
        console.log('⚠️ Using fallback role assignment - should be temporary');
      }
      
      // Store the updated user in state
      setUser(user);
      console.log('User stored in auth state with role:', user.role);
      
      // Store authentication token in localStorage for API calls
      try {
        // Always get a fresh token after sync attempts
        const token = await userCredential.user.getIdToken(true);
        localStorage.setItem('authToken', token);
        console.log('Fresh auth token stored in localStorage');
      } catch (tokenError) {
        console.error('Error getting/storing token:', tokenError);
      }
      
      console.log('Sign-in process completed successfully');
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
  
  /**
   * Refresh the user's role from their ID token
   * This is useful when role claims might have changed and need to be refreshed
   */
  const refreshUserRole = async (): Promise<UserRoleType | null> => {
    if (!auth.currentUser) {
      console.log('Cannot refresh role: No authenticated user');
      return null;
    }
    
    try {
      console.log('Refreshing user role from token...');
      
      // Force token refresh to get latest claims
      await auth.currentUser.getIdToken(true);
      
      // Get updated token result
      const tokenResult = await auth.currentUser.getIdTokenResult();
      const tokenRole = tokenResult.claims.role as string | undefined;
      
      console.log('Role from refreshed token:', tokenRole);
      
      // Validate role format
      const validRoles: UserRoleType[] = ['consumer', 'producer', 'partner'];
      let validatedRole: UserRoleType | null = null;
      
      if (tokenRole && validRoles.includes(tokenRole as UserRoleType)) {
        validatedRole = tokenRole as UserRoleType;
        
        // Update user object if it exists
        if (user) {
          const updatedUser = { ...user, role: validatedRole };
          setUser(updatedUser);
        }
        
        console.log('Role refreshed successfully:', validatedRole);
      } else {
        console.warn(`Invalid role in token: "${tokenRole}"`);
        
        // Try to get role from Firestore as fallback
        try {
          // Dynamically import to avoid circular dependencies
          const { syncAuthClaims } = await import('@/lib/user-profile-utils');
          const syncResult = await syncAuthClaims();
          
          if (syncResult.success && syncResult.newRole) {
            validatedRole = syncResult.newRole as UserRoleType;
            
            // Update user object if it exists
            if (user) {
              const updatedUser = { ...user, role: validatedRole };
              setUser(updatedUser);
            }
            
            console.log('Role refreshed from Firestore:', validatedRole);
          }
        } catch (error) {
          console.error('Error getting role from Firestore:', error);
        }
      }
      
      return validatedRole;
    } catch (error) {
      console.error('Error refreshing user role:', error);
      return null;
    }
  };

  // Calculate and validate user role from the user object
  let userRole: UserRoleType | null = null;
  
  if (user && user.role) {
    // Only set role if it's one of our valid types
    const validRoles: UserRoleType[] = ['consumer', 'producer', 'partner'];
    if (validRoles.includes(user.role as UserRoleType)) {
      userRole = user.role as UserRoleType;
      console.log('Auth context using validated role:', userRole);
    } else {
      console.warn(`Auth context received invalid role "${user.role}", defaulting to null`);
    }
  } else {
    console.log('Auth context: No role available from user object');
  }
  
  // Create the context value object
  const contextValue: AuthContextType = {
    user,
    currentUser: user,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUserRole
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
    
    // Enhanced debugging for token claims
    console.log('Token claims received:', JSON.stringify(token.claims, null, 2));
    
    // Extract role from claims with proper validation
    let role = token.claims.role as string | undefined;
    
    // Log the extracted role for debugging
    console.log('Raw role from token claims:', role);
    
    // Validate the role is one of our expected types
    const validRoles = ['consumer', 'producer', 'partner'];
    if (role && !validRoles.includes(role)) {
      console.warn(`Invalid role "${role}" found in token claims, will be treated as undefined`);
      role = undefined;
    }
    
    // Build the user object with Firebase auth methods
    const authUser: AuthUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      phoneNumber: firebaseUser.phoneNumber,
      photoURL: firebaseUser.photoURL,
      role: role,
      
      // Pass through the Firebase methods needed by our AuthUser interface
      getIdToken: (forceRefresh?: boolean) => firebaseUser.getIdToken(forceRefresh),
      getIdTokenResult: (forceRefresh?: boolean) => firebaseUser.getIdTokenResult(forceRefresh)
    };
    
    console.log('Mapped user with role:', authUser.role);
    return authUser;
  } catch (error) {
    console.error('Error getting user token claims in mapFirebaseUser:', error);
    // Fallback to basic user info without role
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      phoneNumber: firebaseUser.phoneNumber,
      photoURL: firebaseUser.photoURL,
      
      // Pass through the Firebase methods
      getIdToken: (forceRefresh?: boolean) => firebaseUser.getIdToken(forceRefresh),
      getIdTokenResult: (forceRefresh?: boolean) => firebaseUser.getIdTokenResult(forceRefresh)
    };
  }
}