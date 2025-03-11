/**
 * Unified User Schema
 * 
 * This file defines a standardized schema for user data across the application.
 * It ensures consistent field naming and typing for user-related entities.
 */

import { Timestamp } from "firebase/firestore";

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
  phone: string;
  
  // Role and status
  role: UserRoleType;
  emailVerified: boolean;
  points: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Standardization tracking
  _standardized?: boolean;
  _standardizedVersion?: number;
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
  producerId: string; // Always matches id
  providerId: string; // Always matches id
  
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
  partnerId: string; // Always matches id
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
  // Base user fields
  const baseUser = {
    id: user.id || user.userId || '',
    userId: user.id || user.userId || '',
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: ((user.role || 'consumer') as UserRoleType).toLowerCase() as UserRoleType,
    emailVerified: user.emailVerified === true,
    points: typeof user.points === 'number' ? user.points : 0,
    createdAt: user.createdAt || new Date(),
    updatedAt: user.updatedAt || new Date(),
    _standardized: true,
    _standardizedVersion: 1
  };
  
  // Add role-specific fields
  switch (baseUser.role) {
    case 'producer':
      return {
        ...baseUser,
        role: 'producer',
        producerId: baseUser.id,
        providerId: baseUser.id,
        businessName: user.businessName || user.name || '',
        yearsOfExperience: user.yearsOfExperience || 0,
        certifications: Array.isArray(user.certifications) ? user.certifications : [],
        servicesOffered: Array.isArray(user.servicesOffered) ? user.servicesOffered : []
      };
    
    case 'partner':
      return {
        ...baseUser,
        role: 'partner',
        partnerId: baseUser.id,
        businessName: user.businessName || user.name || '',
        serviceTypes: Array.isArray(user.serviceTypes) ? user.serviceTypes : []
      };
    
    case 'consumer':
    default:
      return {
        ...baseUser,
        role: 'consumer',
        preferences: Array.isArray(user.preferences) ? user.preferences : [],
        wishlist: Array.isArray(user.wishlist) ? user.wishlist : [],
        bookingHistory: Array.isArray(user.bookingHistory) ? user.bookingHistory : []
      };
  }
}