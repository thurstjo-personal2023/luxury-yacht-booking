/**
 * Authentication Service
 * 
 * This service centralizes all authentication-related business logic
 * following clean architecture principles.
 * 
 * It serves as a facade between the UI and Firebase Auth, allowing for:
 * - Easier testing (mocking)
 * - Consistent error handling
 * - Centralized token management
 * - Clean separation of concerns
 */

import { 
  Auth, 
  User as FirebaseUser, 
  UserCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  getIdTokenResult,
  getIdToken,
  onIdTokenChanged,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfileById, syncAuthClaims } from '@/lib/user-profile-utils';
import { HarmonizedUser, ServiceProviderProfile, TouristProfile } from '@shared/harmonized-user-schema';

/**
 * Auth result containing user data and token
 */
export interface AuthResult {
  user: FirebaseUser;
  token: string;
}

/**
 * User profile data interface
 */
export interface UserProfileData {
  // Basic user data
  harmonizedUser: HarmonizedUser | null;
  touristProfile: TouristProfile | null;
  serviceProviderProfile: ServiceProviderProfile | null;
  
  // Role information (extracted and normalized from profile data)
  role?: string;
  userId?: string;
  displayName?: string;
}

/**
 * Error codes for common authentication errors
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'auth/invalid-credential',
  USER_DISABLED = 'auth/user-disabled',
  TOO_MANY_REQUESTS = 'auth/too-many-requests',
  EMAIL_IN_USE = 'auth/email-already-in-use',
  INVALID_EMAIL = 'auth/invalid-email',
  WEAK_PASSWORD = 'auth/weak-password',
  NETWORK_ERROR = 'auth/network-request-failed',
  TIMEOUT = 'auth/timeout',
  UNKNOWN = 'auth/unknown'
}

/**
 * Extend Error interface to include Firebase auth properties
 */
declare global {
  interface Error {
    code?: string;
    friendlyMessage?: string;
  }
}

/**
 * Error messages for common authentication errors
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  [AuthErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',
  [AuthErrorCode.USER_DISABLED]: 'This account has been disabled',
  [AuthErrorCode.TOO_MANY_REQUESTS]: 'Too many unsuccessful login attempts. Please try again later',
  [AuthErrorCode.EMAIL_IN_USE]: 'Email already in use',
  [AuthErrorCode.INVALID_EMAIL]: 'Invalid email address',
  [AuthErrorCode.WEAK_PASSWORD]: 'Password is too weak',
  [AuthErrorCode.NETWORK_ERROR]: 'Network error. Please check your internet connection and try again.',
  [AuthErrorCode.TIMEOUT]: 'Request timed out. Please try again.',
  [AuthErrorCode.UNKNOWN]: 'An unknown error occurred. Please try again.'
};

/**
 * Authentication Service
 */
export class AuthService {
  private auth: Auth;
  private timeoutDuration: number;
  private authStateListeners: Set<(user: FirebaseUser | null) => void>;
  private tokenChangeListeners: Set<(user: FirebaseUser | null) => void>;
  private cleanupFunctions: (() => void)[] = [];

  /**
   * Create a new AuthService
   * @param auth Firebase Auth instance
   * @param timeoutDuration Timeout duration for auth operations in milliseconds
   */
  constructor(authInstance: Auth, timeoutDuration: number = 15000) {
    this.auth = authInstance;
    this.timeoutDuration = timeoutDuration;
    this.authStateListeners = new Set();
    this.tokenChangeListeners = new Set();
    
    this.initializePersistence();
  }

  /**
   * Initialize auth persistence
   */
  private async initializePersistence(): Promise<void> {
    try {
      // Check if persistence has already been set to avoid duplicate calls
      if (!(window as any).__FIREBASE_PERSISTENCE_SET) {
        await setPersistence(this.auth, browserLocalPersistence);
        console.log("AuthService: Firebase auth persistence set to LOCAL");
        (window as any).__FIREBASE_PERSISTENCE_SET = true;
      } else {
        console.log("AuthService: Firebase persistence already set, skipping");
      }
    } catch (error) {
      console.error("AuthService: Failed to set Firebase auth persistence:", error);
    }
  }

