/**
 * Generate Standardized Unified Yacht Experiences JSON
 * 
 * This script creates a standardized unified_yacht_experiences.json file
 * from sample data for importing into Firebase Emulator.
 */

import { writeFileSync } from 'fs';

// Sample yacht data with a variety of field formats to test standardization
const sampleYachts = [
  {
    id: "yacht-001",
    title: "Luxury Yacht Experience",
    description: "Experience luxury on the water with this premium yacht.",
    category: "Luxury",
    yacht_type: "Motor Yacht",
    location: {
      address: "Dubai Marina Berth 42",
      latitude: 25.2697,
      longitude: 55.2774,
      region: "dubai",
      port_marina: "Dubai Marina"
    },
    capacity: 12,
    duration: 4,
    pricing: 2500,
    pricing_model: "Fixed",
    customization_options: [
      {
        name: "Premium Catering",
        price: 500
      },
      {
        name: "Watersports Package",
        price: 700
      }
    ],
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1577032229840-33197764440d?w=800"
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1558627044-118eb226e9d9?w=800"
      }
    ],
    availability_status: true,
    featured: true,
    published_status: true,
    tags: ["luxury", "premium", "family", "fishing"],
    created_date: { _seconds: 1630444800, _nanoseconds: 0 },
    last_updated_date: { _seconds: 1741677000, _nanoseconds: 0 }
  },
  {
    id: "yacht-002",
    name: "Sunset Cruise",
    description: "Enjoy the beautiful sunset views from the Arabian Gulf.",
    category: "Cruising",
    yachtType: "Sailing Yacht",
    location: {
      address: "Abu Dhabi Yas Marina",
      latitude: 24.4672,
      longitude: 54.6031,
      region: "abu-dhabi",
      portMarina: "Yas Marina"
    },
    max_guests: 8,
    duration: 3,
    price: 1800,
    pricingModel: "Variable",
    customizationOptions: [
      {
        id: "option-1",
        name: "Photography Package",
        price: 300
      }
    ],
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1565778827801-1d062e280a95?w=800"
      }
    ],
    isAvailable: true,
    isFeatured: false,
    isPublished: true,
    tags: ["romantic", "sunset", "couples"],
    createdAt: { _seconds: 1635724800, _nanoseconds: 0 },
    updatedAt: { _seconds: 1741677200, _nanoseconds: 0 }
  },
  {
    id: "yacht-003",
    title: "Deep Sea Fishing Adventure",
    description: "Test your fishing skills with our deep sea fishing experience.",
    category: "Fishing",
    yacht_type: "Sports Fishing Yacht",
    location: {
      address: "Dubai Fishing Harbor",
      latitude: 25.3157,
      longitude: 55.3046,
      region: "dubai",
      port_marina: "Fishing Harbor"
    },
    capacity: 6,
    duration: 6,
    pricing: 3200,
    pricing_model: "Fixed",
    customization_options: [
      {
        name: "Fishing Equipment",
        price: 200
      },
      {
        name: "Professional Guide",
        price: 600
      }
    ],
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1578892402677-c8d1ac0543a4?w=800"
      }
    ],
    available: false,
    featured: true,
    published_status: true,
    tags: ["fishing", "adventure", "sport"],
    created_date: { _seconds: 1638316800, _nanoseconds: 0 },
    last_updated_date: { _seconds: 1741677400, _nanoseconds: 0 },
    virtual_tour: {
      enabled: true,
      scenes: [
        {
          id: "scene-1",
          title: "Deck View",
          imageUrl: "https://images.unsplash.com/photo-1576650250697-e9de7a5827a9?w=800",
          hotspots: [
            {
              id: "hotspot-1",
              pitch: 0,
              yaw: 180,
              text: "Fishing area",
              type: "info"
            }
          ]
        }
      ]
    }
  },
  {
    id: "yacht-004",
    name: "Party Boat Experience",
    description: "Perfect for celebrations and parties on the water.",
    category: "Entertainment",
    yacht_type: "Party Boat",
    location: {
      address: "Dubai Marina Walk",
      latitude: 25.2697,
      longitude: 55.2774,
      region: "dubai",
      port_marina: "Dubai Marina"
    },
    max_guests: 20,
    duration: 5,
    price: 4000,
    pricing_model: "Variable",
    customization_options: [
      {
        name: "DJ Service",
        price: 800
      },
      {
        name: "Decorations",
        price: 300
      },
      {
        name: "Premium Bar",
        price: 1200
      }
    ],
    media: "https://images.unsplash.com/photo-1576487252312-b743b3d35ef9?w=800",
    available: true,
    featured: false,
    published_status: true,
    tags: ["party", "celebration", "entertainment", "group"],
    reviews: [
      { 
        rating: 4.8,
        text: "Amazing experience for our anniversary!",
        userId: "user-123"
      },
      {
        rating: 4.5,
        text: "Great staff and service!"
      }
    ],
    created_date: { _seconds: 1640995200, _nanoseconds: 0 },
    last_updated_date: { _seconds: 1741677600, _nanoseconds: 0 }
  }
];

