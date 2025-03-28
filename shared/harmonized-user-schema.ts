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
 * Admin Role Type
 * Represents the role of an administrator in the system
 */
export type AdminRoleType = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';

/**
 * Admin User Status
 * Represents the approval status of an administrator
 */
export type AdminUserStatus = 'active' | 'pending_approval' | 'disabled';

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
  
  // Demographics (applies to all user types)
  dateOfBirth?: string;          // Date of birth in ISO format
  gender?: string;               // Gender (optional)
  nationality?: string;          // User's nationality
  
  // Account preferences (applies to all user types)
  preferredLanguage?: string;    // Preferred language for communications
  preferredCurrency?: string;    // Preferred currency for transactions
  
  // Emergency contact (applies to all user types)
  emergencyContact?: {
    name: string;                // Name of emergency contact
    phoneNumber: string;         // Phone number of emergency contact
    relationship?: string;       // Relationship to user
  };
  
  // Role and status
  role: 'consumer' | 'producer' | 'partner';   // User role in the system
  emailVerified: boolean;        // Whether email has been verified
  points: number;                // Loyalty/reward points
  
  // Administrator-specific fields
  isAdmin?: boolean;                     // Flag indicating if this is an admin user
  adminRole?: AdminRoleType;             // The admin role (if isAdmin is true)
  adminStatus?: AdminUserStatus;         // Admin approval status
  adminDepartment?: string;              // Department within Etoile Yachts
  adminPosition?: string;                // Position/title within the department
  mfaEnabled?: boolean;                  // Whether MFA is enabled
  mfaVerified?: boolean;                 // Whether MFA has been verified
  adminLastLogin?: Timestamp | ServerTimestamp;  // Last admin login timestamp
  
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
  address?: string;              // Mailing/residential address (specific to tourist profiles)
  
  // Loyalty Program Information
  loyaltyTier?: string;          // Loyalty tier (e.g., Bronze, Silver, Gold)
  loyaltyPoints?: number;        // Current loyalty points balance
  rewardsHistory?: {             // History of rewards earned/redeemed
    id: string;
    type: 'earned' | 'redeemed';
    points: number;
    description: string;
    date: Timestamp | ServerTimestamp;
  }[];
  
  // Travel Preferences (consumer-specific)
  activityPreferences?: string[];  // Preferred activities (e.g., snorkeling, luxury dining)
  dietaryRestrictions?: string[];  // Food preferences/restrictions
  accessibilityNeeds?: string[];   // Accessibility requirements
  favoriteDestinations?: string[]; // Favorite marinas or regions
  
  // Communication preferences
  communicationPreferences?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    marketingEmails?: boolean;
  };
  
  // Payment Information (secured/tokenized)
  paymentMethods?: {
    id: string;
    type: string;               // Card type or payment method type
    lastFour?: string;          // Last 4 digits (for cards)
    expiryMonth?: string;       // Expiry month (for cards)
    expiryYear?: string;        // Expiry year (for cards)
    isDefault?: boolean;        // Whether this is the default payment method
    billingAddress?: string;    // Billing address for this payment method
  }[];
  
  // Booking and Interaction History
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
    
    // Profile information
    profilePhoto: profile.profilePhoto || '',
    address: profile.address || '',
    
    // Loyalty information
    loyaltyTier: profile.loyaltyTier || 'Standard',
    loyaltyPoints: typeof profile.loyaltyPoints === 'number' ? profile.loyaltyPoints : 0,
    rewardsHistory: Array.isArray(profile.rewardsHistory) ? profile.rewardsHistory : [],
    
    // Travel preferences
    activityPreferences: Array.isArray(profile.activityPreferences) ? profile.activityPreferences : [],
    dietaryRestrictions: Array.isArray(profile.dietaryRestrictions) ? profile.dietaryRestrictions : [],
    accessibilityNeeds: Array.isArray(profile.accessibilityNeeds) ? profile.accessibilityNeeds : [],
    favoriteDestinations: Array.isArray(profile.favoriteDestinations) ? profile.favoriteDestinations : [],
    
    // Communication preferences
    communicationPreferences: {
      email: profile.communicationPreferences?.email || false,
      sms: profile.communicationPreferences?.sms || false,
      push: profile.communicationPreferences?.push || false,
      marketingEmails: profile.communicationPreferences?.marketingEmails || false
    },
    
    // Payment methods (secured/tokenized)
    paymentMethods: Array.isArray(profile.paymentMethods) ? profile.paymentMethods : [],
    
    // Booking and preferences history
    preferences: Array.isArray(profile.preferences) ? profile.preferences : [],
    wishlist: Array.isArray(profile.wishlist) ? profile.wishlist : [],
    bookingHistory: Array.isArray(profile.bookingHistory) ? profile.bookingHistory : [],
    reviewsProvided: Array.isArray(profile.reviewsProvided) ? profile.reviewsProvided : [],
    
    // Timestamps
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