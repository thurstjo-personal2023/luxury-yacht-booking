/**
 * Harmonized User Schema
 * 
 * This file defines the schemas for the harmonized user data structure:
 * - harmonized_users: Core user data for all user types
 * - user_profiles_tourist: Consumer-specific profile data
 * - user_profiles_service_provider: Producer/Partner-specific profile data
 */

import { Timestamp } from "firebase/firestore";

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
  createdAt: Timestamp;          // Account creation date
  updatedAt: Timestamp;          // Last account update
  
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
  lastUpdated?: Timestamp;       // Last profile update
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
  lastUpdated: Timestamp;        // Last profile update
}

/**
 * Convert between different data formats for compatibility
 */

/**
 * Normalize a tourist profile from any format
 */
export function normalizeConsumerProfile(profile: any): TouristProfile {
  // Ensure arrays for collection fields
  const preferences = Array.isArray(profile.preferences) 
    ? profile.preferences 
    : profile.preferences ? Object.values(profile.preferences) : [];
  
  const wishlist = Array.isArray(profile.wishlist) 
    ? profile.wishlist 
    : profile.wishlist ? Object.values(profile.wishlist) : [];
  
  const bookingHistory = Array.isArray(profile.booking_history || profile.bookingHistory) 
    ? (profile.booking_history || profile.bookingHistory) 
    : (profile.booking_history || profile.bookingHistory) ? Object.values(profile.booking_history || profile.bookingHistory) : [];
  
  const reviewsProvided = Array.isArray(profile.reviews_provided || profile.reviewsProvided) 
    ? (profile.reviews_provided || profile.reviewsProvided) 
    : (profile.reviews_provided || profile.reviewsProvided) ? Object.values(profile.reviews_provided || profile.reviewsProvided) : [];

  // Create normalized profile
  return {
    id: profile.id,
    profilePhoto: profile.profile_photo || profile.profilePhoto,
    loyaltyTier: profile.loyalty_tier || profile.loyaltyTier,
    preferences,
    wishlist,
    bookingHistory,
    reviewsProvided,
    lastUpdated: profile.lastUpdated || profile.updatedAt || new Timestamp(Date.now() / 1000, 0)
  };
}

/**
 * Normalize a service provider profile from any format
 */
export function normalizeServiceProviderProfile(profile: any): ServiceProviderProfile {
  // Ensure arrays for collection fields
  const servicesOffered = Array.isArray(profile.services_offered || profile.servicesOffered) 
    ? (profile.services_offered || profile.servicesOffered) 
    : (profile.services_offered || profile.servicesOffered) ? Object.values(profile.services_offered || profile.servicesOffered) : [];
  
  const certifications = Array.isArray(profile.certifications) 
    ? profile.certifications 
    : profile.certifications ? Object.values(profile.certifications) : [];
  
  const tags = Array.isArray(profile.tags) 
    ? profile.tags 
    : profile.tags ? Object.values(profile.tags) : [];

  // Create normalized profile
  return {
    providerId: profile.id || profile.provider_id || profile.providerId,
    businessName: profile.business_name || profile.businessName,
    contactInformation: {
      address: profile.contact_information?.address || profile.contactInformation?.address || ''
    },
    profilePhoto: profile.profile_photo || profile.profilePhoto,
    servicesOffered,
    certifications,
    ratings: typeof profile.ratings === 'number' ? profile.ratings : 0,
    tags,
    lastUpdated: profile.last_updated_date || profile.lastUpdated || profile.updatedAt || new Timestamp(Date.now() / 1000, 0)
  };
}