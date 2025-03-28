/**
 * User Profile Routes
 * 
 * API endpoints for managing user profiles across the harmonized structure
 */

import { Express, Request, Response } from 'express';
import { verifyAuth, adminDb, adminAuth } from './firebase-admin';
import { 
  syncUserData, 
  getCompleteUserProfile,
  createOrUpdateHarmonizedUser
} from './user-harmonization';
import { 
  HarmonizedUser, 
  TouristProfile, 
  ServiceProviderProfile,
  ServerTimestamp
} from '@shared/harmonized-user-schema';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Register user profile routes
 */
export function registerUserProfileRoutes(app: Express) {
  /**
   * Get the current user's profile information (harmonized + role-specific)
   */
  app.get('/api/user/profile', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const profileData = await getCompleteUserProfile(req.user.uid);
      
      if (!profileData || !profileData.core) {
        return res.status(404).json({ error: 'User profile not found' });
      }
      
      return res.json(profileData);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });
  
  /**
   * Update the current user's core information
   */
  app.post('/api/user/update-core', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Get only the allowed fields to update
      const { name, phone } = req.body;
      
      // Get current user data
      const userDoc = await adminDb.collection('harmonized_users').doc(req.user.uid).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Update user data
      const updates: Partial<HarmonizedUser> = {
        updatedAt: FieldValue.serverTimestamp() as ServerTimestamp
      };
      
      if (name) updates.name = name;
      if (phone) updates.phone = phone;
      
      await adminDb.collection('harmonized_users').doc(req.user.uid).update(updates);
      
      // Sync with role-specific collections
      await syncUserData(req.user.uid);
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Error updating user core data:', error);
      return res.status(500).json({ error: 'Failed to update user core data' });
    }
  });
  
  /**
   * Update the current user's tourist profile (for consumers)
   */
  app.post('/api/user/update-tourist-profile', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Check if user role is consumer
      const userDoc = await adminDb.collection('harmonized_users').doc(req.user.uid).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userDoc.data() as HarmonizedUser;
      
      if (userData.role !== 'consumer') {
        return res.status(403).json({ error: 'Only consumers can update tourist profiles' });
      }
      
      // Get the fields to update from request body
      const { profilePhoto, preferences, wishlist } = req.body;
      
      // Update tourist profile
      const updates: Partial<TouristProfile> = {
        lastUpdated: FieldValue.serverTimestamp() as ServerTimestamp
      };
      
      if (profilePhoto !== undefined) updates.profilePhoto = profilePhoto;
      if (preferences !== undefined) updates.preferences = preferences;
      if (wishlist !== undefined) updates.wishlist = wishlist;
      
      // Check if profile exists
      const profileDoc = await adminDb.collection('user_profiles_tourist').doc(req.user.uid).get();
      
      if (profileDoc.exists) {
        // Update existing profile
        await adminDb.collection('user_profiles_tourist').doc(req.user.uid).update(updates);
      } else {
        // Create new profile
        await adminDb.collection('user_profiles_tourist').doc(req.user.uid).set({
          id: req.user.uid,
          ...updates
        });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Error updating tourist profile:', error);
      return res.status(500).json({ error: 'Failed to update tourist profile' });
    }
  });
  
  /**
   * Enhanced update for the tourist profile with additional fields (for consumers)
   */
  app.post('/api/user/update-profile', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Check if user role is consumer
      const userDoc = await adminDb.collection('harmonized_users').doc(req.user.uid).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userDoc.data() as HarmonizedUser;
      
      if (userData.role !== 'consumer') {
        return res.status(403).json({ error: 'Only consumers can update tourist profiles' });
      }
      
      // Get all fields that can be updated from request body
      const { 
        name,
        phoneNumber,
        address,
        preferences,
        profilePhoto,
        wishlist,
        communicationPreferences,
        loyaltyTier,
        dietaryRestrictions,
        accessibilityNeeds,
        favoriteDestinations
      } = req.body;
      
      // Core user data updates (harmonized_users collection)
      const coreUpdates: Partial<HarmonizedUser> = {
        updatedAt: FieldValue.serverTimestamp() as ServerTimestamp
      };
      
      // Only update core fields in harmonized_users
      if (name) coreUpdates.name = name;
      if (phoneNumber) coreUpdates.phone = phoneNumber;
      
      // Update harmonized_users if there are core field changes
      if (Object.keys(coreUpdates).length > 1) { // More than just timestamp
        await adminDb.collection('harmonized_users').doc(req.user.uid).update(coreUpdates);
      }
      
      // Consumer-specific profile updates (user_profiles_tourist collection)
      const profileUpdates: Partial<TouristProfile> = {
        lastUpdated: FieldValue.serverTimestamp() as ServerTimestamp
      };
      
      // Only consumer-specific fields go in user_profiles_tourist
      if (preferences !== undefined) profileUpdates.preferences = preferences;
      if (profilePhoto !== undefined) profileUpdates.profilePhoto = profilePhoto;
      if (wishlist !== undefined) profileUpdates.wishlist = wishlist;
      if (address !== undefined) profileUpdates.address = address;
      if (communicationPreferences !== undefined) profileUpdates.communicationPreferences = communicationPreferences;
      if (loyaltyTier !== undefined) profileUpdates.loyaltyTier = loyaltyTier;
      if (dietaryRestrictions !== undefined) profileUpdates.dietaryRestrictions = dietaryRestrictions;
      if (accessibilityNeeds !== undefined) profileUpdates.accessibilityNeeds = accessibilityNeeds;
      if (favoriteDestinations !== undefined) profileUpdates.favoriteDestinations = favoriteDestinations;
      if (address !== undefined) profileUpdates.address = address;
      if (communicationPreferences !== undefined) profileUpdates.communicationPreferences = communicationPreferences;
      
      // Check if profile exists
      const profileDoc = await adminDb.collection('user_profiles_tourist').doc(req.user.uid).get();
      
      if (profileDoc.exists) {
        // Update existing profile
        await adminDb.collection('user_profiles_tourist').doc(req.user.uid).update(profileUpdates);
      } else {
        // Create new profile
        await adminDb.collection('user_profiles_tourist').doc(req.user.uid).set({
          id: req.user.uid,
          ...profileUpdates
        });
      }
      
      return res.json({ 
        success: true,
        message: "Profile updated successfully"
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      return res.status(500).json({ 
        error: 'Failed to update user profile',
        message: String(error)
      });
    }
  });
  
  /**
   * Update the current user's service provider profile (for producers/partners)
   */
  app.post('/api/user/update-provider-profile', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Check if user role is producer or partner
      const userDoc = await adminDb.collection('harmonized_users').doc(req.user.uid).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userDoc.data() as HarmonizedUser;
      
      if (userData.role !== 'producer' && userData.role !== 'partner') {
        return res.status(403).json({ error: 'Only producers/partners can update service provider profiles' });
      }
      
      // Get the fields to update
      const { 
        businessName,
        contactInformation,
        servicesOffered,
        certifications,
        profilePhoto,
        yearsOfExperience,
        industryAffiliations,
        professionalDescription,
        communicationPreferences,
        profileVisibility
      } = req.body;
      
      // Update service provider profile
      const updates: Partial<ServiceProviderProfile> = {
        lastUpdated: FieldValue.serverTimestamp() as ServerTimestamp
      };
      
      if (businessName !== undefined) updates.businessName = businessName;
      if (contactInformation !== undefined) updates.contactInformation = contactInformation;
      if (servicesOffered !== undefined) updates.servicesOffered = servicesOffered;
      if (certifications !== undefined) updates.certifications = certifications;
      if (profilePhoto !== undefined) updates.profilePhoto = profilePhoto;
      if (yearsOfExperience !== undefined) updates.yearsOfExperience = yearsOfExperience;
      if (industryAffiliations !== undefined) updates.industryAffiliations = industryAffiliations;
      if (professionalDescription !== undefined) updates.professionalDescription = professionalDescription;
      if (communicationPreferences !== undefined) updates.communicationPreferences = communicationPreferences;
      if (profileVisibility !== undefined) updates.profileVisibility = profileVisibility;
      
      // Check if profile exists
      const profileDoc = await adminDb.collection('user_profiles_service_provider').doc(req.user.uid).get();
      
      if (profileDoc.exists) {
        // Update existing profile
        await adminDb.collection('user_profiles_service_provider').doc(req.user.uid).update(updates);
      } else {
        // Create new profile
        await adminDb.collection('user_profiles_service_provider').doc(req.user.uid).set({
          providerId: req.user.uid,
          ...updates
        });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Error updating service provider profile:', error);
      return res.status(500).json({ error: 'Failed to update service provider profile' });
    }
  });
  
  /**
   * Manage wishlist for consumers
   */
  app.post('/api/user/wishlist', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Check if user role is consumer
      const userDoc = await adminDb.collection('harmonized_users').doc(req.user.uid).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userDoc.data() as HarmonizedUser;
      
      if (userData.role !== 'consumer') {
        return res.status(403).json({ error: 'Only consumers can manage wishlist' });
      }
      
      const { yachtId, action } = req.body;
      
      if (!yachtId || !action || (action !== 'add' && action !== 'remove')) {
        return res.status(400).json({ error: 'Invalid request. Provide yachtId and action (add/remove)' });
      }
      
      // Get current profile
      const profileDoc = await adminDb.collection('user_profiles_tourist').doc(req.user.uid).get();
      let profile: TouristProfile;
      
      if (profileDoc.exists) {
        profile = profileDoc.data() as TouristProfile;
      } else {
        profile = {
          id: req.user.uid,
          wishlist: [],
          lastUpdated: FieldValue.serverTimestamp() as ServerTimestamp
        };
      }
      
      // Update wishlist
      let wishlist = Array.isArray(profile.wishlist) ? [...profile.wishlist] : [];
      
      if (action === 'add' && !wishlist.includes(yachtId)) {
        wishlist.push(yachtId);
      } else if (action === 'remove') {
        wishlist = wishlist.filter(id => id !== yachtId);
      }
      
      // Update profile
      const updates: Partial<TouristProfile> = {
        wishlist,
        lastUpdated: FieldValue.serverTimestamp() as ServerTimestamp
      };
      
      if (profileDoc.exists) {
        await adminDb.collection('user_profiles_tourist').doc(req.user.uid).update(updates);
      } else {
        await adminDb.collection('user_profiles_tourist').doc(req.user.uid).set({
          id: req.user.uid,
          ...updates
        });
      }
      
      return res.json({ success: true, wishlist });
    } catch (error) {
      console.error('Error updating wishlist:', error);
      return res.status(500).json({ error: 'Failed to update wishlist' });
    }
  });
  
  /**
   * Get a user's complete profile (core + role-specific)
   */
  app.get('/api/user/:userId/profile', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      const profileData = await getCompleteUserProfile(userId);
      
      if (!profileData || !profileData.core) {
        return res.status(404).json({ error: 'User profile not found' });
      }
      
      return res.json(profileData);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });
  
  /**
   * Create a new user profile during registration
   */
  app.post('/api/user/create-profile', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { name, email, role, phone } = req.body;
      
      if (!name || !email || !role) {
        return res.status(400).json({ error: 'Name, email, and role are required' });
      }
      
      // Validate role
      if (!['consumer', 'producer', 'partner'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be consumer, producer, or partner' });
      }
      
      console.log(`Creating new user profile for ${req.user.uid} with role ${role}`);
      
      // Create harmonized user
      const userData: HarmonizedUser = {
        id: req.user.uid,
        userId: req.user.uid,
        name,
        email,
        phone: phone || '',
        role: role as 'consumer' | 'producer' | 'partner',
        emailVerified: req.user.email_verified || false,
        points: 0,
        createdAt: FieldValue.serverTimestamp() as ServerTimestamp,
        updatedAt: FieldValue.serverTimestamp() as ServerTimestamp,
        _standardized: true,
        _standardizedVersion: 1
      };
      
      // Role-specific profile data
      if (role === 'consumer') {
        // Create tourist profile
        const touristProfile: TouristProfile = {
          id: req.user.uid,
          preferences: [],
          wishlist: [],
          bookingHistory: [],
          lastUpdated: FieldValue.serverTimestamp() as ServerTimestamp
        };
        
        await createOrUpdateHarmonizedUser(userData, { touristProfile });
      } else {
        // Create service provider profile
        const serviceProviderProfile: ServiceProviderProfile = {
          providerId: req.user.uid,
          businessName: name, // Use name as initial business name
          contactInformation: {
            address: '',
          },
          servicesOffered: [],
          lastUpdated: FieldValue.serverTimestamp() as ServerTimestamp
        };
        
        await createOrUpdateHarmonizedUser(userData, { serviceProviderProfile });
      }
      
      // Update Firebase Auth custom claims to match the selected role
      console.log(`Setting custom claims for user ${req.user.uid} with role=${role}`);
      await adminAuth.setCustomUserClaims(req.user.uid, { role });
      
      console.log(`Custom claims set successfully for user ${req.user.uid}`);
      
      return res.json({ 
        success: true, 
        message: 'User profile created successfully',
        refreshToken: true // Signal client to refresh token
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }
  });
  
  /**
   * Synchronize Firebase Auth custom claims with Firestore user role
   * This endpoint is used to resolve mismatches between Auth claims and Firestore data
   * 
   * Enhanced version that uses the setUserRole Cloud Function for better reliability
   */
  app.post('/api/user/sync-auth-claims', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // 1. Get the current role from harmonized_users in Firestore
      const userDoc = await adminDb.collection('harmonized_users').doc(req.user.uid).get();
      
      if (!userDoc.exists) {
        console.error(`User ${req.user.uid} not found in Firestore during role sync`);
        return res.status(404).json({ 
          success: false,
          error: 'User profile not found in Firestore',
          message: 'User profile not found in Firestore. Please contact support.' 
        });
      }
      
      const userData = userDoc.data() as HarmonizedUser;
      const firestoreRole = userData?.role;
      
      // Validate the role from Firestore
      const validRoles = ['consumer', 'producer', 'partner'];
      if (!firestoreRole || !validRoles.includes(firestoreRole)) {
        console.error(`Invalid role "${firestoreRole}" found in Firestore for user ${req.user.uid}`);
        return res.status(400).json({ 
          success: false,
          error: 'Invalid role in Firestore',
          message: `Invalid role "${firestoreRole}" found in Firestore.` 
        });
      }
      
      // 2. Log detailed information for debugging
      console.log(`==== ROLE SYNCHRONIZATION ====`);
      console.log(`User: ${req.user.uid} (${req.user.email || 'no email'})`);
      console.log(`Current Auth role: ${req.user.role || 'not set'}`);
      console.log(`Firestore role: ${firestoreRole}`);
      
      // 3. Check if the role actually needs to be updated
      if (req.user.role === firestoreRole) {
        console.log(`No role change needed - Auth and Firestore roles already match: ${firestoreRole}`);
        
        // Even if no change, we'll return success for consistency
        return res.status(200).json({
          success: true,
          message: `Role already synchronized (${firestoreRole})`,
          currentRole: req.user.role,
          newRole: firestoreRole,
          refreshToken: false // No need to refresh token as it's already correct
        });
      }
      
      console.log(`Role mismatch detected. Auth: ${req.user.role || 'not set'}, Firestore: ${firestoreRole}`);
      
      try {
        // 4. Update Firebase Auth custom claims with the role from Firestore
        // For more robust operation, we use the direct Admin SDK approach
        console.log(`Setting custom claims for user ${req.user.uid} to role=${firestoreRole}...`);
        await adminAuth.setCustomUserClaims(req.user.uid, { role: firestoreRole });
        
        console.log(`✓ Auth claims updated successfully via Admin SDK`);
      } catch (claimsError) {
        console.error(`Error updating custom claims via Admin SDK:`, claimsError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update auth claims',
          message: 'Error updating user role. Please try again later.'
        });
      }
      
      // 5. Return success with detailed information
      console.log(`==== ROLE SYNC COMPLETE ====`);
      console.log(`User ${req.user.uid} role updated from "${req.user.role || 'not set'}" to "${firestoreRole}"`);
      
      return res.status(200).json({
        success: true,
        message: `Role synchronized successfully to ${firestoreRole}`,
        currentRole: req.user.role,
        newRole: firestoreRole,
        refreshToken: true // Signal client to refresh token
      });
    } catch (error) {
      console.error('Error in sync-auth-claims endpoint:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Server error',
        message: 'An unexpected error occurred while synchronizing roles.'
      });
    }
  });

  /**
   * Update user role 
   * This endpoint should be restricted to administrators in production
   */
  app.post('/api/user/:userId/update-role', verifyAuth, async (req: Request, res: Response) => {
    try {
      // In production, check if user is an admin
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!userId || !role) {
        return res.status(400).json({ error: 'User ID and role are required' });
      }
      
      // Validate role
      if (!['consumer', 'producer', 'partner'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be consumer, producer, or partner' });
      }
      
      // Get current user data
      const userDoc = await adminDb.collection('harmonized_users').doc(userId).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userDoc.data() as HarmonizedUser;
      const oldRole = userData.role;
      
      // Update role
      await adminDb.collection('harmonized_users').doc(userId).update({
        role,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // If changing from consumer to producer/partner, create service provider profile
      if (oldRole === 'consumer' && (role === 'producer' || role === 'partner')) {
        const serviceProviderDoc = await adminDb.collection('user_profiles_service_provider').doc(userId).get();
        
        if (!serviceProviderDoc.exists) {
          await adminDb.collection('user_profiles_service_provider').doc(userId).set({
            providerId: userId,
            businessName: userData.name,
            contactInformation: {
              address: '',
            },
            servicesOffered: [],
            lastUpdated: FieldValue.serverTimestamp()
          });
        }
      }
      
      // If changing from producer/partner to consumer, create tourist profile
      if ((oldRole === 'producer' || oldRole === 'partner') && role === 'consumer') {
        const touristDoc = await adminDb.collection('user_profiles_tourist').doc(userId).get();
        
        if (!touristDoc.exists) {
          await adminDb.collection('user_profiles_tourist').doc(userId).set({
            id: userId,
            preferences: [],
            wishlist: [],
            bookingHistory: [],
            lastUpdated: FieldValue.serverTimestamp()
          });
        }
      }
      
      // Sync with role-specific collections
      await syncUserData(userId);
      
      // Update Firebase Auth custom claims to match
      await adminAuth.setCustomUserClaims(userId, { role });
      
      return res.json({ 
        success: true,
        message: 'User role updated in both Firestore and Auth claims'
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      return res.status(500).json({ error: 'Failed to update user role' });
    }
  });
}