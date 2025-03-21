/**
 * Firebase Authentication Service Implementation
 * 
 * This module implements the IAuthService interface using Firebase Authentication.
 */

import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  UserCredential,
  signInWithCustomToken,
  getIdTokenResult,
  User as FirebaseUser,
  deleteUser
} from 'firebase/auth';
import { 
  Firestore, 
  doc, 
  getDoc, 
  setDoc 
} from 'firebase/firestore';

import { 
  IAuthService, 
  AuthResult, 
  TokenVerificationResult, 
  EmailVerificationOptions, 
  PasswordResetOptions 
} from '../../core/application/interfaces/auth-service';
import { User } from '../../core/domain/user/user';
import { EmailAddress } from '../../core/domain/value-objects/email-address';
import { Password } from '../../core/domain/value-objects/password';
import { PhoneNumber } from '../../core/domain/value-objects/phone-number';
import { UserRole } from '../../core/domain/user/user-role';
import { IUserRepository } from '../repositories/interfaces/user-repository';

/**
 * Firebase auth service configuration
 */
export interface FirebaseAuthServiceConfig {
  usersCollection: string;
  tokenExpirationMinutes: number;
  sessionTimeoutMinutes: number;
}

/**
 * Firebase auth service implementation
 */
export class FirebaseAuthService implements IAuthService {
  constructor(
    private readonly auth: Auth,
    private readonly firestore: Firestore,
    private readonly userRepository: IUserRepository,
    private readonly config: FirebaseAuthServiceConfig
  ) {}
  
