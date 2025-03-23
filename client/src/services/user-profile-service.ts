/**
 * User Profile Service
 * 
 * This service provides functions for managing user profiles,
 * including updating profile data and synchronizing with Firebase Auth.
 * 
 * Part of the clean architecture implementation, this service sits in the
 * interface adapters layer, connecting the application layer to the infrastructure.
 */

import { auth } from '@/lib/firebase';
import { updateUserCore, updateTouristProfile, updateServiceProviderProfile } from '@/lib/user-profile-utils';
import { UserRoleType } from '@shared/user-schema';

/**
 * Interface for user profile update parameters
 */
export interface UserProfileParams {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  businessName?: string;
  [key: string]: any; // Additional fields
}

/**
 * Update a user's profile information in Firestore
 * This handles updating both the core user data and role-specific profiles
 * 
 * @param profileParams User profile parameters to update
 * @returns Promise resolving to success status
 */
export async function updateUserProfile(profileParams: UserProfileParams): Promise<boolean> {
  try {
    console.log('Updating user profile with params:', profileParams);
    
    // First update core user information
    const coreUpdateSuccess = await updateUserCore({
      userId: profileParams.userId,
      name: `${profileParams.firstName} ${profileParams.lastName}`,
      phone: profileParams.phone,
      // Include additional core fields
      ...Object.entries(profileParams)
        .filter(([key]) => ['email', 'displayName', 'photoURL'].includes(key))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
    });
    
    if (!coreUpdateSuccess) {
      console.error('Failed to update core user information');
      return false;
    }
    
    // Then update role-specific profile
    let roleUpdateSuccess = false;
    
    switch (profileParams.role.toLowerCase()) {
      case 'consumer':
        roleUpdateSuccess = await updateTouristProfile({
          userId: profileParams.userId,
          firstName: profileParams.firstName,
          lastName: profileParams.lastName,
          phone: profileParams.phone,
          // Include any consumer-specific fields
          preferences: profileParams.preferences,
          favoriteLocations: profileParams.favoriteLocations,
          bookingHistory: profileParams.bookingHistory,
        });
        break;
        
      case 'producer':
      case 'partner':
        roleUpdateSuccess = await updateServiceProviderProfile({
          userId: profileParams.userId,
          firstName: profileParams.firstName,
          lastName: profileParams.lastName,
          phone: profileParams.phone,
          businessName: profileParams.businessName || `${profileParams.firstName} ${profileParams.lastName}'s Business`,
          // Include any provider-specific fields
          businessAddress: profileParams.businessAddress,
          businessDescription: profileParams.businessDescription,
          services: profileParams.services,
          licenseNumber: profileParams.licenseNumber,
        });
        break;
        
      default:
        console.error(`Unknown role: ${profileParams.role}`);
        return false;
    }
    
    if (!roleUpdateSuccess) {
      console.warn(`Failed to update ${profileParams.role} profile, but core data was updated`);
      // Return partial success since core data was updated
      return true;
    }
    
    console.log('Successfully updated user profile and role-specific data');
    return true;
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
}

/**
 * Get a user's complete profile information
 * This includes both core user data and role-specific profiles
 * 
 * @param userId User ID to get profile for
 * @returns Promise resolving to user profile data or null if not found
 */
export async function getUserCompleteProfile(userId: string): Promise<any | null> {
  try {
    // Call API endpoint to get complete user profile
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
    
    if (!token) {
      console.error('No authentication token available for profile retrieval');
      return null;
    }
    
    const response = await fetch(`/api/user/${userId}/complete-profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      console.error('Error fetching complete user profile:', response.status);
      return null;
    }
    
    const profileData = await response.json();
    return profileData;
  } catch (error) {
    console.error('Error getting complete user profile:', error);
    return null;
  }
}

/**
 * Verify a user's role and permissions
 * 
 * @param requiredRole Required role for access
 * @returns Promise resolving to boolean indicating if user has required role
 */
export async function verifyUserRole(requiredRole: UserRoleType): Promise<boolean> {
  try {
    if (!auth.currentUser) {
      console.error('No authenticated user for role verification');
      return false;
    }
    
    // Get fresh token with claims
    const tokenResult = await auth.currentUser.getIdTokenResult(true);
    const userRole = tokenResult.claims.role as string | undefined;
    
    // Convert both to lowercase for comparison
    const normalizedRequiredRole = requiredRole.toLowerCase();
    const normalizedUserRole = (userRole || '').toLowerCase();
    
    // Check exact match
    if (normalizedUserRole === normalizedRequiredRole) {
      return true;
    }
    
    // Special case: admin role has access to everything
    if (normalizedUserRole === 'admin') {
      return true;
    }
    
    console.warn(`Role verification failed: Required role ${requiredRole}, user has ${userRole || 'no role'}`);
    return false;
  } catch (error) {
    console.error('Error verifying user role:', error);
    return false;
  }
}