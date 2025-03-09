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

// Connect to the external Firestore emulator
if (process.env.NODE_ENV === "development") {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  console.log("Connected to external Firestore emulator on port 8080");
}

const collections = {
  unified_yacht_experiences: "unified_yacht_experiences", // New unified collection
  yacht_experiences: "yacht_experiences",  // Legacy collection (for backward compatibility)
  user_profiles_tourist: "user_profiles_tourist",
  articles_and_guides: "articles_and_guides",
  event_announcements: "event_announcements",
  notifications: "notifications",
  products_add_ons: "products_add_ons",
  promotions_and_offers: "promotions_and_offers",
  reviews_and_feedback: "reviews_and_feedback",
  support_content: "support_content",
  user_profiles_service_provider: "user_profiles_service_provider"
} as const;

// Function to check if a collection exists and is properly structured
async function verifyCollection(collectionName: string) {
  try {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, limit(1));
    await getDocs(q);
    console.log(`Collection ${collectionName} verified in emulator`);
    return true;
  } catch (error) {
    console.error(`Error verifying collection ${collectionName} in emulator:`, error);
    return false;
  }
}

// Initialize Firestore collections
export async function initializeFirestore() {
  console.log("Initializing Firestore collections in emulator...");

  try {
    // Verify all collections exist in the emulator
    const verificationPromises = Object.values(collections).map(verifyCollection);
    await Promise.all(verificationPromises);

    console.log("All Firestore collections initialized successfully in emulator");
  } catch (error) {
    console.error("Error initializing Firestore collections in emulator:", error);
    throw error;
  }
}

// Export collection references for use in components
export const collectionRefs = {
  // Yacht collections
  unifiedYachts: collection(db, collections.unified_yacht_experiences), // Primary collection to use
  yachtExperiences: collection(db, collections.yacht_experiences),      // Legacy collection
  
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