/**
 * User Harmonization Utilities
 * 
 * This file provides utilities for synchronizing data between the harmonized_users collection
 * and the role-specific profile collections (user_profiles_tourist and user_profiles_service_provider).
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import { 
  HarmonizedUser, 
  TouristProfile, 
  ServiceProviderProfile,
  ServerTimestamp,
  normalizeConsumerProfile,
  normalizeServiceProviderProfile
} from '../shared/harmonized-user-schema';

/**
 * Sync a user's core data with their role-specific profile
 * This ensures consistency between harmonized_users and role-specific collections
 * 
 * @param userId The user ID to synchronize
 * @returns Promise that resolves when sync is complete
 */
export async function syncUserData(userId: string): Promise<void> {
  try {
    // Get the user document from harmonized_users
    const userRef = adminDb.collection('harmonized_users').doc(userId);
    const userSnapshot = await userRef.get();
    
    if (!userSnapshot.exists) {
      console.error(`Cannot sync user data: User ${userId} not found in harmonized_users`);
      return;
    }
    
    const userData = userSnapshot.data() as HarmonizedUser;
    
    // Sync based on user role
    if (userData.role === 'consumer') {
      await syncConsumerProfile(userId, userData);
    } else if (userData.role === 'producer' || userData.role === 'partner') {
      await syncProducerProfile(userId, userData);
    }
    
    // Mark as synchronized in harmonized_users
    await userRef.update({
      _standardized: true,
      _standardizedVersion: 1,
      updatedAt: FieldValue.serverTimestamp() as ServerTimestamp
    });
    
    console.log(`Successfully synchronized user data for ${userId}`);
  } catch (error) {
    console.error('Error synchronizing user data:', error);
    throw error;
  }
}

/**
 * Sync consumer-specific profile data
 */
async function syncConsumerProfile(userId: string, userData: HarmonizedUser): Promise<void> {
  const touristProfileRef = adminDb.collection('user_profiles_tourist').doc(userId);
  const profileSnapshot = await touristProfileRef.get();
  
  // If profile exists, update it with core data
  if (profileSnapshot.exists) {
    const profileData = profileSnapshot.data() as TouristProfile;
    
    await touristProfileRef.update({
      id: userId, // Ensure ID matches
      lastUpdated: FieldValue.serverTimestamp() as ServerTimestamp
    });
    
    console.log(`Updated existing tourist profile for ${userId}`);
  } else {
    // Create new profile if it doesn't exist
    await touristProfileRef.set({
      id: userId,
      profilePhoto: '',
      loyaltyTier: 'Bronze',
      preferences: [],
      wishlist: [],
      bookingHistory: [],
      reviewsProvided: [],
      lastUpdated: FieldValue.serverTimestamp() as ServerTimestamp
    });
    
    console.log(`Created new tourist profile for ${userId}`);
  }
}

/**
 * Sync producer/partner-specific profile data
 */
async function syncProducerProfile(userId: string, userData: HarmonizedUser): Promise<void> {
  const providerProfileRef = adminDb.collection('user_profiles_service_provider').doc(userId);
  const profileSnapshot = await providerProfileRef.get();
  
  // If profile exists, update it with core data
  if (profileSnapshot.exists) {
    const profileData = profileSnapshot.data() as ServiceProviderProfile;
    
    await providerProfileRef.update({
      providerId: userId, // Ensure ID matches
      lastUpdated: FieldValue.serverTimestamp() as ServerTimestamp
    });
    
    console.log(`Updated existing service provider profile for ${userId}`);
  } else {
    // Create new profile if it doesn't exist
    await providerProfileRef.set({
      providerId: userId,
      businessName: userData.name || '',
      contactInformation: {
        address: ''
      },
      servicesOffered: [],
      profilePhoto: '',
      ratings: 0,
      lastUpdated: FieldValue.serverTimestamp() as ServerTimestamp
    });
    
    console.log(`Created new service provider profile for ${userId}`);
  }
}

/**
 * Create or update a user in the harmonized structure
 * This handles both the core user data and role-specific profile
 * 
 * @param userData The harmonized user data
 * @param profileData Optional role-specific profile data
 * @returns Promise with the user ID
 */
