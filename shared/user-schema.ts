/**
 * User Schema
 * This file defines the user roles, types, and interfaces used throughout the application.
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

/**
 * Base user interface with standardized fields
 */
export interface User {
  // Primary identifiers
  id: string;
  userId: string; // Always matches id for consistency
  
  // Basic information
  name: string;
  email: string;
  phone?: string;
  
  // Role and status
  role: UserRoleType;
  emailVerified?: boolean;
  points?: number;
  
  // Timestamps
  createdAt?: any; // Timestamp
  updatedAt?: any; // Timestamp
}

/**
 * Consumer-specific user interface
 */
export interface ConsumerUser extends User {
  role: 'consumer';
  
  // Consumer-specific fields
  preferences?: string[];
  wishlist?: string[];
  bookingHistory?: string[];
}

/**
 * Producer-specific user interface
 */
export interface ProducerUser extends User {
  role: 'producer';
  
  // Aliases for consistent references across the application
  producerId?: string; // Always matches id
  providerId?: string; // Always matches id
  
  // Producer-specific fields
  businessName?: string;
  yearsOfExperience?: number;
  certifications?: string[];
  servicesOffered?: string[];
}

/**
 * Partner-specific user interface
 */
export interface PartnerUser extends User {
  role: 'partner';
  
  // Partner-specific fields
  partnerId?: string; // Always matches id
  businessName?: string;
  serviceTypes?: string[];
}

/**
 * Union type for all user types
 */
export type UserType = ConsumerUser | ProducerUser | PartnerUser;

/**
 * Convert a raw user object to the standardized schema
 */
export function standardizeUser(user: any): UserType {
  // Default to consumer role if none is specified
  const role = user.role as UserRoleType || 'consumer';
  
  // Base user fields
  const baseUser: User = {
    id: user.id || user.uid || '',
    userId: user.userId || user.id || user.uid || '',
    name: user.name || user.displayName || '',
    email: user.email || '',
    phone: user.phone || user.phoneNumber || '',
    role: role,
    emailVerified: user.emailVerified || false,
    points: user.points || 0,
    createdAt: user.createdAt || user.created_date || new Date(),
    updatedAt: user.updatedAt || user.updated_date || new Date()
  };
  
  // Return the appropriate user type based on role
  switch (role) {
    case 'producer':
      return {
        ...baseUser,
        role: 'producer',
        producerId: user.producerId || user.id || user.uid || '',
        providerId: user.providerId || user.id || user.uid || '',
        businessName: user.businessName || '',
        yearsOfExperience: user.yearsOfExperience || 0,
        certifications: user.certifications || [],
        servicesOffered: user.servicesOffered || []
      };
    case 'partner':
      return {
        ...baseUser,
        role: 'partner',
        partnerId: user.partnerId || user.id || user.uid || '',
        businessName: user.businessName || '',
        serviceTypes: user.serviceTypes || []
      };
    case 'consumer':
    default:
      return {
        ...baseUser,
        role: 'consumer',
        preferences: user.preferences || [],
        wishlist: user.wishlist || [],
        bookingHistory: user.bookingHistory || []
      };
  }
}