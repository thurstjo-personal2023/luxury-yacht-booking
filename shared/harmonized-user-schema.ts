/**
 * Harmonized User Schema
 * 
 * This file defines the schemas for the harmonized user data structure:
 * - harmonized_users: Core user data for all user types
 * - user_profiles_tourist: Consumer-specific profile data
 * - user_profiles_service_provider: Producer/Partner-specific profile data
 */

import { Timestamp } from 'firebase/firestore';

// Define a type for server timestamps that can be either a Timestamp or FieldValue
export type ServerTimestamp = Timestamp | { _seconds: number; _nanoseconds: number } | any;

/**
 * Core User Schema (harmonized_users collection)
 * Contains essential user information applicable to all user types
 */
export interface HarmonizedUser {
  // Primary identifiers
  id: string;                    // Unique identifier, also used in auth
  userId: string;                // Always matches id for consistency
  
  // Basic information
  name: string;                  // User's full name
  email: string;                 // User's email address
  phone: string;                 // Contact phone number
  
  // Role and status
  role: 'consumer' | 'producer' | 'partner';   // User role in the system
  emailVerified: boolean;        // Whether email has been verified
  points: number;                // Loyalty/reward points
  
  // Timestamps
  createdAt: Timestamp | ServerTimestamp;          // Account creation date
  updatedAt: Timestamp | ServerTimestamp;          // Last account update
  
  // Standardization tracking
  _standardized?: boolean;
  _standardizedVersion?: number;
}

/**
 * Tourist Profile Schema (user_profiles_tourist collection)
 * Contains consumer-specific information, linked to harmonized_users via id field
 */
export interface TouristProfile {
  // Link to core user (this matches the id in harmonized_users)
  id: string;
  
  // Profile customization
  profilePhoto?: string;         // URL to profile image
  loyaltyTier?: string;          // Loyalty program tier (e.g., Gold, Silver)
  
  // Preferences and history
  preferences?: string[];        // User interests and preferences
  wishlist?: string[];           // Saved experiences/packages
  bookingHistory?: string[];     // IDs of past bookings
  reviewsProvided?: string[];    // IDs of reviews submitted
  
  // Timestamps
  lastUpdated?: Timestamp | ServerTimestamp;       // Last profile update
}

/**
 * Service Provider Profile Schema (user_profiles_service_provider collection)
 * Contains producer/partner-specific information, linked to harmonized_users via providerId field
 */
export interface ServiceProviderProfile {
  // Link to core user (this matches the id in harmonized_users)
  providerId: string;
  
  // Business information
  businessName: string;          // Company/business name
  contactInformation: {
    address: string;             // Business address
  };
  
  // Profile details
  profilePhoto?: string;         // URL to logo/profile image
  servicesOffered: string[];     // Types of services provided
  certifications?: string[];     // Professional certifications
  ratings?: number;              // Average customer rating
  tags?: string[];               // Classification tags
  
  // Extended fields for Producer Dashboard
  yearsOfExperience?: number;
  industryAffiliations?: string[];
  professionalDescription?: string;
  communicationPreferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  profileVisibility?: 'public' | 'verified_users' | 'private';
  accountStatus?: 'active' | 'pending' | 'suspended';
  verificationStatus?: 'verified' | 'pending' | 'unverified';
  
  // Timestamps
  lastUpdated: Timestamp | ServerTimestamp;        // Last profile update
}

/**
 * Convert between different data formats for compatibility
 */

/**
 * Normalize a tourist profile from any format
 */
export function normalizeConsumerProfile(profile: any): TouristProfile {
  return {
    id: profile.id || profile.userId || '',
    profilePhoto: profile.profilePhoto || '',
    loyaltyTier: profile.loyaltyTier || 'Standard',
    preferences: Array.isArray(profile.preferences) ? profile.preferences : [],
    wishlist: Array.isArray(profile.wishlist) ? profile.wishlist : [],
    bookingHistory: Array.isArray(profile.bookingHistory) ? profile.bookingHistory : [],
    reviewsProvided: Array.isArray(profile.reviewsProvided) ? profile.reviewsProvided : [],
    lastUpdated: profile.lastUpdated || null
  };
}

/**
 * Normalize a service provider profile from any format
 */
export function normalizeServiceProviderProfile(profile: any): ServiceProviderProfile {
  return {
    providerId: profile.providerId || profile.id || '',
    businessName: profile.businessName || '',
    contactInformation: {
      address: profile.contactInformation?.address || profile.address || ''
    },
    profilePhoto: profile.profilePhoto || '',
    servicesOffered: Array.isArray(profile.servicesOffered) ? profile.servicesOffered : [],
    certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
    ratings: typeof profile.ratings === 'number' ? profile.ratings : 0,
    yearsOfExperience: typeof profile.yearsOfExperience === 'number' ? profile.yearsOfExperience : undefined,
    lastUpdated: profile.lastUpdated || null
  };
}