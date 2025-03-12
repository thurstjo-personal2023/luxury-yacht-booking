/**
 * Harmonize User Profiles
 * 
 * This script synchronizes the data between the three user-related collections:
 * - harmonized_users: Core user data
 * - user_profiles_tourist: Consumer-specific profile data
 * - user_profiles_service_provider: Producer/partner-specific profile data
 * 
 * It ensures no duplication of fields between collections and maintains proper references.
 */

const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  connectFirestoreEmulator
} = require("firebase/firestore");

const firebaseConfig = {
  projectId: "etoile-yachts",
  // Other config options not needed when using emulators
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to Firestore emulator
connectFirestoreEmulator(db, "127.0.0.1", 8080);

/**
 * Convert a timestamp value from any format to Firestore Timestamp
 */
function normalizeTimestamp(timestamp) {
  if (!timestamp) return Timestamp.now();
  
  if (timestamp instanceof Timestamp) {
    return timestamp;
  }
  
  if (timestamp._seconds && timestamp._nanoseconds) {
    return new Timestamp(timestamp._seconds, timestamp._nanoseconds);
  }
  
  if (typeof timestamp === 'string') {
    return Timestamp.fromDate(new Date(timestamp));
  }
  
  if (timestamp instanceof Date) {
    return Timestamp.fromDate(timestamp);
  }
  
  return Timestamp.now();
}

/**
 * Ensure array format for fields that might be objects with numeric keys
 */
function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  
  // Convert object with numeric keys to array
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.values(value);
  }
  
  return [value]; // Wrap single values in array
}

/**
 * Extract core user data that belongs in harmonized_users
 */
function extractCoreUserData(userData) {
  return {
    id: userData.id,
    userId: userData.id, // Ensure consistency
    name: userData.name || '',
    email: userData.email || '',
    phone: userData.phone_number || userData.phone || '',
    role: userData.role || 'consumer', // Default to consumer if not specified
    emailVerified: !!userData.emailVerified, // Default to false
    points: userData.points || 0,
    createdAt: normalizeTimestamp(userData.created_date || userData.createdAt),
    updatedAt: normalizeTimestamp(userData.last_updated_date || userData.updatedAt || userData.created_date || userData.createdAt),
    _standardized: true,
    _standardizedVersion: 1
  };
}

/**
 * Extract tourist profile data
 */
function extractTouristProfileData(userData) {
  return {
    id: userData.id || userData.user_id,
    profilePhoto: userData.profile_photo || userData.profilePhoto || '',
    loyaltyTier: userData.loyalty_tier || userData.loyaltyTier || 'Bronze',
    preferences: ensureArray(userData.preferences),
    wishlist: ensureArray(userData.wishlist),
    bookingHistory: ensureArray(userData.booking_history || userData.bookingHistory),
    reviewsProvided: ensureArray(userData.reviews_provided || userData.reviewsProvided),
    lastUpdated: normalizeTimestamp(userData.last_updated_date || userData.updatedAt || userData.created_date || userData.createdAt)
  };
}

/**
 * Extract service provider profile data
 */
function extractServiceProviderProfileData(userData) {
  return {
    providerId: userData.id || userData.provider_id || userData.providerId,
    businessName: userData.business_name || userData.businessName || '',
    contactInformation: {
      address: (userData.contact_information && userData.contact_information.address) || 
               (userData.contactInformation && userData.contactInformation.address) || ''
    },
    profilePhoto: userData.profile_photo || userData.profilePhoto || '',
    servicesOffered: ensureArray(userData.services_offered || userData.servicesOffered),
    certifications: ensureArray(userData.certifications),
    ratings: typeof userData.ratings === 'number' ? userData.ratings : 0,
    tags: ensureArray(userData.tags),
    lastUpdated: normalizeTimestamp(userData.last_updated_date || userData.updatedAt || userData.created_date || userData.createdAt)
  };
}

/**
 * Harmonize all user profiles
 */
