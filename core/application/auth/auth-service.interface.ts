/**
 * Authentication Service Interfaces
 * 
 * This module defines interfaces for both regular user authentication
 * and administrator authentication services.
 */

import { User, UserRole, Administrator } from '../../domain/auth/user';
import { AuthToken } from '../../domain/auth/auth-token';

/**
 * Interface for standard user authentication services
 */
export interface IAuthenticationService {
  /**
   * Sign in a user with email and password
   */
  signIn(email: string, password: string): Promise<User>;
  
  /**
   * Register a new user with email and password
   */
  signUp(email: string, password: string): Promise<User>;
  
  /**
   * Sign out the current user
   */
  signOut(): Promise<void>;
  
  /**
   * Get the currently authenticated user
   */
  getCurrentUser(): User | null;
  
  /**
   * Check if a user is authenticated
   */
  isAuthenticated(): boolean;
  
  /**
   * Check if the current user has a specific role
   */
  hasRole(role: UserRole): boolean;
  
  /**
   * Refresh the auth token, optionally forcing a fresh token from the server
   */
  refreshToken(forceRefresh?: boolean): Promise<AuthToken | null>;
  
  /**
   * Get the current authentication token
   */
  getToken(): Promise<string | null>;
  
  /**
   * Subscribe to auth state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
}

/**
 * Interface for administrator authentication services
 */
export interface IAdminAuthenticationService {
  /**
   * Sign in as an administrator
   */
  adminSignIn(email: string, password: string): Promise<Administrator>;
  
  /**
   * Sign out the current administrator
   */
  adminSignOut(): Promise<void>;
  
  /**
   * Get the currently authenticated administrator
   */
  getCurrentAdmin(): Administrator | null;
  
  /**
   * Check if an administrator is authenticated
   */
  isAdminAuthenticated(): boolean;
  
  /**
   * Verify an MFA code for the current administrator
   */
  verifyMfa(code: string): Promise<boolean>;
  
  /**
   * Set up MFA for the current administrator
   */
  setupMfa(): Promise<{ qrCodeUrl: string, secret: string }>;
  
  /**
   * Refresh the admin auth token
   */
  refreshAdminToken(forceRefresh?: boolean): Promise<AuthToken | null>;
  
  /**
   * Subscribe to admin auth state changes
   */
  onAdminAuthStateChanged(callback: (admin: Administrator | null) => void): () => void;
}