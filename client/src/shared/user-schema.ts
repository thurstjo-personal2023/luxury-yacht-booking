/**
 * User roles and types
 * This file defines the user roles and types used throughout the application.
 */

/**
 * User role string literals
 */
export type UserRoleType = 'consumer' | 'producer' | 'partner';

/**
 * Legacy enum for backward compatibility
 */
export enum UserRole {
  CONSUMER = "consumer",
  PRODUCER = "producer",
  PARTNER = "partner"
}