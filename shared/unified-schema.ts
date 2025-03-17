import { Timestamp } from "firebase/firestore";

/**
 * Location information for a yacht
 */
export interface Location {
  address: string;
  latitude: number;
  longitude: number;
  region: "dubai" | "abu-dhabi";
  portMarina: string;
}

/**
 * Media item (image or video)
 */
export interface Media {
  type: 'image' | 'video';
  url: string;
}

/**
 * Customization option for yacht booking
 */
export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
}

/**
 * Hotspot in a virtual tour scene
 */
export interface VirtualTourHotspot {
  id: string;
  pitch: number;
  yaw: number;
  text: string;
  type: "info" | "scene";
  sceneId?: string;
}

/**
 * Scene in a virtual tour
 */
export interface VirtualTourScene {
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  hotspots?: VirtualTourHotspot[];
  initialViewParameters?: {
    pitch?: number;
    yaw?: number;
    hfov?: number;
  };
}

/**
 * Virtual tour data
 */
export interface VirtualTour {
  isEnabled: boolean;
  scenes: VirtualTourScene[];
}

/**
 * Review for a yacht
 */
export interface Review {
  rating: number;
  text?: string;
  userId?: string;
  createdAt?: Timestamp;
}

/**
 * Reference to a service or product add-on that can be bundled with a yacht experience
 */
export interface AddOnReference {
  addOnId: string;         // ID of the add-on
  partnerId?: string;      // ID of the partner who created it (null if producer's own)
  name: string;            // Name of the add-on (for display purposes)
  description?: string;    // Brief description of the add-on
  pricing: number;         // Price set by producer for this experience
  isRequired: boolean;     // Whether this add-on is mandatory or optional
  commissionRate: number;  // Percentage that goes to the partner
  maxQuantity?: number;    // Maximum units that can be purchased (optional)
  category?: string;       // Category of the add-on
  mediaUrl?: string;       // Primary image URL for the add-on
}

/**
 * Unified Yacht interface that combines all fields from previous schemas
 * with standardized field naming
 */
export interface Yacht {
  // Primary identifier
  id: string;
  
  // Basic information
  title: string;
  description: string;
  category: string;
  yachtType: string;
  
  // Location information
  location: Location;
  
  // Capacity and pricing
  capacity: number;
  duration: number;
  pricing: number;
  pricingModel: "Fixed" | "Variable";
  
  // Options and customization
  customizationOptions: CustomizationOption[];
  
  // Add-ons bundling
  includedAddOns?: AddOnReference[];  // Add-ons included in base price
  optionalAddOns?: AddOnReference[];  // Add-ons available for extra charge
  
  // Media
  media: Media[];
  
  // Status flags
  isAvailable: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  
  // Tags and categories
  tags: string[];
  
  // Ownership and management
  providerId?: string; // ID of the producer/provider who owns this yacht
  
  // Reviews
  reviews?: Review[];
  
  // Virtual tour data
  virtualTour?: VirtualTour;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Legacy fields (for backward compatibility during transition)
  package_id?: string;
  yachtId?: string;
  name?: string;
  availability_status?: boolean;
  available?: boolean;
  yacht_type?: string;
  features?: string[];
  max_guests?: number;
  price?: number;
  producerId?: string; // Legacy field for producer ID
}

/**
 * Simplified yacht type for list views
 */
export interface YachtSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  location: Location;
  pricing: number;
  capacity: number;
  duration: number;
  isAvailable: boolean;
  isFeatured: boolean;
  mainImage?: string;
  includedAddOnsCount?: number;   // Count of included add-ons
  optionalAddOnsCount?: number;   // Count of optional add-ons
  hasPartnerAddOns?: boolean;     // Whether yacht includes partner add-ons
}

/**
 * Response format for paginated yacht queries
 */
export interface PaginatedYachtsResponse {
  yachts: YachtSummary[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}