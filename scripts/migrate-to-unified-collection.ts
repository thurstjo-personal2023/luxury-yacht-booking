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
async function migrateToUnifiedCollection() {
  console.log('Starting migration to unified yachts collection...');
  
  try {
    // 1. Get all documents from yacht_experiences collection
    console.log('Fetching documents from yacht_experiences collection...');
    const yachtExperiencesSnapshot = await getDocs(collection(db, "yacht_experiences"));
    const yachtExperiences = yachtExperiencesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`Found ${yachtExperiences.length} documents in yacht_experiences collection`);
    
    // 2. Get all documents from experience_packages collection
    console.log('Fetching documents from experience_packages collection...');
    const experiencePackagesSnapshot = await getDocs(collection(db, "experience_packages"));
    const experiencePackages = experiencePackagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`Found ${experiencePackages.length} documents in experience_packages collection`);
    
    // 3. Combine and deduplicate based on ID
    const combinedData = [...yachtExperiences];
    let duplicatesSkipped = 0;
    
    experiencePackages.forEach(pkg => {
      if (!combinedData.find(y => 
        y.id === pkg.id || 
        y.package_id === pkg.id || 
        y.yachtId === pkg.id
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
    
    for (const doc of combinedData) {
      try {
        // Create normalized yacht record
        const normalizedYacht = {
          // Core fields with new naming convention
          id: doc.id || doc.package_id || doc.yachtId || '',
          title: doc.title || doc.name || "",
          description: doc.description || "",
          category: doc.category || "",
          yachtType: doc.yacht_type || "",
          
          location: {
            address: doc.location?.address || "",
            latitude: doc.location?.latitude || 0,
            longitude: doc.location?.longitude || 0,
            region: doc.location?.region || "dubai",
            portMarina: doc.location?.port_marina || ""
          },
          
          capacity: doc.capacity || doc.max_guests || 10,
          duration: doc.duration || 4,
          pricing: doc.pricing || doc.price || 0,
          pricingModel: doc.pricing_model || "Fixed",
          
          customizationOptions: (doc.customization_options || []).map(option => ({
            id: option.product_id || `option-${Date.now()}`,
            name: option.name,
            price: option.price
          })),
          
          media: doc.media || [],
          
          isAvailable: doc.availability_status !== undefined ? !!doc.availability_status : 
                      (doc.available !== undefined ? !!doc.available : true),
          isFeatured: !!doc.featured,
          isPublished: doc.published_status !== undefined ? !!doc.published_status : true,
          
          tags: doc.tags || doc.features || [],
          
          virtualTour: doc.virtual_tour ? {
            isEnabled: !!doc.virtual_tour.enabled,
            scenes: (doc.virtual_tour.scenes || []).map(scene => ({
              id: scene.id,
              title: scene.title,
              imageUrl: scene.imageUrl,
              thumbnailUrl: scene.thumbnailUrl,
              hotspots: scene.hotspots,
              initialViewParameters: scene.initialViewParameters
            }))
          } : {
            isEnabled: false,
            scenes: []
          },
          
          createdAt: doc.created_date || doc.createdAt || Timestamp.now(),
          updatedAt: doc.last_updated_date || doc.updatedAt || Timestamp.now(),
          
          // Legacy fields for backward compatibility
          package_id: doc.id || doc.package_id || doc.yachtId || '',
          yachtId: doc.id || doc.package_id || doc.yachtId || '',
          name: doc.title || doc.name || "",
          availability_status: doc.availability_status !== undefined ? !!doc.availability_status : 
                              (doc.available !== undefined ? !!doc.available : true),
          available: doc.availability_status !== undefined ? !!doc.availability_status : 
                    (doc.available !== undefined ? !!doc.available : true),
          yacht_type: doc.yacht_type || "",
          features: doc.tags || doc.features || [],
          max_guests: doc.capacity || doc.max_guests || 10,
          price: doc.pricing || doc.price || 0
        };
        
        // Write to new collection
        await setDoc(doc(db, "yachts", normalizedYacht.id), normalizedYacht);
        console.log(`Migrated document '${normalizedYacht.id}' to yachts collection`);
        migratedCount++;
      } catch (error) {
        console.error(`Error migrating document: ${doc.id}`, error);
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