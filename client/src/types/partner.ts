import { Timestamp } from 'firebase/firestore';

/**
 * Partner profile response from the API
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
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };
  profile: ServiceProviderProfile;
}

/**
 * Service provider profile type from shared/harmonized-user-schema.ts
 */
export interface ServiceProviderProfile {
  providerId: string;
  businessName: string;
  contactInformation: {
    address: string;
    email?: string;
    phone?: string;
  };
  profilePhoto?: string;
  servicesOffered: string[];
  certifications?: string[];
  ratings?: number;
  tags?: string[];
  lastUpdated?: Timestamp;
  
  // Partner Dashboard specific fields
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
}

/**
 * Partner add-on product
 */
export interface PartnerAddon {
  id: string;               // Unique identifier for UI operations
  productId: string;        // Firebase document ID
  name: string;
  description: string;
  category: string;
  pricing: number;
  media?: Array<{
    type: 'image' | 'video';
    url: string;
  }>;
  availability: boolean;
  tags?: string[];
  partnerId: string;
  createdDate: Timestamp;
  lastUpdatedDate: Timestamp;
}

/**
 * Partner booking
 */
export interface PartnerBooking {
  bookingId: string;
  yachtId: string;
  yachtName: string;
  customerId: string;
  customerName: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalPrice: number;
  addOns: {
    addonId: string;
    name: string;
    price: number;
    partnerId: string;
  }[];
  createdAt: Timestamp;
}

/**
 * Partner earnings
 */
export interface PartnerEarnings {
  total: number;
  currentMonth: number;
  previousMonth: number;
  bookingsCount: number;
  commissionRate: number;
  recentPayouts?: {
    date: string;
    amount: number;
    bookingIds: string[];
  }[];
}