// Sample product add-ons data
const sampleAddOns = [
  {
    productId: "ADD001",
    name: "Premium Catering Package",
    description: "Gourmet catering service with chef on board",
    category: "Food & Beverage",
    pricing: 1500,
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800"
      }
    ],
    availability: true,
    tags: ["catering", "food", "premium", "service"],
    partnerId: "partner-001",
    createdDate: { _seconds: 1635724800, _nanoseconds: 0 },
    lastUpdatedDate: { _seconds: 1741677800, _nanoseconds: 0 }
  },
  {
    id: "ADD002",
    name: "Professional Photography",
    description: "Professional photographer to capture your experience",
    category: "Photography",
    pricing: 800,
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800"
      }
    ],
    isAvailable: true,
    tags: ["photography", "memories", "service"],
    partnerId: "partner-002",
    createdAt: { _seconds: 1638316800, _nanoseconds: 0 },
    updatedAt: { _seconds: 1741678000, _nanoseconds: 0 }
  },
  {
    productId: "ADD003",
    name: "Water Sports Package",
    description: "Includes jet ski rental, banana boat, and paddleboards",
    category: "Activities",
    pricing: 1200,
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1599137937039-eb04c6419dd8?w=800"
      }
    ],
    availability: false,
    tags: ["water sports", "activities", "adventure"],
    partnerId: "partner-003",
    createdDate: { _seconds: 1640995200, _nanoseconds: 0 },
    lastUpdatedDate: { _seconds: 1741678200, _nanoseconds: 0 }
  }
];

/**
 * Standardize the document fields for consistency
 * Ensures all documents have the same field names and structure
 */
