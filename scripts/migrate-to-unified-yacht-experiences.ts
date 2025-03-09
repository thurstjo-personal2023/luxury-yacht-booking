import { adminDb } from "../server/firebase-admin";
import type { Timestamp } from "firebase-admin/firestore";
import { Yacht } from "../shared/unified-schema";

interface SourceDocument {
  id?: string;
  package_id?: string;
  yachtId?: string;
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  yacht_type?: string;
  yachtType?: string;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    region?: string;
    port_marina?: string;
    portMarina?: string;
  };
  capacity?: number;
  max_guests?: number;
  duration?: number;
  pricing?: number;
  price?: number;
  pricing_model?: string;
  pricingModel?: string;
  customization_options?: Array<{
    id?: string;
    product_id?: string;
    name: string;
    price: number;
  }>;
  customizationOptions?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  media?: Array<{
    type: string;
    url: string;
  }>;
  availability_status?: boolean;
  available?: boolean;
  isAvailable?: boolean;
  featured?: boolean;
  isFeatured?: boolean;
  published_status?: boolean;
  isPublished?: boolean;
  tags?: string[];
  features?: string[];
  virtual_tour?: {
    enabled: boolean;
    scenes?: Array<{
      id: string;
      title: string;
      imageUrl: string;
      thumbnailUrl?: string;
      hotspots?: any[];
      initialViewParameters?: {
        pitch?: number;
        yaw?: number;
        hfov?: number;
      };
    }>;
  };
  virtualTour?: {
    isEnabled: boolean;
    scenes: Array<{
      id: string;
      title: string;
      imageUrl: string;
      thumbnailUrl?: string;
      hotspots?: any[];
      initialViewParameters?: {
        pitch?: number;
        yaw?: number;
        hfov?: number;
      };
    }>;
  };
  reviews?: Array<{
    rating: number;
    text?: string;
    userId?: string;
    createdAt?: Timestamp;
  }>;
  created_date?: Timestamp;
  createdAt?: Timestamp;
  last_updated_date?: Timestamp;
  updatedAt?: Timestamp;
  [key: string]: any; // For any other properties
}

/**
 * Normalize a document from any source collection into the unified schema
 */
function normalizeToUnifiedSchema(doc: FirebaseFirestore.DocumentSnapshot): Yacht {
  // Get raw data
  const data = doc.data() as SourceDocument;
  
  if (!data) {
    throw new Error(`No data found for document ${doc.id}`);
  }
  
  // Start with a clean yacht object
  const yacht: Partial<Yacht> = {};
  
  // Primary identifier - prioritize existing ID fields
  yacht.id = doc.id;
  
  // Store original collection source for debugging
  yacht._source = doc.ref.parent.id;
  
  // Basic information
  yacht.title = data.title || data.name || '';
  yacht.description = data.description || '';
  yacht.category = data.category || '';
  yacht.yachtType = data.yachtType || data.yacht_type || '';
  
  // Location information
  yacht.location = {
    address: data.location?.address || '',
    latitude: data.location?.latitude || 0,
    longitude: data.location?.longitude || 0,
    region: data.location?.region || 'dubai',
    portMarina: data.location?.portMarina || data.location?.port_marina || ''
  };
  
  // Capacity and pricing
  yacht.capacity = data.capacity || data.max_guests || 0;
  yacht.duration = data.duration || 0;
  yacht.pricing = data.pricing || data.price || 0;
  yacht.pricingModel = data.pricingModel || data.pricing_model || "Fixed";
  
  // Options and customization
  yacht.customizationOptions = (data.customizationOptions || data.customization_options || []).map(option => ({
    id: option.id || option.product_id || `option-${Math.random().toString(36).substring(2, 9)}`,
    name: option.name,
    price: option.price
  }));
  
  // Media
  yacht.media = data.media || [];
  
  // Status flags
  yacht.isAvailable = data.isAvailable || data.availability_status || data.available || false;
  yacht.isFeatured = data.isFeatured || data.featured || false;
  yacht.isPublished = data.isPublished || data.published_status || true;
  
  // Tags and categories
  yacht.tags = data.tags || data.features || [];
  
  // Reviews
  yacht.reviews = data.reviews?.map(review => ({
    rating: review.rating,
    text: review.text || '',
    userId: review.userId || '',
    createdAt: review.createdAt
  })) || [];
  
  // Virtual tour
  if (data.virtualTour || data.virtual_tour) {
    const sourceTour = data.virtualTour || data.virtual_tour;
    yacht.virtualTour = {
      isEnabled: sourceTour.isEnabled || sourceTour.enabled || false,
      scenes: (sourceTour.scenes || []).map(scene => ({
        id: scene.id,
        title: scene.title,
        imageUrl: scene.imageUrl,
        thumbnailUrl: scene.thumbnailUrl,
        hotspots: scene.hotspots || [],
        initialViewParameters: scene.initialViewParameters || {}
      }))
    };
  }
  
  // Timestamps
  yacht.createdAt = data.createdAt || data.created_date || null;
  yacht.updatedAt = data.updatedAt || data.last_updated_date || null;
  
  // Legacy fields (for backward compatibility during transition)
  yacht.package_id = data.package_id || doc.id;
  yacht.yachtId = data.yachtId || doc.id;
  yacht.name = data.name || data.title || '';
  yacht.availability_status = data.availability_status || data.isAvailable || data.available || false;
  yacht.available = data.available || data.isAvailable || data.availability_status || false;
  yacht.yacht_type = data.yacht_type || data.yachtType || '';
  yacht.features = data.features || data.tags || [];
  yacht.max_guests = data.max_guests || data.capacity || 0;
  yacht.price = data.price || data.pricing || 0;
  
  return yacht as Yacht;
}

