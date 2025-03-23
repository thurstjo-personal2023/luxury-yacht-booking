/**
 * Authentication Exceptions
 * 
 * This module defines specialized error types for authentication-related exceptions.
 * Using specific error types allows for better error handling and messaging.
 */

/**
 * Error thrown during standard user authentication processes
 */
export class AuthenticationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when an authenticated user lacks permissions for an action
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Error thrown during administrator authentication processes
 */
export class AdminAuthenticationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AdminAuthenticationError';
  }
}

/**
 * Error thrown when MFA verification is required to proceed
 */
export class MfaRequiredError extends Error {
  constructor(message: string = 'MFA verification required') {
    super(message);
    this.name = 'MfaRequiredError';
  }
}