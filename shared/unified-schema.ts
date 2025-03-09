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
  
  // Media
  media: Media[];
  
  // Status flags
  isAvailable: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  
  // Tags and categories
  tags: string[];
  
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