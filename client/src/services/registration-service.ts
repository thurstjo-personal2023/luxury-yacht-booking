/**
 * Registration Service
 * 
 * This service handles user registration with clean separation of concerns
 * following clean architecture principles.
 */

import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  updateProfile,
  UserCredential 
} from 'firebase/auth';
import { UserRoleType } from '@shared/user-schema';
import { redirectToDashboard } from './navigation';

// Registration options interface
export interface RegistrationOptions {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role: UserRoleType;
  businessName?: string;
}

// Registration result interface
export interface RegistrationResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRoleType;
    token: string;
  };
  error?: Error;
  message?: string;
}

// Profile update result interface
export interface ProfileUpdateResult {
  success: boolean;
  error?: Error;
  message?: string;
}

/**
 * Registers a new user with Firebase Auth and creates their profile
 * 
 * @param options Registration options
 * @returns Promise resolving to registration result
 */
export async function registerUser(options: RegistrationOptions): Promise<RegistrationResult> {
  const auth = getAuth();
  
  try {
    console.log('Registration service: Starting user registration process');
    
    const fullName = `${options.firstName} ${options.lastName}`;
    
    // Step 1: Create the user in Firebase Auth
    console.log('Registration service: Creating user in Firebase Auth');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      options.email,
      options.password
    );
    
    const user = userCredential.user;
    console.log(`Registration service: User created successfully with ID ${user.uid}`);
    
    // Step 2: Update the user's display name
    await updateProfile(user, { displayName: fullName });
    console.log('Registration service: User profile display name updated');
    
    // Step 3: Get a fresh auth token for API requests
    const token = await user.getIdToken(true);
    localStorage.setItem('authToken', token);
    console.log('Registration service: Fresh auth token obtained and stored');
    
    // Step 4: Create the user profile in Firestore via the API
    console.log('Registration service: Creating user profile in Firestore via API');
    
    // Create the base profile first
    const createProfileResult = await createBaseProfile(token, {
      name: fullName,
      email: options.email,
      role: options.role,
      phone: options.phone
    });
    
    if (!createProfileResult.success) {
      throw new Error(createProfileResult.message || 'Failed to create user profile');
    }
    
    console.log('Registration service: User profile created successfully in Firestore');
    
    // Return successful result
    return {
      success: true,
      user: {
        id: user.uid,
        email: options.email,
        name: fullName,
        role: options.role,
        token
      },
      message: 'User registered successfully'
    };
  } catch (error) {
    console.error('Registration service: Registration error', error);
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Creates the base user profile in Firestore
 * 
 * @param token Authentication token
 * @param profile Profile data
 * @returns Promise resolving to profile creation result
 */
async function createBaseProfile(
  token: string, 
  profile: { 
    name: string; 
    email: string; 
    role: UserRoleType; 
    phone: string;
  }
): Promise<ProfileUpdateResult> {
  try {
    console.log('Registration service: Creating base profile');
    
    const createProfileResponse = await fetch('/api/user/create-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profile)
    });
    
    if (!createProfileResponse.ok) {
      throw new Error(`Failed to create user profile: ${createProfileResponse.status} ${createProfileResponse.statusText}`);
    }
    
    return {
      success: true,
      message: 'Profile created successfully'
    };
  } catch (error) {
    console.error('Registration service: Error creating base profile', error);
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Updates the role-specific profile details
 * 
 * @param token Authentication token
 * @param options Registration options
 * @returns Promise resolving to profile update result
 */
export async function updateRoleSpecificProfile(
  token: string,
  options: RegistrationOptions
): Promise<ProfileUpdateResult> {
  try {
    console.log(`Registration service: Updating role-specific profile for ${options.role}`);
    
    const updateEndpoint = options.role === 'consumer'
      ? '/api/user/update-tourist-profile'
      : '/api/user/update-provider-profile';
    
    // Prepare the profile data based on role
    const profileData = options.role === 'consumer'
      ? {
          preferences: {
            yachtTypes: [],
            locations: [],
            activities: []
          },
          pointsHistory: []
        }
      : {
          businessName: options.businessName || `${options.firstName} ${options.lastName}'s Business`,
          businessAddress: '',
          businessDescription: '',
          businessLogo: '',
          services: []
        };
    
    const updateResponse = await fetch(updateEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update role-specific profile: ${updateResponse.status} ${updateResponse.statusText}`);
    }
    
    return {
      success: true,
      message: 'Role-specific profile updated successfully'
    };
  } catch (error) {
    console.error('Registration service: Error updating role-specific profile', error);
    
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Redirects the user to their appropriate dashboard based on role
 * 
 * @param role User role
 * @returns Promise resolving to redirect success
 */
export async function redirectAfterRegistration(role: UserRoleType): Promise<boolean> {
  try {
    console.log(`Registration service: Redirecting new user based on role ${role}`);
    
    // Use the updated navigation service that uses wouter's navigate
    // instead of window.location to prevent full page reloads
    const redirectResult = await redirectToDashboard(role);
    
    return redirectResult.success;
  } catch (error) {
    console.error('Registration service: Error redirecting user', error);
    return false;
  }
}