  /**
   * Register a new user
   */
  async register(
    email: EmailAddress,
    password: Password,
    firstName: string,
    lastName: string,
    role: UserRole,
    phone?: PhoneNumber
  ): Promise<AuthResult> {
    try {
      // Check if user with this email already exists in our repository
      const existingUser = await this.userRepository.findByEmail(email);
      
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        this.auth, 
        email.value, 
        password.value
      );
      
      const firebaseUser = userCredential.user;
      
      // Create user in our domain model
      const newUser = new User({
        id: firebaseUser.uid,
        firstName,
        lastName,
        email,
        phone,
        role,
        isEmailVerified: firebaseUser.emailVerified,
        createdAt: new Date()
      });
      
      // Save user to repository
      await this.userRepository.save(newUser);
      
      // Get token information
      const tokenResult = await firebaseUser.getIdTokenResult();
      
      return {
        success: true,
        user: newUser,
        token: tokenResult.token,
        refreshToken: firebaseUser.refreshToken,
        expiresAt: new Date(tokenResult.expirationTime)
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Login with email and password
   */
  async login(email: EmailAddress | string, password: string): Promise<AuthResult> {
    try {
      const emailStr = email instanceof EmailAddress ? email.value : email;
      
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        this.auth, 
        emailStr, 
        password
      );
      
      const firebaseUser = userCredential.user;
      
      // Get user from repository
      let user = await this.userRepository.findById(firebaseUser.uid);
      
      // If user doesn't exist in our repository but exists in Firebase Auth,
      // create a new user in our repository
      if (!user) {
        const [firstName, lastName] = this.extractNameParts(firebaseUser.displayName || emailStr);
        
        user = new User({
          id: firebaseUser.uid,
          firstName,
          lastName,
          email: new EmailAddress(emailStr),
          isEmailVerified: firebaseUser.emailVerified,
          role: UserRole.CONSUMER, // Default role
          createdAt: new Date()
        });
        
        await this.userRepository.save(user);
      }
      
      // Update login timestamp
      user = new User({
        ...user,
        lastLoginAt: new Date()
      });
      
      await this.userRepository.save(user);
      
      // Get token information
      const tokenResult = await firebaseUser.getIdTokenResult();
      
      return {
        success: true,
        user,
        token: tokenResult.token,
        refreshToken: firebaseUser.refreshToken,
        expiresAt: new Date(tokenResult.expirationTime)
      };
    } catch (error) {
      console.error('Login error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Logout a user
   */
  async logout(token: string): Promise<boolean> {
    try {
      await signOut(this.auth);
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }
  
  /**
   * Refresh an authentication token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Firebase Web SDK doesn't have a direct way to refresh a token
      // The token is refreshed automatically when needed
      
      const currentUser = this.auth.currentUser;
      
      if (!currentUser) {
        return {
          success: false,
          error: 'No user is currently logged in'
        };
      }
      
      // Force token refresh
      await this.auth.updateCurrentUser(currentUser);
      
      // Get the fresh token
      const tokenResult = await currentUser.getIdTokenResult(true);
      
      // Get user from repository
      const user = await this.userRepository.findById(currentUser.uid);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found in repository'
        };
      }
      
      return {
        success: true,
        user,
        token: tokenResult.token,
        refreshToken: currentUser.refreshToken,
        expiresAt: new Date(tokenResult.expirationTime)
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Verify an authentication token
   */
  async verifyToken(token: string): Promise<TokenVerificationResult> {
    try {
      // For client-side applications, Firebase handles token verification internally
      // This method is more useful for server-side verification
      
      const currentUser = this.auth.currentUser;
      
      if (!currentUser) {
        return {
          isValid: false,
          error: 'No user is currently logged in'
        };
      }
      
      // Check if the token matches the current user's token
      const idTokenResult = await currentUser.getIdTokenResult();
      
      if (idTokenResult.token !== token) {
        return {
          isValid: false,
          error: 'Token does not match current user'
        };
      }
      
      // Check if token is expired
      const expirationTime = new Date(idTokenResult.expirationTime).getTime();
      const currentTime = Date.now();
      
      if (expirationTime < currentTime) {
        return {
          isValid: false,
          error: 'Token is expired'
        };
      }
      
      // Get user from repository to verify role and other information
      const user = await this.userRepository.findById(currentUser.uid);
      
      if (!user) {
        return {
          isValid: false,
          error: 'User not found in repository'
        };
      }
      
      return {
        isValid: true,
        userId: currentUser.uid,
        email: currentUser.email || undefined,
        role: user.role
      };
    } catch (error) {
      console.error('Token verification error:', error);
      
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Send an email verification link
   */
  async sendEmailVerification(
    userId: string,
    options?: EmailVerificationOptions
  ): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser || currentUser.uid !== userId) {
        return false;
      }
      
      const actionCodeSettings = options?.redirectUrl ? {
        url: options.redirectUrl
      } : undefined;
      
      await sendEmailVerification(currentUser, actionCodeSettings);
      
      return true;
    } catch (error) {
      console.error('Email verification error:', error);
      return false;
    }
  }
  
  /**
   * Verify an email verification token
   */
  async verifyEmail(token: string): Promise<boolean> {
    try {
      // Firebase handles email verification automatically through the link sent to the user
      // This method doesn't have a direct parallel in Firebase's API
      
      // For completeness, we'll check if the current user's email is verified
      const currentUser = this.auth.currentUser;
      
      if (!currentUser) {
        return false;
      }
      
      // Reload user to get the latest email verification status
      await currentUser.reload();
      
      if (currentUser.emailVerified) {
        // Update our repository to reflect the verified email
        const user = await this.userRepository.findById(currentUser.uid);
        
        if (user) {
          const updatedUser = new User({
            ...user,
            isEmailVerified: true,
            updatedAt: new Date()
          });
          
          await this.userRepository.save(updatedUser);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Email verification check error:', error);
      return false;
    }
  }
  
  /**
   * Send a password reset email
   */
  async sendPasswordReset(
    email: EmailAddress | string,
    options?: PasswordResetOptions
  ): Promise<boolean> {
    try {
      const emailStr = email instanceof EmailAddress ? email.value : email;
      
      const actionCodeSettings = options?.redirectUrl ? {
        url: options.redirectUrl
      } : undefined;
      
      await sendPasswordResetEmail(this.auth, emailStr, actionCodeSettings);
      
      return true;
    } catch (error) {
      console.error('Password reset email error:', error);
      return false;
    }
  }
  
  /**
   * Reset a password using a reset token
   */
  async resetPassword(token: string, newPassword: Password): Promise<boolean> {
    try {
      // Verify the password reset code
      await verifyPasswordResetCode(this.auth, token);
      
      // Confirm the password reset
      await confirmPasswordReset(this.auth, token, newPassword.value);
      
      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      return false;
    }
  }
  
  /**
   * Change a user's password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: Password
  ): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser || currentUser.uid !== userId) {
        return false;
      }
      
      // Re-authenticate the user first
      if (!currentUser.email) {
        return false;
      }
      
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update the password
      await updatePassword(currentUser, newPassword.value);
      
      return true;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  }
  
  /**
   * Update a user's email
   */
  async updateEmail(userId: string, newEmail: EmailAddress): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser || currentUser.uid !== userId) {
        return false;
      }
      
      // Update email in Firebase Auth
      await updateEmail(currentUser, newEmail.value);
      
      // Update email in our repository
      const user = await this.userRepository.findById(userId);
      
      if (user) {
        const updatedUser = new User({
          ...user,
          email: newEmail,
          isEmailVerified: false, // Email verification status is reset
          updatedAt: new Date()
        });
        
        await this.userRepository.save(updatedUser);
      }
      
      return true;
    } catch (error) {
      console.error('Update email error:', error);
      return false;
    }
  }
  
  /**
   * Get the currently authenticated user
   */
  async getCurrentUser(token: string): Promise<User | null> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser) {
        return null;
      }
      
      // Verify that the provided token matches the current user's token
      const idTokenResult = await currentUser.getIdTokenResult();
      
      if (idTokenResult.token !== token) {
        return null;
      }
      
      // Get user from repository
      return this.userRepository.findById(currentUser.uid);
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
  
  /**
   * Check if a user is authenticated
   */
  async isAuthenticated(token: string): Promise<boolean> {
    try {
      const result = await this.verifyToken(token);
      return result.isValid;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }
  
  /**
   * Check if a user has a specific role
   */
  async hasRole(token: string, role: UserRole): Promise<boolean> {
    try {
      const result = await this.verifyToken(token);
      
      if (!result.isValid || !result.userId) {
        return false;
      }
      
      const user = await this.userRepository.findById(result.userId);
      
      if (!user) {
        return false;
      }
      
      return user.role === role;
    } catch (error) {
      console.error('Role check error:', error);
      return false;
    }
  }
  
  /**
   * Check if a user has a specific permission
   */
  async hasPermission(token: string, permission: string): Promise<boolean> {
    try {
      const result = await this.verifyToken(token);
      
      if (!result.isValid || !result.userId || !result.role) {
        return false;
      }
      
      // Get the user to determine their role
      const user = await this.userRepository.findById(result.userId);
      
      if (!user) {
        return false;
      }
      
      // Check if the role has the required permission
      return user.hasPermission(permission);
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }
  
  /**
   * Extract first and last name from a full name or email
   */
  private extractNameParts(nameOrEmail: string): [string, string] {
    // If it's an email, use the local part
    if (nameOrEmail.includes('@')) {
      const localPart = nameOrEmail.split('@')[0];
      
      // Convert local part to a name format
      const formattedName = localPart
        .replace(/[^a-zA-Z0-9]/g, ' ') // Replace non-alphanumeric with space
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
      
      if (formattedName.includes(' ')) {
        const parts = formattedName.split(' ');
        return [parts[0], parts.slice(1).join(' ')];
      }
      
      return [formattedName, ''];
    }
    
    // If it's a name, split by space
    const parts = nameOrEmail.trim().split(' ');
    
    if (parts.length === 1) {
      return [parts[0], ''];
    }
    
    return [parts[0], parts.slice(1).join(' ')];
  }
}