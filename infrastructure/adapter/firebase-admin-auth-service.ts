/**
 * Firebase Admin Authentication Service
 * 
 * This module implements the administrator authentication service interface using Firebase.
 * It handles authentication specifically for administrator users.
 */

import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { IAdminAuthenticationService } from '../../core/application/auth/auth-service.interface';
import { Administrator } from '../../core/domain/auth/user';
import { AuthToken } from '../../core/domain/auth/auth-token';
import { AdminAuthenticationError, MfaRequiredError } from '../../core/domain/auth/auth-exceptions';
import { IAdminRepository } from '../../core/application/repositories/admin-repository.interface';

/**
 * Firebase implementation of the admin authentication service
 */
export class FirebaseAdminAuthService implements IAdminAuthenticationService {
  private auth = getAuth();
  private currentAdminState: Administrator | null = null;
  
  /**
   * Constructor
   * 
   * @param adminRepository Repository for administrator data
   */
  constructor(private adminRepository: IAdminRepository) {
    // Set up initial auth state
    this.initializeAuthState();
  }
  
  /**
   * Initialize the authentication state listener
   */
  private initializeAuthState(): void {
    firebaseOnAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        // Only treat as admin if the isAdmin claim is present
        if (tokenResult.claims.isAdmin) {
          console.log('Firebase admin auth service: Admin user authenticated');
          this.currentAdminState = await this.mapFirebaseUserToAdmin(firebaseUser);
        } else {
          // Not an admin user
          console.log('Firebase admin auth service: Regular user detected, not setting admin state');
          this.currentAdminState = null;
        }
      } else {
        console.log('Firebase admin auth service: User signed out');
        this.currentAdminState = null;
      }
    });
  }
  
  /**
   * Sign in as an administrator
   */
  async adminSignIn(email: string, password: string): Promise<Administrator> {
    try {
      console.log('Firebase admin auth service: Attempting admin sign in', email);
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      // Verify this is an admin account
      const tokenResult = await userCredential.user.getIdTokenResult();
      if (!tokenResult.claims.isAdmin) {
        console.error('Firebase admin auth service: Regular user attempted to sign in as admin');
        throw new AdminAuthenticationError('Not an admin account', 'auth/not-admin');
      }
      
      const admin = await this.mapFirebaseUserToAdmin(userCredential.user);
      
      // Update last login time in Firestore
      await this.adminRepository.updateLastLogin(admin.uid);
      console.log('Firebase admin auth service: Admin signed in successfully', admin.uid);
      
      // Check MFA status
      if (admin.mfaEnabled && !admin.mfaVerified) {
        console.log('Firebase admin auth service: MFA verification required');
        throw new MfaRequiredError();
      }
      
      return admin;
    } catch (error: any) {
      console.error('Firebase admin auth service: Sign in error', error);
      if (error instanceof MfaRequiredError) {
        throw error;
      }
      throw new AdminAuthenticationError(this.getErrorMessage(error), error.code);
    }
  }
  
  /**
   * Sign out the current administrator
   */
  async adminSignOut(): Promise<void> {
    try {
      console.log('Firebase admin auth service: Signing out admin');
      await firebaseSignOut(this.auth);
      this.currentAdminState = null;
      console.log('Firebase admin auth service: Admin signed out successfully');
    } catch (error: any) {
      console.error('Firebase admin auth service: Sign out error', error);
      throw new AdminAuthenticationError('Sign out failed', error.code);
    }
  }
  
  /**
   * Get the currently authenticated administrator
   */
  getCurrentAdmin(): Administrator | null {
    return this.currentAdminState;
  }
  
  /**
   * Check if an administrator is authenticated and approved
   */
  isAdminAuthenticated(): boolean {
    return this.currentAdminState !== null && 
           this.currentAdminState.adminStatus === 'approved';
  }
  
  /**
   * Verify an MFA code for the current administrator
   */
  async verifyMfa(code: string): Promise<boolean> {
    if (!this.auth.currentUser) {
      console.error('Firebase admin auth service: No authenticated user for MFA verification');
      throw new AdminAuthenticationError('No authenticated user', 'auth/no-user');
    }
    
    try {
      console.log('Firebase admin auth service: Verifying MFA code');
      // Verify the code against the stored secret
      const isValid = await this.adminRepository.verifyMfaCode(this.auth.currentUser.uid, code);
      
      if (isValid) {
        console.log('Firebase admin auth service: MFA code verified successfully');
        // Update the local state
        if (this.currentAdminState) {
          this.currentAdminState.mfaVerified = true;
        }
        
        // Force token refresh to get updated claims
        await this.auth.currentUser.getIdToken(true);
      } else {
        console.log('Firebase admin auth service: Invalid MFA code');
      }
      
      return isValid;
    } catch (error: any) {
      console.error('Firebase admin auth service: MFA verification error', error);
      throw new AdminAuthenticationError('MFA verification failed', error.code);
    }
  }
  
  /**
   * Set up MFA for the current administrator
   */
  async setupMfa(): Promise<{ qrCodeUrl: string, secret: string }> {
    if (!this.auth.currentUser) {
      console.error('Firebase admin auth service: No authenticated user for MFA setup');
      throw new AdminAuthenticationError('No authenticated user', 'auth/no-user');
    }
    
    try {
      console.log('Firebase admin auth service: Setting up MFA');
      // Generate new MFA secret and QR code
      const result = await this.adminRepository.generateMfaSecret(this.auth.currentUser.uid);
      
      // Update local state
      if (this.currentAdminState) {
        this.currentAdminState.mfaEnabled = true;
        this.currentAdminState.mfaVerified = false;
      }
      
      console.log('Firebase admin auth service: MFA setup completed successfully');
      return result;
    } catch (error: any) {
      console.error('Firebase admin auth service: MFA setup error', error);
      throw new AdminAuthenticationError('MFA setup failed', error.code);
    }
  }
  
  /**
   * Refresh the admin auth token
   */
  async refreshAdminToken(forceRefresh: boolean = false): Promise<AuthToken | null> {
    if (!this.auth.currentUser) {
      console.log('Firebase admin auth service: No authenticated user for token refresh');
      return null;
    }
    
    try {
      console.log('Firebase admin auth service: Refreshing admin token', forceRefresh ? '(forced)' : '');
      const token = await this.auth.currentUser.getIdToken(forceRefresh);
      const tokenResult = await this.auth.currentUser.getIdTokenResult();
      
      // Verify this is an admin token
      if (!tokenResult.claims.isAdmin) {
        console.warn('Firebase admin auth service: Token claims do not include admin flag');
        return null;
      }
      
      // Store token in localStorage with admin prefix
      localStorage.setItem('adminAuthToken', token);
      console.log('Firebase admin auth service: Admin token refreshed and stored in localStorage');
      
      return {
        token,
        expiresAt: new Date(tokenResult.expirationTime),
        claims: tokenResult.claims
      };
    } catch (error: any) {
      console.error('Firebase admin auth service: Token refresh error', error);
      throw new AdminAuthenticationError('Token refresh failed', error.code);
    }
  }
  
  /**
   * Subscribe to admin auth state changes
   */
  onAdminAuthStateChanged(callback: (admin: Administrator | null) => void): () => void {
    console.log('Firebase admin auth service: Setting up admin auth state listener');
    return firebaseOnAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        if (tokenResult.claims.isAdmin) {
          const admin = await this.mapFirebaseUserToAdmin(firebaseUser);
          console.log('Firebase admin auth service: Auth state changed - admin authenticated', admin.uid);
          callback(admin);
        } else {
          console.log('Firebase admin auth service: Auth state changed - not an admin user');
          callback(null);
        }
      } else {
        console.log('Firebase admin auth service: Auth state changed - user signed out');
        callback(null);
      }
    });
  }
  
  /**
   * Map a Firebase user to our domain Administrator entity
   */
  private async mapFirebaseUserToAdmin(firebaseUser: FirebaseUser): Promise<Administrator> {
    // Get token for claims
    const tokenResult = await firebaseUser.getIdTokenResult();
    
    // Get admin details from repository
    const adminDetails = await this.adminRepository.getAdminById(firebaseUser.uid);
    
    if (!adminDetails) {
      console.error('Firebase admin auth service: Admin profile not found');
      throw new AdminAuthenticationError('Admin profile not found', 'admin/profile-not-found');
    }
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      adminStatus: adminDetails.adminStatus || 'pending',
      department: adminDetails.department,
      accessLevel: adminDetails.accessLevel,
      mfaEnabled: adminDetails.mfaEnabled,
      mfaVerified: tokenResult.claims.mfaVerified === true,
      lastLogin: adminDetails.lastLogin
    };
  }
  
  /**
   * Get a user-friendly error message for auth errors
   */
  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password';
      case 'auth/user-disabled':
        return 'This admin account has been disabled';
      case 'auth/too-many-requests':
        return 'Too many unsuccessful login attempts. Please try again later';
      case 'auth/not-admin':
        return 'This account does not have administrator access';
      case 'admin/profile-not-found':
        return 'Administrator profile not found';
      default:
        return error.message || 'Authentication failed';
    }
  }
}