/**
 * Auth Token Value Object
 * 
 * This module defines the authentication token value object used across the application.
 * It encapsulates the token string, expiration, and claims.
 */

export interface AuthToken {
  token: string;
  expiresAt: Date;
  claims: {
    role?: string;
    isAdmin?: boolean; // Separate flag for administrator status
    adminStatus?: string; // For admin-specific status
    [key: string]: any;
  };
}