/**
 * Migrate data from all yacht-related collections to unified_yacht_experiences
 */
export async function migrateToUnifiedCollection() {
  console.log('Starting migration to unified_yacht_experiences collection...');
  
  // Source collections
  const sourceCollections = [
    'yacht_experiences',
    'experience_packages',
    'yachts',
    'yacht_profiles'
  ];
  
  // Target collection
  const targetCollection = adminDb.collection('unified_yacht_experiences');
  
  // Track migration statistics
  const stats = {
    totalDocuments: 0,
    migratedDocuments: 0,
    errorDocuments: 0,
    duplicateSkipped: 0,
    byCollection: {} as Record<string, number>
  };
  
  // Keep track of migrated document IDs to avoid duplicates
  const migratedIds = new Set<string>();
  
  // Process each source collection
  for (const collectionName of sourceCollections) {
    try {
      console.log(`Processing collection: ${collectionName}`);
      stats.byCollection[collectionName] = 0;
      
      const sourceCollection = adminDb.collection(collectionName);
      const snapshot = await sourceCollection.get();
      
      if (snapshot.empty) {
        console.log(`No documents found in ${collectionName} collection`);
        continue;
      }
      
      console.log(`Found ${snapshot.size} documents in ${collectionName} collection`);
      stats.totalDocuments += snapshot.size;
      
      // Process each document
      for (const doc of snapshot.docs) {
        try {
          // Skip if we've already migrated a document with this ID
          if (migratedIds.has(doc.id)) {
            console.log(`Skipping document ${doc.id} (already migrated)`);
            stats.duplicateSkipped++;
            continue;
          }
          
          // Normalize to unified schema
          const unifiedYacht = normalizeToUnifiedSchema(doc);
          
          // Save to target collection using original ID
          await targetCollection.doc(doc.id).set(unifiedYacht);
          
          // Track migrated ID
          migratedIds.add(doc.id);
          
          // Update stats
          stats.migratedDocuments++;
          stats.byCollection[collectionName]++;
          
          console.log(`Migrated document ${doc.id} from ${collectionName}`);
        } catch (docError) {
          console.error(`Error migrating document ${doc.id} from ${collectionName}:`, docError);
          stats.errorDocuments++;
        }
      }
    } catch (collectionError) {
      console.error(`Error processing collection ${collectionName}:`, collectionError);
    }
  }
  
  console.log('Migration complete. Stats:', stats);
  return stats;
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateToUnifiedCollection()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}