function standardizeYacht(yacht) {
  // Standardize Timestamps
  const normalizeTimestamp = (timestamp) => {
    if (!timestamp) {
      return { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 };
    }
    
    if (typeof timestamp === 'object' && timestamp._seconds !== undefined) {
      return timestamp;
    }
    
    return { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 };
  };
  
  // Helper to normalize numeric fields
  const normalizeNumber = (value, defaultValue = 0) => {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'number') return value;
    
    // Try to convert string to number
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) return parsed;
    }
    
    return defaultValue;
  };
  
  // Helper to determine availability status
  function determineAvailabilityStatus(data) {
    // Prioritize in this order: isAvailable, availability_status, available
    if (data.isAvailable !== undefined) return !!data.isAvailable; 
    if (data.availability_status !== undefined) return !!data.availability_status;
    if (data.available !== undefined) return !!data.available;
    return true; // Default to available
  }
  
  // Helper to standardize location structure
  function standardizeLocation(location) {
    if (!location) {
      return {
        address: "",
        latitude: 0,
        longitude: 0,
        region: "dubai",
        portMarina: ""
      };
    }
    
    return {
      address: location.address || "",
      latitude: location.latitude || 0,
      longitude: location.longitude || 0,
      region: location.region || "dubai",
      portMarina: location.portMarina || location.port_marina || ""
    };
  }
  
  // Helper to standardize virtual tour data
  function standardizeVirtualTour(tourData) {
    if (!tourData) {
      return {
        isEnabled: false,
        scenes: []
      };
    }
    
    return {
      isEnabled: tourData.isEnabled || tourData.enabled || false,
      scenes: ensureArray(tourData.scenes).map(scene => ({
        id: scene.id || "",
        title: scene.title || "",
        imageUrl: scene.imageUrl || "",
        thumbnailUrl: scene.thumbnailUrl || "",
        hotspots: ensureArray(scene.hotspots),
        initialViewParameters: scene.initialViewParameters || {}
      }))
    };
  }
  
  // Helper to ensure a value is an array
  function ensureArray(value) {
    if (!value) return [];
    
    // Already an array - perfect!
    if (Array.isArray(value)) return value;
    
    // Handle object with numeric keys that should be an array
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.some(k => !isNaN(parseInt(k)))) {
        // Sort keys numerically to maintain array order
        const numericKeys = keys
          .filter(k => !isNaN(parseInt(k)))
          .sort((a, b) => parseInt(a) - parseInt(b));
        
        // Create properly ordered array
        return numericKeys.map(k => value[k]).filter(Boolean);
      }
    }
    
    // Default case: wrap single value in array
    return [value];
  }
  
  // Helper to get main image URL
  function getMainImageURL(data) {
    // Check for existing mainImage field
    if (data.mainImage && typeof data.mainImage === 'string') {
      return data.mainImage;
    }
    
    // Check for imageUrl field
    if (data.imageUrl && typeof data.imageUrl === 'string') {
      return data.imageUrl;
    }
    
    // Check for media array
    if (Array.isArray(data.media) && data.media.length > 0) {
      const firstImage = data.media[0];
      // Handle standard media object format
      if (firstImage && typeof firstImage === 'object' && firstImage.url) {
        return firstImage.url;
      }
      
      // Handle case where media item is a string directly
      if (typeof firstImage === 'string') {
        return firstImage;
      }
    }
    
    // Handle case where media is a string directly
    if (typeof data.media === 'string' && data.media) {
      return data.media;
    }
    
    // Default to a standard yacht image
    return "https://images.unsplash.com/photo-1577032229840-33197764440d?w=800";
  }
  
  // Create standardized media array
  const standardizedMedia = (() => {
    if (typeof yacht.media === 'string') {
      return [{ type: 'image', url: yacht.media }];
    }
    
    if (Array.isArray(yacht.media)) {
      return yacht.media.map(item => {
        if (typeof item === 'string') {
          return { type: 'image', url: item };
        }
        return {
          type: item.type || 'image',
          url: item.url || ''
        };
      }).filter(item => item.url);
    }
    
    return [{ 
      type: 'image', 
      url: "https://images.unsplash.com/photo-1577032229840-33197764440d?w=800" 
    }];
  })();
  
  // Create standardized customization options
  const standardizedOptions = (() => {
    const options = yacht.customizationOptions || yacht.customization_options || [];
    if (!Array.isArray(options)) return [];
    
    return options.map(option => {
      if (typeof option === 'object' && option !== null) {
        return {
          id: option.id || option.product_id || `option-${Math.random().toString(36).substring(2, 6)}`,
          name: option.name || '',
          price: normalizeNumber(option.price)
        };
      }
      return null;
    }).filter(Boolean);
  })();
  
  // Create standardized reviews
  const standardizedReviews = (() => {
    const reviews = yacht.reviews || [];
    if (!Array.isArray(reviews)) return [];
    
    return reviews.map(review => {
      if (typeof review === 'object' && review !== null) {
        return {
          rating: normalizeNumber(review.rating),
          text: review.text || review.reviewText || '',
          userId: review.userId || '',
          createdAt: normalizeTimestamp(review.createdAt || review.date)
        };
      }
      return null;
    }).filter(Boolean);
  })();
  
  // Standardized document
  const standardized = {
    // Primary identifier
    id: yacht.id || yacht.package_id || yacht.yachtId || `yacht-${Math.random().toString(36).substring(2, 6)}`,
    
    // Basic information - standardize on camelCase
    title: yacht.title || yacht.name || '',
    description: yacht.description || '',
    category: yacht.category || yacht.type || '',
    yachtType: yacht.yachtType || yacht.yacht_type || '',
    
    // Location information - standardize structure
    location: standardizeLocation(yacht.location),
    
    // Capacity and pricing - standardize numeric fields
    capacity: normalizeNumber(yacht.capacity || yacht.max_guests),
    duration: normalizeNumber(yacht.duration),
    pricing: normalizeNumber(yacht.pricing || yacht.price),
    pricingModel: yacht.pricingModel || yacht.pricing_model || "Fixed",
    
    // Arrays - ensure they are always properly structured arrays
    customizationOptions: standardizedOptions,
    media: standardizedMedia,
    tags: ensureArray(yacht.tags || yacht.features),
    reviews: standardizedReviews,
    
    // Status fields - standardize on camelCase
    isAvailable: determineAvailabilityStatus(yacht),
    isFeatured: !!yacht.isFeatured || !!yacht.featured || false,
    isPublished: !!yacht.isPublished || !!yacht.published_status || true,
    
    // Owner/provider info
    providerId: yacht.providerId || yacht.producerId || yacht.producer_id || null,
    
    // Virtual tour data
    virtualTour: standardizeVirtualTour(yacht.virtualTour || yacht.virtual_tour),
    
    // Timestamps - standardize to camelCase
    createdAt: normalizeTimestamp(yacht.createdAt || yacht.created_date),
    updatedAt: normalizeTimestamp(yacht.updatedAt || yacht.last_updated_date),
    
    // Special field for cache busting
    _lastUpdated: Date.now().toString(),
    
    // Legacy fields preserved for backward compatibility
    name: yacht.title || yacht.name || '',
    availability_status: determineAvailabilityStatus(yacht),
    available: determineAvailabilityStatus(yacht),
    features: ensureArray(yacht.tags || yacht.features),
    yacht_type: yacht.yachtType || yacht.yacht_type || '',
    price: normalizeNumber(yacht.pricing || yacht.price),
    max_guests: normalizeNumber(yacht.capacity || yacht.max_guests),
    created_date: normalizeTimestamp(yacht.createdAt || yacht.created_date),
    last_updated_date: normalizeTimestamp(yacht.updatedAt || yacht.last_updated_date),
    
    // Main image for easier access
    mainImage: getMainImageURL(yacht),
    
    // Source tracking to identify which records have been standardized
    _standardized: true,
    _standardizedVersion: 2
  };
  
  return standardized;
}