async function harmonizeUserProfiles() {
  try {
    console.log('Starting user profile harmonization...');
    
    // Get all users from all collections
    const harmonizedUsersSnapshot = await getDocs(collection(db, 'harmonized_users'));
    const touristProfilesSnapshot = await getDocs(collection(db, 'user_profiles_tourist'));
    const serviceProviderProfilesSnapshot = await getDocs(collection(db, 'user_profiles_service_provider'));
    
    console.log(`Found ${harmonizedUsersSnapshot.size} harmonized users`);
    console.log(`Found ${touristProfilesSnapshot.size} tourist profiles`);
    console.log(`Found ${serviceProviderProfilesSnapshot.size} service provider profiles`);
    
    // Process tourist profiles
    for (const profileDoc of touristProfilesSnapshot.docs) {
      const profileData = profileDoc.data();
      const userId = profileData.id || profileData.user_id;
      
      if (!userId) {
        console.warn(`Tourist profile ${profileDoc.id} doesn't have a valid user ID, skipping`);
        continue;
      }
      
      // Check if this user exists in harmonized_users
      const harmonizedUserRef = doc(db, 'harmonized_users', userId);
      const harmonizedUserDoc = await getDoc(harmonizedUserRef);
      
      if (harmonizedUserDoc.exists()) {
        // User exists, update tourist profile to remove duplicated fields
        const touristProfile = extractTouristProfileData(profileData);
        await setDoc(doc(db, 'user_profiles_tourist', userId), touristProfile);
        console.log(`Updated tourist profile for user ${userId}`);
      } else {
        // User doesn't exist in harmonized_users, create both
        const coreUserData = extractCoreUserData({
          ...profileData,
          role: 'consumer'
        });
        
        await setDoc(harmonizedUserRef, coreUserData);
        
        const touristProfile = extractTouristProfileData(profileData);
        await setDoc(doc(db, 'user_profiles_tourist', userId), touristProfile);
        
        console.log(`Created harmonized user and tourist profile for ${userId}`);
      }
    }
    
    // Process service provider profiles
    for (const profileDoc of serviceProviderProfilesSnapshot.docs) {
      const profileData = profileDoc.data();
      const providerId = profileData.id || profileData.provider_id || profileData.providerId;
      
      if (!providerId) {
        console.warn(`Service provider profile ${profileDoc.id} doesn't have a valid provider ID, skipping`);
        continue;
      }
      
      // Check if this provider exists in harmonized_users
      const harmonizedUserRef = doc(db, 'harmonized_users', providerId);
      const harmonizedUserDoc = await getDoc(harmonizedUserRef);
      
      if (harmonizedUserDoc.exists()) {
        // User exists, update service provider profile to remove duplicated fields
        const providerProfile = extractServiceProviderProfileData(profileData);
        await setDoc(doc(db, 'user_profiles_service_provider', providerId), providerProfile);
        console.log(`Updated service provider profile for user ${providerId}`);
      } else {
        // User doesn't exist in harmonized_users, create both
        const coreUserData = extractCoreUserData({
          ...profileData,
          id: providerId,
          role: profileData.role || 'producer' // Default to producer if not specified
        });
        
        await setDoc(harmonizedUserRef, coreUserData);
        
        const providerProfile = extractServiceProviderProfileData(profileData);
        await setDoc(doc(db, 'user_profiles_service_provider', providerId), providerProfile);
        
        console.log(`Created harmonized user and service provider profile for ${providerId}`);
      }
    }
    
    // Process any harmonized users that don't have profiles
    for (const userDoc of harmonizedUsersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userData.id;
      
      if (userData.role === 'consumer') {
        // Check if there's a tourist profile
        const touristProfileRef = doc(db, 'user_profiles_tourist', userId);
        const touristProfileDoc = await getDoc(touristProfileRef);
        
        if (!touristProfileDoc.exists()) {
          // Create a blank tourist profile
          const touristProfile = {
            id: userId,
            profilePhoto: '',
            loyaltyTier: 'Bronze',
            preferences: [],
            wishlist: [],
            bookingHistory: [],
            reviewsProvided: [],
            lastUpdated: normalizeTimestamp(userData.updatedAt || userData.createdAt)
          };
          
          await setDoc(touristProfileRef, touristProfile);
          console.log(`Created missing tourist profile for user ${userId}`);
        }
      } else if (userData.role === 'producer' || userData.role === 'partner') {
        // Check if there's a service provider profile
        const providerProfileRef = doc(db, 'user_profiles_service_provider', userId);
        const providerProfileDoc = await getDoc(providerProfileRef);
        
        if (!providerProfileDoc.exists()) {
          // Create a blank service provider profile
          const providerProfile = {
            providerId: userId,
            businessName: userData.name || '',
            contactInformation: {
              address: ''
            },
            profilePhoto: '',
            servicesOffered: [],
            certifications: [],
            ratings: 0,
            tags: [],
            lastUpdated: normalizeTimestamp(userData.updatedAt || userData.createdAt)
          };
          
          await setDoc(providerProfileRef, providerProfile);
          console.log(`Created missing service provider profile for user ${userId}`);
        }
      }
    }
    
    console.log('User profile harmonization completed successfully');
    
  } catch (error) {
    console.error('Error harmonizing user profiles:', error);
  }
}

// Execute the harmonization
harmonizeUserProfiles().catch(console.error);