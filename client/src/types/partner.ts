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
 * Available add-ons response from the API for producers 
 */
export interface AvailableAddOnsResponse {
  producerAddOns: PartnerAddon[];   // Add-ons created by the producer
  partnerAddOns: PartnerAddon[];    // Add-ons created by partners
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
 * Booking Add-On
 */
export interface BookingAddOn {
  addOnId: string;
  name: string;
  price: number;
  partnerId: string;
  commissionRate: number;
  commissionAmount: number;
  quantity: number;
  isIncluded: boolean;
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
  addOns: BookingAddOn[];
  addOnTotal: number;
  commissionTotal: number;
  createdAt: Timestamp;
}

/**
 * Add-on usage statistics
 */
export interface AddOnUsage {
  addOnId: string;
  name: string;
  bookingCount: number;
  totalRevenue: number;
  totalCommission: number;
  category: string;
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
  addOnUsage?: AddOnUsage[];  // Usage statistics for partner's add-ons
}