/**
 * Standardize an add-on document
 */
function standardizeAddOn(addon) {
  // Helper to normalize timestamps
  const normalizeTimestamp = (timestamp) => {
    if (!timestamp) {
      return { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 };
    }
    
    if (typeof timestamp === 'object' && timestamp._seconds !== undefined) {
      return timestamp;
    }
    
    return { _seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0 };
  };
  
  // Helper to normalize numeric fields
  const normalizeNumber = (value, defaultValue = 0) => {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'number') return value;
    
    // Try to convert string to number
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) return parsed;
    }
    
    return defaultValue;
  };
  
  // Helper to ensure a value is an array
  function ensureArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }
  
  // Helper to determine availability status
  function determineAvailabilityStatus(data) {
    if (data.isAvailable !== undefined) return !!data.isAvailable; 
    if (data.availability !== undefined) return !!data.availability;
    if (data.available !== undefined) return !!data.available;
    return true;
  }
  
  // Helper to get main image URL
  function getMainImageURL(data) {
    // Check for existing mainImage field
    if (data.mainImage && typeof data.mainImage === 'string') {
      return data.mainImage;
    }
    
    // Check for imageUrl field
    if (data.imageUrl && typeof data.imageUrl === 'string') {
      return data.imageUrl;
    }
    
    // Check for media array
    if (Array.isArray(data.media) && data.media.length > 0) {
      const firstImage = data.media[0];
      // Handle standard media object format
      if (firstImage && typeof firstImage === 'object' && firstImage.url) {
        return firstImage.url;
      }
      
      // Handle case where media item is a string directly
      if (typeof firstImage === 'string') {
        return firstImage;
      }
    }
    
    // Handle case where media is a string directly
    if (typeof data.media === 'string' && data.media) {
      return data.media;
    }
    
    // Default to a standard add-on image
    return "https://images.unsplash.com/photo-1578592338145-e1844658b5c3?w=800";
  }
  
  // Create standardized media array
  const standardizedMedia = (() => {
    if (typeof addon.media === 'string') {
      return [{ type: 'image', url: addon.media }];
    }
    
    if (Array.isArray(addon.media)) {
      return addon.media.map(item => {
        if (typeof item === 'string') {
          return { type: 'image', url: item };
        }
        return {
          type: item.type || 'image',
          url: item.url || ''
        };
      }).filter(item => item.url);
    }
    
    return [{ 
      type: 'image', 
      url: "https://images.unsplash.com/photo-1578592338145-e1844658b5c3?w=800" 
    }];
  })();
  
  // Standardized document
  const standardized = {
    // Primary identifier
    id: addon.productId || addon.id || `add-${Math.random().toString(36).substring(2, 6)}`,
    
    // Basic information
    name: addon.name || '',
    description: addon.description || '',
    category: addon.category || '',
    
    // Media handling
    media: standardizedMedia,
    mainImage: getMainImageURL(addon),
    
    // Status fields
    isAvailable: determineAvailabilityStatus(addon),
    
    // Pricing
    pricing: normalizeNumber(addon.pricing || addon.price),
    
    // Arrays
    tags: ensureArray(addon.tags),
    
    // Partner/Provider information
    partnerId: addon.partnerId || addon.provider_id || null,
    
    // Timestamps
    createdAt: normalizeTimestamp(addon.createdAt || addon.createdDate),
    updatedAt: normalizeTimestamp(addon.updatedAt || addon.lastUpdatedDate),
    
    // Special field for cache busting
    _lastUpdated: Date.now().toString(),
    
    // Legacy fields preserved for backward compatibility
    productId: addon.productId || addon.id || `add-${Math.random().toString(36).substring(2, 6)}`,
    availability: determineAvailabilityStatus(addon),
    createdDate: normalizeTimestamp(addon.createdAt || addon.createdDate),
    lastUpdatedDate: normalizeTimestamp(addon.updatedAt || addon.lastUpdatedDate),
    
    // Source tracking to identify which records have been standardized
    _standardized: true,
    _standardizedVersion: 1
  };
  
  return standardized;
}

// Generate standardized collections
const standardizedYachts = sampleYachts.map(yacht => standardizeYacht(yacht));
const standardizedAddOns = sampleAddOns.map(addon => standardizeAddOn(addon));

// Generate JSON files

// Write unified_yacht_experiences.json
writeFileSync(
  'unified_yacht_experiences.json', 
  JSON.stringify(standardizedYachts, null, 2)
);

// Write products_add_ons.json
writeFileSync(
  'products_add_ons.json', 
  JSON.stringify(standardizedAddOns, null, 2)
);

console.log('Generated standardized collections:');
console.log(`- unified_yacht_experiences.json (${standardizedYachts.length} records)`);
console.log(`- products_add_ons.json (${standardizedAddOns.length} records)`);