export async function createOrUpdateHarmonizedUser(
  userData: HarmonizedUser,
  profileData?: TouristProfile | ServiceProviderProfile
): Promise<string> {
  try {
    const userId = userData.id;
    
    // Ensure required fields
    userData.userId = userId; // Ensure userId is always set
    
    // Set timestamps if creating new user
    if (!userData.createdAt) {
      userData.createdAt = FieldValue.serverTimestamp() as ServerTimestamp;
    }
    
    // Always update the updatedAt timestamp
    userData.updatedAt = FieldValue.serverTimestamp() as ServerTimestamp;
    
    // Set standardization flags
    userData._standardized = true;
    userData._standardizedVersion = 1;
    
    // Update or create the core user document
    const userRef = adminDb.collection('harmonized_users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      // Update existing user
      await userRef.update(userData);
    } else {
      // Create new user
      await userRef.set(userData);
    }
    
    // Handle role-specific profile if provided
    if (profileData) {
      if (userData.role === 'consumer' && 'id' in profileData) {
        const touristProfile = profileData as TouristProfile;
        const touristProfileRef = adminDb.collection('user_profiles_tourist').doc(userId);
        
        // Ensure ID matches
        touristProfile.id = userId;
        touristProfile.lastUpdated = FieldValue.serverTimestamp() as ServerTimestamp;
        
        if ((await touristProfileRef.get()).exists) {
          await touristProfileRef.update(touristProfile);
        } else {
          await touristProfileRef.set(touristProfile);
        }
      } else if ((userData.role === 'producer' || userData.role === 'partner') && 'providerId' in profileData) {
        const providerProfile = profileData as ServiceProviderProfile;
        const providerProfileRef = adminDb.collection('user_profiles_service_provider').doc(userId);
        
        // Ensure providerId matches
        providerProfile.providerId = userId;
        providerProfile.lastUpdated = FieldValue.serverTimestamp() as ServerTimestamp;
        
        if ((await providerProfileRef.get()).exists) {
          await providerProfileRef.update(providerProfile);
        } else {
          await providerProfileRef.set(providerProfile);
        }
      }
    } else {
      // If profile not provided, sync to ensure consistency
      await syncUserData(userId);
    }
    
    return userId;
  } catch (error) {
    console.error('Error creating or updating harmonized user:', error);
    throw error;
  }
}

/**
 * Get a complete user profile with data from both core and role-specific collections
 * 
 * @param userId The user ID to retrieve
 * @returns Promise with the complete user profile or null if not found
 */
export async function getCompleteUserProfile(userId: string): Promise<{
  core: HarmonizedUser;
  profile: TouristProfile | ServiceProviderProfile | null;
} | null> {
  try {
    // Get core user data
    const userRef = adminDb.collection('harmonized_users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    const userData = userDoc.data() as HarmonizedUser;
    let profileData: TouristProfile | ServiceProviderProfile | null = null;
    
    // Get role-specific profile
    if (userData.role === 'consumer') {
      const touristRef = adminDb.collection('user_profiles_tourist').doc(userId);
      const touristDoc = await touristRef.get();
      
      if (touristDoc.exists) {
        profileData = touristDoc.data() as TouristProfile;
      }
    } else if (userData.role === 'producer' || userData.role === 'partner') {
      const providerRef = adminDb.collection('user_profiles_service_provider').doc(userId);
      const providerDoc = await providerRef.get();
      
      if (providerDoc.exists) {
        profileData = providerDoc.data() as ServiceProviderProfile;
      }
    }
    
    return {
      core: userData,
      profile: profileData
    };
  } catch (error) {
    console.error('Error retrieving complete user profile:', error);
    throw error;
  }
}

/**
 * Migrate a user from legacy format to harmonized structure
 * 
 * @param legacyUser The legacy user data
 * @returns Promise with the user ID
 */
export async function migrateLegacyUser(legacyUser: any): Promise<string> {
  try {
    // Extract core user data
    const userId = legacyUser.id || legacyUser.userId || legacyUser.uid;
    
    if (!userId) {
      throw new Error('Legacy user data missing ID field');
    }
    
    // Determine user role
    let role: 'consumer' | 'producer' | 'partner' = 'consumer';
    
    if (legacyUser.role) {
      if (typeof legacyUser.role === 'string') {
        role = legacyUser.role as any;
      } else if (legacyUser.role.toLowerCase) {
        role = legacyUser.role.toLowerCase() as any;
      }
    } else if (legacyUser.isProducer || legacyUser.isServiceProvider) {
      role = 'producer';
    } else if (legacyUser.isPartner) {
      role = 'partner';
    }
    
    // Create harmonized user
    const harmonizedUser: HarmonizedUser = {
      id: userId,
      userId: userId,
      name: legacyUser.name || legacyUser.displayName || '',
      email: legacyUser.email || '',
      phone: legacyUser.phoneNumber || legacyUser.phone || '',
      role: role,
      emailVerified: legacyUser.emailVerified || false,
      points: legacyUser.points || 0,
      createdAt: legacyUser.createdAt || legacyUser.createdDate || Timestamp.now(),
      updatedAt: FieldValue.serverTimestamp() as ServerTimestamp,
      _standardized: true,
      _standardizedVersion: 1
    };
    
    // Create appropriate profile
    let profileData: TouristProfile | ServiceProviderProfile | null = null;
    
    if (role === 'consumer') {
      profileData = normalizeConsumerProfile(legacyUser);
    } else {
      profileData = normalizeServiceProviderProfile(legacyUser);
    }
    
    // Save both documents
    return createOrUpdateHarmonizedUser(harmonizedUser, profileData);
  } catch (error) {
    console.error('Error migrating legacy user:', error);
    throw error;
  }
}

/**
 * Batch synchronize all users in the harmonized_users collection
 * 
 * @returns Promise with the count of users synchronized
 */
export async function batchSyncAllUsers(): Promise<number> {
  try {
    const usersSnapshot = await adminDb.collection('harmonized_users').get();
    let count = 0;
    
    for (const doc of usersSnapshot.docs) {
      await syncUserData(doc.id);
      count++;
    }
    
    console.log(`Batch synchronized ${count} users`);
    return count;
  } catch (error) {
    console.error('Error in batch user synchronization:', error);
    throw error;
  }
}