/**
 * Firebase Auth Provider
 * 
 * This class implements the IAuthProvider interface using Firebase Authentication.
 * It provides methods for user management, authentication, and token handling.
 */

import { Auth, getAuth } from 'firebase-admin/auth';
import { 
  IAuthProvider, 
  UserCredentials, 
  UserInfo, 
  CustomClaims, 
  AuthToken 
} from '../../core/application/interfaces/auth/auth-provider';

export class FirebaseAuthProvider implements IAuthProvider {
  private auth: Auth;

  constructor(app?: any) {
    this.auth = app ? getAuth(app) : getAuth();
  }

  /**
   * Convert Firebase UserRecord to our UserInfo interface
   */
  private userRecordToUserInfo(userRecord: any): UserInfo {
    return {
      uid: userRecord.uid,
      email: userRecord.email || '',
      emailVerified: userRecord.emailVerified || false,
      displayName: userRecord.displayName || undefined,
      phoneNumber: userRecord.phoneNumber || undefined,
      photoURL: userRecord.photoURL || undefined,
      disabled: userRecord.disabled || false,
      customClaims: userRecord.customClaims || {},
      creationTime: userRecord.metadata?.creationTime,
      lastSignInTime: userRecord.metadata?.lastSignInTime
    };
  }

  /**
   * Create a new user
   */
  async createUser(credentials: UserCredentials): Promise<UserInfo> {
    try {
      const userRecord = await this.auth.createUser({
        email: credentials.email,
        password: credentials.password,
        emailVerified: false
      });

      return this.userRecordToUserInfo(userRecord);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get a user by ID
   */
  async getUser(uid: string): Promise<UserInfo> {
    try {
      const userRecord = await this.auth.getUser(uid);
      return this.userRecordToUserInfo(userRecord);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<UserInfo> {
    try {
      const userRecord = await this.auth.getUserByEmail(email);
      return this.userRecordToUserInfo(userRecord);
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  /**
   * Update a user
   */
  async updateUser(uid: string, updates: Partial<UserInfo>): Promise<UserInfo> {
    try {
      // Convert our UserInfo interface to Firebase UpdateRequest
      const updateRequest: any = {};
      
      if (updates.email !== undefined) updateRequest.email = updates.email;
      if (updates.emailVerified !== undefined) updateRequest.emailVerified = updates.emailVerified;
      if (updates.displayName !== undefined) updateRequest.displayName = updates.displayName;
      if (updates.phoneNumber !== undefined) updateRequest.phoneNumber = updates.phoneNumber;
      if (updates.photoURL !== undefined) updateRequest.photoURL = updates.photoURL;
      if (updates.disabled !== undefined) updateRequest.disabled = updates.disabled;
      
      const userRecord = await this.auth.updateUser(uid, updateRequest);
      return this.userRecordToUserInfo(userRecord);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(uid: string): Promise<boolean> {
    try {
      await this.auth.deleteUser(uid);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  /**
   * Set custom claims on a user
   */
  async setCustomClaims(uid: string, claims: CustomClaims): Promise<boolean> {
    try {
      await this.auth.setCustomUserClaims(uid, claims);
      return true;
    } catch (error) {
      console.error('Error setting custom claims:', error);
      return false;
    }
  }

  /**
   * Verify an ID token
   */
  async verifyIdToken(token: string): Promise<UserInfo> {
    try {
      const decodedToken = await this.auth.verifyIdToken(token);
      const userRecord = await this.auth.getUser(decodedToken.uid);
      return this.userRecordToUserInfo(userRecord);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      throw error;
    }
  }

  /**
   * Generate a token for a user
   */
  async generateToken(uid: string): Promise<AuthToken> {
    try {
      const token = await this.auth.createCustomToken(uid);
      return {
        token,
        expiresIn: 3600, // Firebase custom tokens are valid for 1 hour
      };
    } catch (error) {
      console.error('Error generating token:', error);
      throw error;
    }
  }

  /**
   * Revoke refresh tokens for a user
   */
  async revokeRefreshTokens(uid: string): Promise<boolean> {
    try {
      await this.auth.revokeRefreshTokens(uid);
      return true;
    } catch (error) {
      console.error('Error revoking refresh tokens:', error);
      return false;
    }
  }

  /**
   * Generate a password reset link
   */
  async generatePasswordResetLink(email: string): Promise<string> {
    try {
      return await this.auth.generatePasswordResetLink(email);
    } catch (error) {
      console.error('Error generating password reset link:', error);
      throw error;
    }
  }

  /**
   * Generate an email verification link
   */
  async generateEmailVerificationLink(email: string): Promise<string> {
    try {
      return await this.auth.generateEmailVerificationLink(email);
    } catch (error) {
      console.error('Error generating email verification link:', error);
      throw error;
    }
  }

  /**
   * Generate a sign-in with email link
   */
  async generateSignInWithEmailLink(email: string): Promise<string> {
    try {
      return await this.auth.generateSignInWithEmailLink(email);
    } catch (error) {
      console.error('Error generating sign-in with email link:', error);
      throw error;
    }
  }
}