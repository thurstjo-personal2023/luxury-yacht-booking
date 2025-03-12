/**
 * User Profile Routes
 * 
 * API endpoints for managing user profiles across the harmonized structure
 */

import { Express, Request, Response } from 'express';
import { verifyAuth, adminDb as db } from './firebase-admin';
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
      const userDoc = await db.collection('harmonized_users').doc(req.user.uid).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Update user data
      const updates: Partial<HarmonizedUser> = {
        updatedAt: FieldValue.serverTimestamp() as ServerTimestamp
      };
      
      if (name) updates.name = name;
      if (phone) updates.phone = phone;
      
      await db.collection('harmonized_users').doc(req.user.uid).update(updates);
      
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
      const userDoc = await db.collection('harmonized_users').doc(req.user.uid).get();
      
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
      const profileDoc = await db.collection('user_profiles_tourist').doc(req.user.uid).get();
      
      if (profileDoc.exists) {
        // Update existing profile
        await db.collection('user_profiles_tourist').doc(req.user.uid).update(updates);
      } else {
        // Create new profile
        await db.collection('user_profiles_tourist').doc(req.user.uid).set({
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
   * Update the current user's service provider profile (for producers/partners)
   */
  app.post('/api/user/update-provider-profile', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Check if user role is producer or partner
      const userDoc = await db.collection('harmonized_users').doc(req.user.uid).get();
      
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
        lastUpdated: admin.firestore.FieldValue.serverTimestamp() as ServerTimestamp
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
      const profileDoc = await db.collection('user_profiles_service_provider').doc(req.user.uid).get();
      
      if (profileDoc.exists) {
        // Update existing profile
        await db.collection('user_profiles_service_provider').doc(req.user.uid).update(updates);
      } else {
        // Create new profile
        await db.collection('user_profiles_service_provider').doc(req.user.uid).set({
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
      const userDoc = await db.collection('harmonized_users').doc(req.user.uid).get();
      
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
      const profileDoc = await db.collection('user_profiles_tourist').doc(req.user.uid).get();
      let profile: TouristProfile;
      
      if (profileDoc.exists) {
        profile = profileDoc.data() as TouristProfile;
      } else {
        profile = {
          id: req.user.uid,
          wishlist: [],
          lastUpdated: admin.firestore.FieldValue.serverTimestamp() as ServerTimestamp
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
        lastUpdated: admin.firestore.FieldValue.serverTimestamp() as ServerTimestamp
      };
      
      if (profileDoc.exists) {
        await db.collection('user_profiles_tourist').doc(req.user.uid).update(updates);
      } else {
        await db.collection('user_profiles_tourist').doc(req.user.uid).set({
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
        createdAt: admin.firestore.FieldValue.serverTimestamp() as ServerTimestamp,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as ServerTimestamp,
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
          lastUpdated: admin.firestore.FieldValue.serverTimestamp() as ServerTimestamp
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
          lastUpdated: admin.firestore.FieldValue.serverTimestamp() as ServerTimestamp
        };
        
        await createOrUpdateHarmonizedUser(userData, { serviceProviderProfile });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Error creating user profile:', error);
      return res.status(500).json({ error: 'Failed to create user profile' });
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
      const userDoc = await db.collection('harmonized_users').doc(userId).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userDoc.data() as HarmonizedUser;
      const oldRole = userData.role;
      
      // Update role
      await db.collection('harmonized_users').doc(userId).update({
        role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // If changing from consumer to producer/partner, create service provider profile
      if (oldRole === 'consumer' && (role === 'producer' || role === 'partner')) {
        const serviceProviderDoc = await db.collection('user_profiles_service_provider').doc(userId).get();
        
        if (!serviceProviderDoc.exists) {
          await db.collection('user_profiles_service_provider').doc(userId).set({
            providerId: userId,
            businessName: userData.name,
            contactInformation: {
              address: '',
            },
            servicesOffered: [],
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
      
      // If changing from producer/partner to consumer, create tourist profile
      if ((oldRole === 'producer' || oldRole === 'partner') && role === 'consumer') {
        const touristDoc = await db.collection('user_profiles_tourist').doc(userId).get();
        
        if (!touristDoc.exists) {
          await db.collection('user_profiles_tourist').doc(userId).set({
            id: userId,
            preferences: [],
            wishlist: [],
            bookingHistory: [],
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
      
      // Sync with role-specific collections
      await syncUserData(userId);
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Error updating user role:', error);
      return res.status(500).json({ error: 'Failed to update user role' });
    }
  });
}