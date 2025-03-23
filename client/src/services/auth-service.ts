/**
 * Authentication Service
 * 
 * This service provides a consistent way to handle authentication and authorization
 * throughout the application, ensuring clean separation of concerns.
 */

import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  UserCredential
} from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { collectionRefs } from '@/lib/firestore-init';
import { UserRoleType, UserType, standardizeUser } from '@shared/user-schema';
import { redirectToDashboard } from './navigation';

// Auth verification result interface
export interface AuthVerificationResult {
  success: boolean;
  user?: UserType;
  role?: UserRoleType;
  message?: string;
  error?: Error;
  needsRedirect?: boolean;
  redirectUrl?: string;
}

/**
 * Signs in a user and handles post-authentication flow
 * 
 * @param email User email
 * @param password User password
 * @returns Promise resolving to verification result
 */
export async function authenticateUser(
  email: string, 
  password: string
): Promise<AuthVerificationResult> {
  const auth = getAuth();
  
  try {
    console.log(`Auth service: Authenticating user ${email}`);
    
    // Perform Firebase authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Verify email is verified
    if (!userCredential.user.emailVerified) {
      console.warn(`Auth service: Email not verified for user ${email}`);
      return {
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        error: new Error('Email not verified')
      };
    }
    
    // Get user profile with retry mechanism
    const userData = await getUserProfileWithRetry(userCredential);
    
    if (!userData) {
      console.error(`Auth service: Failed to retrieve user profile for ${email}`);
      return {
        success: false,
        message: 'Failed to retrieve your user profile. Please try again.',
        error: new Error('User profile not found')
      };
    }
    
    // Get verified role
    const verifiedRole = await verifyAndSyncUserRole(userData);
    
    console.log(`Auth service: Successfully authenticated user ${email} with role ${verifiedRole}`);
    
    // Return success with user and role
    return {
      success: true,
      user: userData,
      role: verifiedRole,
      message: 'Authentication successful',
      needsRedirect: true
    };
  } catch (error) {
    console.error('Auth service: Authentication error', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed',
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Verifies and synchronizes user role
 * 
 * @param userData User data
 * @returns Promise resolving to verified role
 */
export async function verifyAndSyncUserRole(userData: UserType): Promise<UserRoleType> {
  try {
    console.log(`Auth service: Verifying and syncing role for user ${userData.id}`);
    
    // Dynamically import to avoid circular dependencies
    const { verifyUserRole } = await import('@/lib/role-verification');
    
    // Verify the provided role from user data
    const roleVerification = await verifyUserRole(userData.role as UserRoleType);
    
    if (roleVerification.hasRole) {
      // Use the verified role from token
      const verifiedRole = roleVerification.actualRole || userData.role as UserRoleType;
      console.log(`Auth service: Role verified as ${verifiedRole}`);
      return verifiedRole;
    } else if (roleVerification.actualRole) {
      // Use the actual role from verification if available
      console.log(`Auth service: Using actual role from verification: ${roleVerification.actualRole}`);
      return roleVerification.actualRole;
    } else {
      // Default to consumer if no valid role found
      console.warn('Auth service: No valid role found, defaulting to consumer');
      return 'consumer';
    }
  } catch (error) {
    console.error('Auth service: Error verifying user role', error);
    // Default to consumer on error
    return 'consumer';
  }
}

/**
 * Redirects user to the appropriate dashboard based on role
 * 
 * @param role User role
 * @returns Promise resolving to redirect result
 */
export async function redirectUserBasedOnRole(role: UserRoleType): Promise<boolean> {
  try {
    console.log(`Auth service: Redirecting user based on role ${role}`);
    
    // Use the navigation service for redirection
    const redirectResult = await redirectToDashboard(role);
    
    return redirectResult.success;
  } catch (error) {
    console.error('Auth service: Error redirecting user', error);
    return false;
  }
}

/**
 * Gets user profile with retry mechanism
 * 
 * @param userCredential User credential from Firebase Auth
 * @returns Promise resolving to user data or null
 */
async function getUserProfileWithRetry(userCredential: UserCredential): Promise<UserType | null> {
  let rawUserData = null;
  let retryCount = 0;
  const maxRetries = 3;
  
  while (!rawUserData && retryCount < maxRetries) {
    try {
      console.log(`Auth service: Fetching user profile (attempt ${retryCount + 1}/${maxRetries})`);
      
      const userDoc = await getDoc(doc(collectionRefs.users, userCredential.user.uid));
      rawUserData = userDoc.data();
      
      if (!rawUserData && retryCount < maxRetries - 1) {
        console.log(`Auth service: User data not found, retrying (${retryCount + 1}/${maxRetries})...`);
        // Wait before retry (increasing delay)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      }
    } catch (fetchError) {
      console.error(`Auth service: Error fetching user data (attempt ${retryCount + 1}/${maxRetries}):`, fetchError);
      if (retryCount < maxRetries - 1) {
        // Wait before retry (increasing delay)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      }
    }
    retryCount++;
  }
  
  // Use fallback data if user profile not found
  if (!rawUserData) {
    console.warn('Auth service: User profile not found in Firestore. Using minimal fallback profile.');
    
    // Get the role from token claims if available
    const tokenResult = await userCredential.user.getIdTokenResult();
    const tokenRole = (tokenResult.claims.role as string) || "consumer";
    
    console.log(`Auth service: Using role from token claims for fallback profile: "${tokenRole}"`);
    
    rawUserData = {
      name: userCredential.user.displayName || "User",
      email: userCredential.user.email || "",
      role: tokenRole,
      userId: userCredential.user.uid,
      phone: "",
      points: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: userCredential.user.emailVerified
    };
  }
  
  // Ensure consistent user schema
  return standardizeUser({
    ...rawUserData, 
    id: userCredential.user.uid, 
    userId: userCredential.user.uid
  }) as UserType;
}