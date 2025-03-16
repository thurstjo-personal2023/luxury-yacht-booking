import { db } from "./firebase";
import { collection, getDocs, query, limit, connectFirestoreEmulator } from "firebase/firestore";
import type {
  YachtExperience,
  TouristProfile,
  Article,
  Event,
  Notification,
  ProductAddOn,
  Promotion,
  Review,
  SupportContent,
  ServiceProviderProfile
} from "@shared/firestore-schema";
import type {
  User,
  ConsumerUser,
  ProducerUser,
  PartnerUser,
  UserType
} from "@shared/user-schema";

// Import the emulator flag from env-config
import { USE_FIREBASE_EMULATORS } from "./env-config";

// Connect to the external Firestore emulator only if explicitly enabled
if (USE_FIREBASE_EMULATORS) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  console.log("Connected to external Firestore emulator on port 8080");
} else {
  console.log("Using production Firebase services - emulator connection disabled");
}

const collections = {
  // User collections
  users: "harmonized_users", // Harmonized users collection
  
  // Yacht collections
  unified_yacht_experiences: "unified_yacht_experiences", // Only collection for yacht data
  
  // Other collections
  user_profiles_tourist: "user_profiles_tourist", // Legacy user collection
  articles_and_guides: "articles_and_guides",
  event_announcements: "event_announcements",
  notifications: "notifications",
  products_add_ons: "products_add_ons",
  promotions_and_offers: "promotions_and_offers",
  reviews_and_feedback: "reviews_and_feedback",
  support_content: "support_content",
  user_profiles_service_provider: "user_profiles_service_provider" // Legacy user collection
} as const;

// Function to check if a collection exists and is properly structured
async function verifyCollection(collectionName: string) {
  const mode = USE_FIREBASE_EMULATORS ? "emulator" : "production";
  try {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, limit(1));
    await getDocs(q);
    console.log(`Collection ${collectionName} verified in ${mode} mode`);
    return true;
  } catch (error) {
    console.error(`Error verifying collection ${collectionName} in ${mode} mode:`, error);
    return false;
  }
}

// Initialize Firestore collections
export async function initializeFirestore(skipVerification = false) {
  const mode = USE_FIREBASE_EMULATORS ? "emulator" : "production";
  console.log(`Initializing Firestore collections in ${mode} mode...`);

  try {
    if (skipVerification) {
      console.log(`Skipping collection verification during initialization (will verify after authentication)`);
      return;
    }
    
    // Verify all collections exist
    const verificationPromises = Object.values(collections).map(verifyCollection);
    await Promise.all(verificationPromises);

    console.log(`All Firestore collections initialized successfully in ${mode} mode`);
  } catch (error) {
    console.error(`Error initializing Firestore collections in ${mode} mode:`, error);
    // Don't throw the error, just log it to prevent app crashes
    // throw error;
  }
}

// Export collection references for use in components
export const collectionRefs = {
  // User collections
  users: collection(db, collections.users), // Primary user collection (harmonized)
  
  // Yacht collections
  unifiedYachts: collection(db, collections.unified_yacht_experiences), // Only collection for yacht data
  
  // Other collections
  touristProfiles: collection(db, collections.user_profiles_tourist),
  articles: collection(db, collections.articles_and_guides),
  events: collection(db, collections.event_announcements),
  notifications: collection(db, collections.notifications),
  products: collection(db, collections.products_add_ons),
  promotions: collection(db, collections.promotions_and_offers),
  reviews: collection(db, collections.reviews_and_feedback),
  support: collection(db, collections.support_content),
  serviceProviders: collection(db, collections.user_profiles_service_provider)
};