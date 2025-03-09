import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  Timestamp,
  connectFirestoreEmulator
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "fake-api-key-for-emulator",
  authDomain: "fake-auth-domain-for-emulator",
  projectId: "fake-project-id-for-emulator",
  storageBucket: "fake-storage-bucket-for-emulator",
  messagingSenderId: "fake-messaging-sender-id-for-emulator",
  appId: "fake-app-id-for-emulator"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to Firestore emulator when running locally
if (process.env.NODE_ENV !== 'production') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  console.log('Connected to Firestore emulator');
}

/**
 * Migrates data from yacht_experiences and experience_packages collections to a unified yachts collection
 */
// Define appropriate type for the documents with all possible properties
interface YachtDocument {
  id: string;
  package_id?: string;
  yachtId?: string;
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  yacht_type?: string;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    region?: string;
    port_marina?: string;
  };
  capacity?: number;
  max_guests?: number;
  duration?: number;
  pricing?: number;
  price?: number;
  pricing_model?: string;
  customization_options?: Array<{
    product_id?: string;
    name: string;
    price: number;
  }>;
  media?: Array<{
    type: string;
    url: string;
  }>;
  availability_status?: boolean;
  available?: boolean;
  featured?: boolean;
  published_status?: boolean;
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
  created_date?: any;
  createdAt?: any;
  last_updated_date?: any;
  updatedAt?: any;
  [key: string]: any; // For any other properties
}

async function migrateToUnifiedCollection() {
  console.log('Starting migration to unified yachts collection...');
  
  try {
    // 1. Get all documents from yacht_experiences collection
    console.log('Fetching documents from yacht_experiences collection...');
    const yachtExperiencesSnapshot = await getDocs(collection(db, "yacht_experiences"));
    const yachtExperiences: YachtDocument[] = yachtExperiencesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`Found ${yachtExperiences.length} documents in yacht_experiences collection`);
    
    // 2. Get all documents from experience_packages collection
    console.log('Fetching documents from experience_packages collection...');
    const experiencePackagesSnapshot = await getDocs(collection(db, "experience_packages"));
    const experiencePackages: YachtDocument[] = experiencePackagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`Found ${experiencePackages.length} documents in experience_packages collection`);
    
    // 3. Combine and deduplicate based on ID
    const combinedData: YachtDocument[] = [...yachtExperiences];
    let duplicatesSkipped = 0;
    
    experiencePackages.forEach(pkg => {
      if (!combinedData.find(y => 
        y.id === pkg.id || 
        (y.package_id && y.package_id === pkg.id) || 
        (y.yachtId && y.yachtId === pkg.id)
      )) {
        combinedData.push(pkg);
      } else {
        duplicatesSkipped++;
      }
    });
    
    console.log(`Combined data contains ${combinedData.length} unique documents (skipped ${duplicatesSkipped} duplicates)`);
    
    // 4. Transform and migrate each document to the unified collection
    console.log('Migrating documents to unified yachts collection...');
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const sourceDoc of combinedData) {
      try {
        // Create normalized yacht record with type safety
        const normalizedYacht = {
          // Core fields with new naming convention
          id: sourceDoc.id || (sourceDoc.package_id as string) || (sourceDoc.yachtId as string) || '',
          title: (sourceDoc.title as string) || (sourceDoc.name as string) || "",
          description: (sourceDoc.description as string) || "",
          category: (sourceDoc.category as string) || "",
          yachtType: (sourceDoc.yacht_type as string) || "",
          
          location: {
            address: sourceDoc.location?.address || "",
            latitude: sourceDoc.location?.latitude || 0,
            longitude: sourceDoc.location?.longitude || 0,
            region: sourceDoc.location?.region || "dubai",
            portMarina: sourceDoc.location?.port_marina || ""
          },
          
          capacity: (sourceDoc.capacity as number) || (sourceDoc.max_guests as number) || 10,
          duration: (sourceDoc.duration as number) || 4,
          pricing: (sourceDoc.pricing as number) || (sourceDoc.price as number) || 0,
          pricingModel: (sourceDoc.pricing_model as string) || "Fixed",
          
          customizationOptions: Array.isArray(sourceDoc.customization_options) 
            ? sourceDoc.customization_options.map((option: any) => ({
                id: option.product_id || `option-${Date.now()}`,
                name: option.name,
                price: option.price
              }))
            : [],
          
          media: Array.isArray(sourceDoc.media) ? sourceDoc.media : [],
          
          isAvailable: sourceDoc.availability_status !== undefined 
            ? !!sourceDoc.availability_status 
            : (sourceDoc.available !== undefined ? !!sourceDoc.available : true),
            
          isFeatured: !!sourceDoc.featured,
          isPublished: sourceDoc.published_status !== undefined ? !!sourceDoc.published_status : true,
          
          tags: Array.isArray(sourceDoc.tags) 
            ? sourceDoc.tags 
            : (Array.isArray(sourceDoc.features) ? sourceDoc.features : []),
          
          virtualTour: sourceDoc.virtual_tour ? {
            isEnabled: !!sourceDoc.virtual_tour.enabled,
            scenes: Array.isArray(sourceDoc.virtual_tour.scenes) 
              ? sourceDoc.virtual_tour.scenes.map((scene: any) => ({
                  id: scene.id,
                  title: scene.title,
                  imageUrl: scene.imageUrl,
                  thumbnailUrl: scene.thumbnailUrl,
                  hotspots: scene.hotspots,
                  initialViewParameters: scene.initialViewParameters
                }))
              : []
          } : {
            isEnabled: false,
            scenes: []
          },
          
          createdAt: sourceDoc.created_date || sourceDoc.createdAt || Timestamp.now(),
          updatedAt: sourceDoc.last_updated_date || sourceDoc.updatedAt || Timestamp.now(),
          
          // Legacy fields for backward compatibility
          package_id: sourceDoc.id || (sourceDoc.package_id as string) || (sourceDoc.yachtId as string) || '',
          yachtId: sourceDoc.id || (sourceDoc.package_id as string) || (sourceDoc.yachtId as string) || '',
          name: (sourceDoc.title as string) || (sourceDoc.name as string) || "",
          availability_status: sourceDoc.availability_status !== undefined 
            ? !!sourceDoc.availability_status 
            : (sourceDoc.available !== undefined ? !!sourceDoc.available : true),
          available: sourceDoc.availability_status !== undefined 
            ? !!sourceDoc.availability_status 
            : (sourceDoc.available !== undefined ? !!sourceDoc.available : true),
          yacht_type: (sourceDoc.yacht_type as string) || "",
          features: Array.isArray(sourceDoc.tags) 
            ? sourceDoc.tags 
            : (Array.isArray(sourceDoc.features) ? sourceDoc.features : []),
          max_guests: (sourceDoc.capacity as number) || (sourceDoc.max_guests as number) || 10,
          price: (sourceDoc.pricing as number) || (sourceDoc.price as number) || 0
        };
        
        // Write to new collection
        await setDoc(doc(db, "yachts", normalizedYacht.id), normalizedYacht);
        console.log(`Migrated document '${normalizedYacht.id}' to yachts collection`);
        migratedCount++;
      } catch (error) {
        console.error(`Error migrating document: ${sourceDoc.id}`, error);
        errorCount++;
      }
    }
    
    console.log(`\nMigration summary:
- Total documents processed: ${combinedData.length}
- Successfully migrated: ${migratedCount}
- Failed migrations: ${errorCount}
- Duplicates skipped: ${duplicatesSkipped}
`);
    
    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Execute the migration
migrateToUnifiedCollection().catch(console.error);