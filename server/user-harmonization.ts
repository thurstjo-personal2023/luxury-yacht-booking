/**
 * User Harmonization Utilities
 * 
 * This file provides utilities for synchronizing data between the harmonized_users collection
 * and the role-specific profile collections (user_profiles_tourist and user_profiles_service_provider).
 */

import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { 
  HarmonizedUser, 
  TouristProfile, 
  ServiceProviderProfile,
  ServerTimestamp
} from '@shared/harmonized-user-schema';

/**
 * Sync a user's core data with their role-specific profile
 * This ensures consistency between harmonized_users and role-specific collections
 * 
 * @param userId The user ID to synchronize
 * @returns Promise that resolves when sync is complete
 */
export async function syncUserData(userId: string): Promise<void> {
  try {
    const userDoc = await adminDb.collection('harmonized_users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.error(`Cannot sync user data: User ${userId} not found in harmonized_users`);
      return;
    }
    
    const userData = userDoc.data() as HarmonizedUser;
    
    // Sync based on user role
    if (userData.role === 'consumer') {
      await syncConsumerProfile(userId, userData);
    } else if (userData.role === 'producer' || userData.role === 'partner') {
      await syncProducerProfile(userId, userData);
    }
  } catch (error) {
    console.error('Error syncing user data:', error);
    throw error;
  }
}

/**
 * Sync consumer-specific profile data
 */
async function syncConsumerProfile(userId: string, userData: HarmonizedUser): Promise<void> {
  try {
    const touristDoc = await adminDb.collection('user_profiles_tourist').doc(userId).get();
    
    if (!touristDoc.exists) {
      // Create profile if it doesn't exist
      await adminDb.collection('user_profiles_tourist').doc(userId).set({
        id: userId,
        lastUpdated: FieldValue.serverTimestamp(),
        preferences: [],
        wishlist: [],
        bookingHistory: []
      });
    }
  } catch (error) {
    console.error('Error syncing consumer profile:', error);
    throw error;
  }
}

/**
 * Sync producer/partner-specific profile data
 */
async function syncProducerProfile(userId: string, userData: HarmonizedUser): Promise<void> {
  try {
    const providerDoc = await adminDb.collection('user_profiles_service_provider').doc(userId).get();
    
    if (!providerDoc.exists) {
      // Create profile if it doesn't exist
      await adminDb.collection('user_profiles_service_provider').doc(userId).set({
        providerId: userId,
        businessName: userData.name,
        contactInformation: {
          address: ''
        },
        servicesOffered: [],
        lastUpdated: FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error syncing producer profile:', error);
    throw error;
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
  profileData?: {
    touristProfile?: TouristProfile;
    serviceProviderProfile?: ServiceProviderProfile;
  }
): Promise<string> {
  try {
    const userId = userData.id;
    
    // Create/update core user data in harmonized_users
    await adminDb.collection('harmonized_users').doc(userId).set(userData, { merge: true });
    
    // Create/update role-specific profile
    if (userData.role === 'consumer' && profileData?.touristProfile) {
      await adminDb.collection('user_profiles_tourist').doc(userId).set(
        {
          ...profileData.touristProfile,
          id: userId, // Ensure ID is set correctly
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, 
        { merge: true }
      );
    } else if ((userData.role === 'producer' || userData.role === 'partner') && profileData?.serviceProviderProfile) {
      await adminDb.collection('user_profiles_service_provider').doc(userId).set(
        {
          ...profileData.serviceProviderProfile,
          providerId: userId, // Ensure provider ID is set correctly
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, 
        { merge: true }
      );
    }
    
    return userId;
  } catch (error) {
    console.error('Error creating/updating harmonized user:', error);
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
  touristProfile?: TouristProfile;
  serviceProviderProfile?: ServiceProviderProfile;
} | null> {
  try {
    // Get core user data
    const userDoc = await adminDb.collection('harmonized_users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.error(`User ${userId} not found in harmonized_users`);
      return null;
    }
    
    const userData = userDoc.data() as HarmonizedUser;
    const result: {
      core: HarmonizedUser;
      touristProfile?: TouristProfile;
      serviceProviderProfile?: ServiceProviderProfile;
    } = {
      core: userData
    };
    
    // Get role-specific profile data
    if (userData.role === 'consumer') {
      const touristDoc = await adminDb.collection('user_profiles_tourist').doc(userId).get();
      
      if (touristDoc.exists) {
        result.touristProfile = touristDoc.data() as TouristProfile;
      }
    } else if (userData.role === 'producer' || userData.role === 'partner') {
      const providerDoc = await adminDb.collection('user_profiles_service_provider').doc(userId).get();
      
      if (providerDoc.exists) {
        result.serviceProviderProfile = providerDoc.data() as ServiceProviderProfile;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error getting complete user profile:', error);
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
    if (!legacyUser.id) {
      throw new Error('Legacy user data must have an ID');
    }
    
    // Extract core user data
    const harmonizedUser: HarmonizedUser = {
      id: legacyUser.id,
      userId: legacyUser.id,
      name: legacyUser.name || '',
      email: legacyUser.email || '',
      phone: legacyUser.phone || '',
      role: legacyUser.role || 'consumer',
      emailVerified: legacyUser.emailVerified || false,
      points: legacyUser.points || 0,
      createdAt: legacyUser.createdAt || admin.firestore.FieldValue.serverTimestamp() as ServerTimestamp,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() as ServerTimestamp,
      _standardized: true,
      _standardizedVersion: 1
    };
    
    // Create role-specific profile
    if (harmonizedUser.role === 'consumer') {
      // Extract tourist profile data
      const touristProfile: TouristProfile = {
        id: legacyUser.id,
        profilePhoto: legacyUser.profilePhoto || '',
        preferences: legacyUser.preferences || [],
        wishlist: legacyUser.wishlist || [],
        bookingHistory: legacyUser.bookingHistory || [],
        lastUpdated: admin.firestore.FieldValue.serverTimestamp() as ServerTimestamp
      };
      
      await createOrUpdateHarmonizedUser(harmonizedUser, { touristProfile });
    } else {
      // Extract service provider profile data
      const serviceProviderProfile: ServiceProviderProfile = {
        providerId: legacyUser.id,
        businessName: legacyUser.businessName || legacyUser.name || '',
        contactInformation: {
          address: legacyUser.address || '',
        },
        servicesOffered: legacyUser.servicesOffered || [],
        certifications: legacyUser.certifications || [],
        lastUpdated: admin.firestore.FieldValue.serverTimestamp() as ServerTimestamp
      };
      
      await createOrUpdateHarmonizedUser(harmonizedUser, { serviceProviderProfile });
    }
    
    return legacyUser.id;
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
    const snapshot = await adminDb.collection('harmonized_users').get();
    let count = 0;
    
    for (const doc of snapshot.docs) {
      const userData = doc.data() as HarmonizedUser;
      await syncUserData(userData.id);
      count++;
    }
    
    console.log(`Successfully synchronized ${count} users`);
    return count;
  } catch (error) {
    console.error('Error batch synchronizing users:', error);
    throw error;
  }
}