  /**
   * Get the current user
   */
  getCurrentUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.auth.currentUser;
  }

  /**
   * Handle authentication errors with consistent messaging
   * @param error The error object from Firebase
   * @returns Error message string
   */
  getErrorMessage(error: any): string {
    if (!error) return AUTH_ERROR_MESSAGES[AuthErrorCode.UNKNOWN];
    
    // Handle timeout errors
    if (error.message?.includes('timed out')) {
      return AUTH_ERROR_MESSAGES[AuthErrorCode.TIMEOUT];
    }
    
    // Handle Firebase auth errors with code
    if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
      return AUTH_ERROR_MESSAGES[error.code];
    }
    
    // Default error message
    return error.message || AUTH_ERROR_MESSAGES[AuthErrorCode.UNKNOWN];
  }

  /**
   * Sign in with email and password
   * @param email User email
   * @param password User password
   * @returns Promise resolving to AuthResult
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const timeoutError = new Error('Login request timed out');
          timeoutError.code = AuthErrorCode.TIMEOUT;
          reject(timeoutError);
        }, this.timeoutDuration);
      });
      
      // Create the login promise
      const loginPromise = signInWithEmailAndPassword(this.auth, email, password);
      
      // Race the promises to handle timeouts
      const userCredential = await Promise.race([loginPromise, timeoutPromise]) as UserCredential;
      const user = userCredential.user;
      
      // Get fresh token for API calls
      const token = await user.getIdToken(true);
      
      // Store token for API calls
      localStorage.setItem('authToken', token);
      console.log('AuthService: Stored fresh auth token in localStorage after login');
      
      return { user, token };
    } catch (error: any) {
      console.error('AuthService: Login error:', error);
      // Enhanced error with user-friendly message
      error.friendlyMessage = this.getErrorMessage(error);
      throw error;
    }
  }

  /**
   * Register a new user
   * @param email User email
   * @param password User password
   * @param name User display name
   * @param role User role
   * @returns Promise resolving to AuthResult
   */
  async register(email: string, password: string, name: string, role: string): Promise<AuthResult> {
    try {
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const timeoutError = new Error('Registration request timed out');
          timeoutError.code = AuthErrorCode.TIMEOUT;
          reject(timeoutError);
        }, this.timeoutDuration);
      });
      
      // Create the registration promise
      const registerPromise = createUserWithEmailAndPassword(this.auth, email, password);
      
      // Race the promises to handle timeouts
      const userCredential = await Promise.race([registerPromise, timeoutPromise]) as UserCredential;
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, { displayName: name });
      
      // Get fresh token for API calls
      const token = await user.getIdToken(true);
      
      // Store token for API calls
      localStorage.setItem('authToken', token);
      console.log('AuthService: Stored fresh auth token in localStorage after registration');
      
      // Create user profile in Firestore via API
      const response = await fetch('/api/user/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, role })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create user profile');
      }
      
      // Wait briefly for Firestore to process the profile creation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Sync auth claims to ensure proper role is set
      await this.syncAuthClaims();
      
      // Force token refresh to get updated claims
      const freshToken = await user.getIdToken(true);
      localStorage.setItem('authToken', freshToken);
      
      return { user, token: freshToken };
    } catch (error: any) {
      console.error('AuthService: Registration error:', error);
      // Enhanced error with user-friendly message
      error.friendlyMessage = this.getErrorMessage(error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      console.log('AuthService: Beginning sign out process...');
      
      // Clear all auth tokens from storage
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      localStorage.removeItem('lastAuthState');
      console.log('AuthService: Removed auth tokens from storage during sign out');
      
      // Sign out from Firebase Auth
      await firebaseSignOut(this.auth);
      console.log('AuthService: Successfully signed out from Firebase Auth');
    } catch (error) {
      console.error('AuthService: Error signing out:', error);
      throw error;
    }
  }

  /**
   * Refresh authentication token
   * @returns Fresh token string
   */
  async refreshToken(): Promise<string | null> {
    const user = this.getCurrentUser();
    if (!user) {
      console.warn('AuthService: Cannot refresh token - no current user');
      return null;
    }
    
    try {
      // Force token refresh
      const token = await user.getIdToken(true);
      localStorage.setItem('authToken', token);
      console.log('AuthService: Token refreshed and stored');
      return token;
    } catch (error) {
      console.error('AuthService: Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Fetch user profile data from Firestore
   * @param userId User ID to fetch profile for
   * @returns Promise resolving to UserProfileData
   */
  async fetchUserProfile(userIdParam?: string): Promise<UserProfileData> {
    try {
      // Use provided userId or current user's ID
      const fetchUserId = userIdParam || this.getCurrentUser()?.uid;
      
      if (!fetchUserId) {
        console.error('AuthService: Cannot fetch profile - no user ID available');
        throw new Error('No user ID available');
      }
      
      const profileData = await getUserProfileById(fetchUserId);
      
      if (!profileData) {
        console.warn('AuthService: No profile data found for user:', fetchUserId);
        return {
          harmonizedUser: null,
          touristProfile: null,
          serviceProviderProfile: null,
          role: '',
          userId: fetchUserId || '',
          displayName: this.getCurrentUser()?.displayName || ''
        };
      }
      
      // Check for role mismatch and synchronize if needed
      await this.checkAndSyncRoles(profileData.core);
      
      // Extract normalized data from profiles
      const role = profileData.core?.role?.toLowerCase() || '';
      const userIdFromProfile = profileData.core?.id || '';
      const displayName = profileData.core?.name || profileData.core?.displayName || '';
      
      return {
        // Original profile data
        harmonizedUser: profileData.core,
        touristProfile: profileData.touristProfile || null,
        serviceProviderProfile: profileData.serviceProviderProfile || null,
        
        // Normalized data for easy access
        role,
        userId: userIdFromProfile,
        displayName
      };
    } catch (error) {
      console.error('AuthService: Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Check and synchronize roles between Auth and Firestore
   * @param harmonizedUser User data from Firestore
   */
  private async checkAndSyncRoles(harmonizedUser: HarmonizedUser): Promise<void> {
    const user = this.getCurrentUser();
    if (!user || !harmonizedUser) return;
    
    try {
      const tokenResult = await user.getIdTokenResult();
      const authRole = tokenResult.claims.role as string | undefined;
      const firestoreRole = harmonizedUser.role;
      
      if (authRole !== firestoreRole) {
        console.log(`AuthService: Role mismatch detected - Auth role=${authRole}, Firestore role=${firestoreRole}`);
        console.log('AuthService: Automatically synchronizing roles...');
        
        const syncResult = await syncAuthClaims();
        
        if (syncResult.success) {
          console.log('AuthService: Role sync successful:', syncResult);
          
          // Force token refresh to apply new claims
          await user.getIdToken(true);
        } else {
          console.error('AuthService: Automatic role sync failed:', syncResult);
        }
      } else {
        console.log('AuthService: Roles are in sync:', firestoreRole);
      }
    } catch (error) {
      console.error('AuthService: Error checking/syncing roles:', error);
    }
  }

  /**
   * Synchronize auth claims
   */
  async syncAuthClaims(): Promise<any> {
    return syncAuthClaims(true);
  }

  /**
   * Listen for auth state changes
   * @param callback Function to call when auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    this.authStateListeners.add(callback);
    
    // Set up the Firebase listener if this is the first listener
    if (this.authStateListeners.size === 1) {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        console.log('AuthService: Auth state changed:', user ? 'User signed in' : 'User signed out');
        
        // IMPORTANT: Do not manipulate token storage here to avoid race conditions
        // Token storage is handled in the ID token change listener
        
        // Notify all listeners
        this.authStateListeners.forEach(listener => {
          try {
            listener(user);
          } catch (error) {
            console.error('AuthService: Error in auth state listener:', error);
          }
        });
      });
      
      // Store the unsubscribe function
      this.cleanupFunctions.push(unsubscribe);
      
      return () => {
        this.authStateListeners.delete(callback);
        // If there are no more listeners, unsubscribe from Firebase
        if (this.authStateListeners.size === 0) {
          unsubscribe();
        }
      };
    }
    
    // Return a function to remove this specific listener
    return () => {
      this.authStateListeners.delete(callback);
    };
  }

  /**
   * Listen for ID token changes
   * @param callback Function to call when ID token changes
   * @returns Unsubscribe function
   */
  onIdTokenChanged(callback: (user: FirebaseUser | null) => void): () => void {
    this.tokenChangeListeners.add(callback);
    
    // Set up the Firebase listener if this is the first listener
    if (this.tokenChangeListeners.size === 1) {
      const unsubscribe = onIdTokenChanged(this.auth, (user) => {
        console.log('AuthService: ID token changed:', user ? 'Token updated' : 'No token');
        
        // Notify all listeners
        this.tokenChangeListeners.forEach(listener => {
          try {
            listener(user);
          } catch (error) {
            console.error('AuthService: Error in token change listener:', error);
          }
        });
        
        // Update storage with new token
        if (user) {
          user.getIdToken().then(token => {
            localStorage.setItem('authToken', token);
          }).catch(error => {
            console.error('AuthService: Error getting token during token change:', error);
          });
        }
      });
      
      // Store the unsubscribe function
      this.cleanupFunctions.push(unsubscribe);
      
      return () => {
        this.tokenChangeListeners.delete(callback);
        // If there are no more listeners, unsubscribe from Firebase
        if (this.tokenChangeListeners.size === 0) {
          unsubscribe();
        }
      };
    }
    
    // Return a function to remove this specific listener
    return () => {
      this.tokenChangeListeners.delete(callback);
    };
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    console.log('AuthService: Cleaning up all listeners');
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
    this.authStateListeners.clear();
    this.tokenChangeListeners.clear();
  }
}

// Create and export a singleton instance
export const authService = new AuthService(auth);