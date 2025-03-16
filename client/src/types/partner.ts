/**
 * Partner/Service Provider Types
 * 
 * This file defines the types for the partner dashboard functionality.
 * It mirrors the server-side types defined in the harmonized-user-schema.ts
 */

/**
 * Service Provider Profile Schema
 * Contains producer/partner-specific information, linked to core user via providerId
 */
export interface ServiceProviderProfile {
  // Link to core user
  providerId: string;
  
  // Business information
  businessName: string;
  contactInformation: {
    address: string;
    email?: string;
    phone?: string;
  };
  
  // Profile details
  profilePhoto?: string;
  servicesOffered: string[];
  certifications?: string[];
  ratings?: number;
  tags?: string[];
  
  // Extended fields for Partner/Producer Dashboard
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
  lastUpdated?: any;
}

/**
 * Partner Profile Response 
 * Response from /api/partner/profile endpoint
 */
export interface PartnerProfileResponse {
  core: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'partner';
    emailVerified: boolean;
    points: number;
    createdAt: any;
    updatedAt: any;
  };
  profile: ServiceProviderProfile | null;
}

/**
 * Partner Add-on type
 */
export interface PartnerAddon {
  id: string;
  name: string;
  description: string;
  category: string;
  pricing: number;
  media?: Array<{ type: string; url: string }>;
  availability: boolean;
  tags: string[];
  partnerId: string;
  createdDate: any;
  lastUpdatedDate: any;
}

/**
 * Partner Booking type
 */
export interface PartnerBooking {
  id: string;
  yachtId?: string;
  userId?: string;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  startDate?: string | Date;
  endDate?: string | Date;
  totalPrice?: number;
  addOns?: Array<{
    id?: string;
    productId?: string;
    name?: string;
    price?: number;
  }>;
  partnerAddons?: Array<{
    id?: string;
    productId?: string;
    name?: string;
    price?: number;
  }>;
  createdAt?: any;
}

/**
 * Partner Earnings type
 */
export interface PartnerEarnings {
  total: number;
  currentMonth: number;
  previousMonth: number;
  bookingsCount: number;
  commissionRate: number;
}