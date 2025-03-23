/**
 * Firebase Authentication Service
 * 
 * This module implements the authentication service interface using Firebase.
 * It handles authentication for regular users (consumers, producers, and partners).
 */

import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { IAuthenticationService } from '../../core/application/auth/auth-service.interface';
import { User, UserRole } from '../../core/domain/auth/user';
import { AuthToken } from '../../core/domain/auth/auth-token';
import { AuthenticationError } from '../../core/domain/auth/auth-exceptions';
import { IUserRepository } from '../../core/application/repositories/user-repository.interface';

/**
 * Firebase implementation of the authentication service
 */
export class FirebaseAuthService implements IAuthenticationService {
  private auth = getAuth();
  private currentUserState: User | null = null;
  
  /**
   * Constructor
   * 
   * @param userRepository Repository for user data
   */
  constructor(private userRepository: IUserRepository) {
    // Set up initial auth state
    this.initializeAuthState();
  }
  
  /**
   * Initialize the authentication state listener
   */
  private initializeAuthState(): void {
    firebaseOnAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if this is not an admin user first
        const tokenResult = await firebaseUser.getIdTokenResult();
        if (!tokenResult.claims.isAdmin) {
          this.currentUserState = await this.mapFirebaseUserToUser(firebaseUser);
          console.log('Firebase auth service: User authenticated', this.currentUserState.uid);
        } else {
          // This is an admin user, don't set the currentUserState
          this.currentUserState = null;
          console.log('Firebase auth service: Admin user detected, not setting regular user state');
        }
      } else {
        this.currentUserState = null;
        console.log('Firebase auth service: User signed out');
      }
    });
  }
  
  /**
   * Sign in a user with email and password
   */
  async signIn(email: string, password: string): Promise<User> {
    try {
      console.log('Firebase auth service: Signing in user', email);
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      // Verify that this is not an admin user
      const tokenResult = await userCredential.user.getIdTokenResult();
      if (tokenResult.claims.isAdmin) {
        console.error('Firebase auth service: Admin user tried to sign in through regular auth flow');
        throw new AuthenticationError('Invalid user type', 'auth/invalid-user-type');
      }
      
      const user = await this.mapFirebaseUserToUser(userCredential.user);
      console.log('Firebase auth service: User signed in successfully', user.uid);
      return user;
    } catch (error: any) {
      console.error('Firebase auth service: Sign in error', error);
      throw new AuthenticationError(this.getErrorMessage(error), error.code);
    }
  }
  
  /**
   * Create a new user with email and password
   */
  async signUp(email: string, password: string): Promise<User> {
    try {
      console.log('Firebase auth service: Creating new user', email);
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // By default, set role to consumer on sign up
      const user = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        phoneNumber: userCredential.user.phoneNumber,
        photoURL: userCredential.user.photoURL,
        role: 'consumer' as UserRole
      };
      
      // Create user profile in Firestore
      await this.userRepository.createUserProfile(user.uid, user);
      
      console.log('Firebase auth service: User created successfully', user.uid);
      return user;
    } catch (error: any) {
      console.error('Firebase auth service: Sign up error', error);
      throw new AuthenticationError(this.getErrorMessage(error), error.code);
    }
  }
  
  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      console.log('Firebase auth service: Signing out user');
      await firebaseSignOut(this.auth);
      this.currentUserState = null;
      console.log('Firebase auth service: User signed out successfully');
    } catch (error: any) {
      console.error('Firebase auth service: Sign out error', error);
      throw new AuthenticationError('Sign out failed', error.code);
    }
  }
  
  /**
   * Get the currently authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUserState;
  }
  
  /**
   * Check if a user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUserState !== null;
  }
  
  /**
   * Check if the current user has a specific role
   */
  hasRole(role: UserRole): boolean {
    return this.currentUserState?.role === role;
  }
  
  /**
   * Refresh the authentication token
   */
  async refreshToken(forceRefresh: boolean = false): Promise<AuthToken | null> {
    if (!this.auth.currentUser) {
      console.log('Firebase auth service: No authenticated user for token refresh');
      return null;
    }
    
    try {
      console.log('Firebase auth service: Refreshing auth token', forceRefresh ? '(forced)' : '');
      const token = await this.auth.currentUser.getIdToken(forceRefresh);
      const tokenResult = await this.auth.currentUser.getIdTokenResult();
      
      // Also store token in localStorage for API calls
      localStorage.setItem('authToken', token);
      
      console.log('Firebase auth service: Token refreshed and stored in localStorage');
      return {
        token,
        expiresAt: new Date(tokenResult.expirationTime),
        claims: tokenResult.claims
      };
    } catch (error: any) {
      console.error('Firebase auth service: Token refresh error', error);
      throw new AuthenticationError('Token refresh failed', error.code);
    }
  }
  
  /**
   * Get the current authentication token
   */
  async getToken(): Promise<string | null> {
    const token = await this.refreshToken(false);
    return token ? token.token : null;
  }
  
  /**
   * Subscribe to authentication state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    console.log('Firebase auth service: Setting up auth state listener');
    return firebaseOnAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        if (!tokenResult.claims.isAdmin) {
          const user = await this.mapFirebaseUserToUser(firebaseUser);
          console.log('Firebase auth service: Auth state changed - user authenticated', user.uid);
          callback(user);
        } else {
          console.log('Firebase auth service: Auth state changed - admin user detected, not notifying regular auth listeners');
          callback(null);
        }
      } else {
        console.log('Firebase auth service: Auth state changed - user signed out');
        callback(null);
      }
    });
  }
  
  /**
   * Map a Firebase user to our domain User entity
   */
  private async mapFirebaseUserToUser(firebaseUser: FirebaseUser): Promise<User> {
    // Get token claims including role
    const tokenResult = await firebaseUser.getIdTokenResult();
    
    // Extract role from claims with proper validation
    let role = tokenResult.claims.role as UserRole | undefined;
    
    // If role doesn't exist in claims, try to fetch from user profile
    if (!role) {
      try {
        console.log('Firebase auth service: Role not found in token claims, fetching from repository');
        const userProfile = await this.userRepository.getUserById(firebaseUser.uid);
        if (userProfile && userProfile.role) {
          role = userProfile.role;
          console.log('Firebase auth service: Role fetched from repository:', role);
        }
      } catch (error) {
        console.error('Firebase auth service: Error fetching user profile:', error);
      }
    } else {
      console.log('Firebase auth service: Role found in token claims:', role);
    }
    
    // Validate role is a valid user role
    const validRoles: UserRole[] = ['consumer', 'producer', 'partner'];
    if (role && !validRoles.includes(role)) {
      console.warn('Firebase auth service: Invalid role found:', role);
      role = undefined;
    }
    
    // Default to consumer if no valid role found
    if (!role) {
      console.warn('Firebase auth service: No valid role found, defaulting to consumer');
      role = 'consumer';
    }
    
    // Create and return user entity
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      role,
      phoneNumber: firebaseUser.phoneNumber,
      photoURL: firebaseUser.photoURL
    };
  }
  
  /**
   * Get a user-friendly error message for Firebase auth errors
   */
  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password';
      case 'auth/email-already-in-use':
        return 'This email is already in use';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/weak-password':
        return 'Password is too weak';
      case 'auth/too-many-requests':
        return 'Too many unsuccessful login attempts. Please try again later';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/requires-recent-login':
        return 'This operation requires a recent login. Please sign in again';
      case 'auth/invalid-user-type':
        return 'Invalid user type for this authentication flow';
      default:
        return error.message || 'Authentication failed';
    }
  }
}