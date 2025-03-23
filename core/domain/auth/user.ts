/**
 * User Entity Definitions
 * 
 * This module defines the core user entities for the Etoile Yachts platform.
 * It separates standard users (consumer, producer, partner) from administrators.
 */

// Standard user roles for the marketplace
export type UserRole = 'consumer' | 'producer' | 'partner';

// Standard user entity for marketplace users
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole | null;
  phoneNumber: string | null;
  photoURL: string | null;
}

// Administrator is a separate entity with different attributes
export interface Administrator {
  uid: string;
  email: string | null;
  displayName: string | null;
  adminStatus: 'pending' | 'approved';
  department?: string;
  accessLevel?: string;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  lastLogin?: Date;
}