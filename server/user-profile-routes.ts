/**
 * User Profile Routes
 * 
 * API endpoints for managing user profiles across the harmonized structure
 */

import { Request, Response } from 'express';
import { Express } from 'express';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where } from 'firebase/firestore';
import { verifyAuth } from './firebase-admin';
import { db } from './firebase-admin';
import { HarmonizedUser, TouristProfile, ServiceProviderProfile } from '../shared/harmonized-user-schema';

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
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const userId = req.user.uid;
      
      // Get harmonized user data
      const userDoc = await getDoc(doc(db, 'harmonized_users', userId));
      if (!userDoc.exists()) {
        return res.status(404).json({ error: 'User profile not found' });
      }
      
      const userData = userDoc.data() as HarmonizedUser;
      let profileData = null;
      
      // Get role-specific profile data
      if (userData.role === 'consumer') {
        const profileDoc = await getDoc(doc(db, 'user_profiles_tourist', userId));
        if (profileDoc.exists()) {
          profileData = profileDoc.data() as TouristProfile;
        }
      } else if (userData.role === 'producer' || userData.role === 'partner') {
        const profileDoc = await getDoc(doc(db, 'user_profiles_service_provider', userId));
        if (profileDoc.exists()) {
          profileData = profileDoc.data() as ServiceProviderProfile;
        }
      }
      
      res.json({
        core: userData,
        profile: profileData
      });
      
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Error fetching user profile' });
    }
  });
  
  /**
   * Update the current user's core information
   */
  app.post('/api/user/update-core', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const userId = req.user.uid;
      const { name, phone } = req.body;
      
      if (!name && !phone) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      const updates: Record<string, any> = {
        updatedAt: new Date()
      };
      
      if (name) updates.name = name;
      if (phone) updates.phone = phone;
      
      await updateDoc(doc(db, 'harmonized_users', userId), updates);
      
      res.json({ success: true });
      
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Error updating user profile' });
    }
  });
  
  /**
   * Update the current user's tourist profile (for consumers)
   */
  app.post('/api/user/update-tourist-profile', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const userId = req.user.uid;
      
      // Verify user is a consumer
      const userDoc = await getDoc(doc(db, 'harmonized_users', userId));
      if (!userDoc.exists() || userDoc.data().role !== 'consumer') {
        return res.status(403).json({ error: 'Access denied: user is not a consumer' });
      }
      
      const { profilePhoto, preferences, loyaltyTier } = req.body;
      
      const updates: Record<string, any> = {
        lastUpdated: new Date()
      };
      
      if (profilePhoto) updates.profilePhoto = profilePhoto;
      if (preferences) updates.preferences = preferences;
      if (loyaltyTier) updates.loyaltyTier = loyaltyTier;
      
      // Check if profile exists
      const profileDoc = await getDoc(doc(db, 'user_profiles_tourist', userId));
      
      if (profileDoc.exists()) {
        await updateDoc(doc(db, 'user_profiles_tourist', userId), updates);
      } else {
        // Create new profile if it doesn't exist
        await setDoc(doc(db, 'user_profiles_tourist', userId), {
          id: userId,
          profilePhoto: profilePhoto || '',
          preferences: preferences || [],
          loyaltyTier: loyaltyTier || 'Bronze',
          wishlist: [],
          bookingHistory: [],
          reviewsProvided: [],
          lastUpdated: new Date()
        });
      }
      
      res.json({ success: true });
      
    } catch (error) {
      console.error('Error updating tourist profile:', error);
      res.status(500).json({ error: 'Error updating tourist profile' });
    }
  });
  
  /**
   * Update the current user's service provider profile (for producers/partners)
   */
  app.post('/api/user/update-provider-profile', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const userId = req.user.uid;
      
      // Verify user is a producer or partner
      const userDoc = await getDoc(doc(db, 'harmonized_users', userId));
      if (!userDoc.exists() || (userDoc.data().role !== 'producer' && userDoc.data().role !== 'partner')) {
        return res.status(403).json({ error: 'Access denied: user is not a producer or partner' });
      }
      
      const { 
        businessName, 
        contactInformation, 
        profilePhoto,
        servicesOffered,
        certifications,
        tags
      } = req.body;
      
      const updates: Record<string, any> = {
        lastUpdated: new Date()
      };
      
      if (businessName) updates.businessName = businessName;
      if (contactInformation) updates.contactInformation = contactInformation;
      if (profilePhoto) updates.profilePhoto = profilePhoto;
      if (servicesOffered) updates.servicesOffered = servicesOffered;
      if (certifications) updates.certifications = certifications;
      if (tags) updates.tags = tags;
      
      // Check if profile exists
      const profileDoc = await getDoc(doc(db, 'user_profiles_service_provider', userId));
      
      if (profileDoc.exists()) {
        await updateDoc(doc(db, 'user_profiles_service_provider', userId), updates);
      } else {
        // Create new profile if it doesn't exist
        await setDoc(doc(db, 'user_profiles_service_provider', userId), {
          providerId: userId,
          businessName: businessName || '',
          contactInformation: contactInformation || { address: '' },
          profilePhoto: profilePhoto || '',
          servicesOffered: servicesOffered || [],
          certifications: certifications || [],
          ratings: 0,
          tags: tags || [],
          lastUpdated: new Date()
        });
      }
      
      res.json({ success: true });
      
    } catch (error) {
      console.error('Error updating service provider profile:', error);
      res.status(500).json({ error: 'Error updating service provider profile' });
    }
  });
  
  /**
   * Manage wishlist for consumers
   */
  app.post('/api/user/wishlist', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const userId = req.user.uid;
      const { action, experienceId } = req.body;
      
      if (!action || !experienceId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Verify user is a consumer
      const userDoc = await getDoc(doc(db, 'harmonized_users', userId));
      if (!userDoc.exists() || userDoc.data().role !== 'consumer') {
        return res.status(403).json({ error: 'Access denied: user is not a consumer' });
      }
      
      const profileRef = doc(db, 'user_profiles_tourist', userId);
      const profileDoc = await getDoc(profileRef);
      
      if (!profileDoc.exists()) {
        // Create new profile if it doesn't exist
        await setDoc(profileRef, {
          id: userId,
          profilePhoto: '',
          preferences: [],
          loyaltyTier: 'Bronze',
          wishlist: action === 'add' ? [experienceId] : [],
          bookingHistory: [],
          reviewsProvided: [],
          lastUpdated: new Date()
        });
      } else {
        const profile = profileDoc.data() as TouristProfile;
        let wishlist = profile.wishlist || [];
        
        if (action === 'add') {
          // Only add if not already in wishlist
          if (!wishlist.includes(experienceId)) {
            wishlist.push(experienceId);
          }
        } else if (action === 'remove') {
          wishlist = wishlist.filter(id => id !== experienceId);
        }
        
        await updateDoc(profileRef, {
          wishlist,
          lastUpdated: new Date()
        });
      }
      
      res.json({ success: true });
      
    } catch (error) {
      console.error('Error managing wishlist:', error);
      res.status(500).json({ error: 'Error managing wishlist' });
    }
  });
  
  /**
   * Get a user's profile by ID (public information only)
   */
  app.get('/api/user/:userId/profile', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Get harmonized user data
      const userDoc = await getDoc(doc(db, 'harmonized_users', userId));
      if (!userDoc.exists()) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userData = userDoc.data() as HarmonizedUser;
      
      // Return only public information
      const publicUserData = {
        id: userData.id,
        name: userData.name,
        role: userData.role
      };
      
      let profileData = null;
      
      // Get role-specific public profile data
      if (userData.role === 'consumer') {
        const profileDoc = await getDoc(doc(db, 'user_profiles_tourist', userId));
        if (profileDoc.exists()) {
          const fullProfile = profileDoc.data() as TouristProfile;
          profileData = {
            profilePhoto: fullProfile.profilePhoto
          };
        }
      } else if (userData.role === 'producer' || userData.role === 'partner') {
        const profileDoc = await getDoc(doc(db, 'user_profiles_service_provider', userId));
        if (profileDoc.exists()) {
          const fullProfile = profileDoc.data() as ServiceProviderProfile;
          profileData = {
            businessName: fullProfile.businessName,
            profilePhoto: fullProfile.profilePhoto,
            servicesOffered: fullProfile.servicesOffered,
            ratings: fullProfile.ratings
          };
        }
      }
      
      res.json({
        user: publicUserData,
        profile: profileData
      });
      
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Error fetching user profile' });
    }
  });
  
  /**
   * Update user role 
   * This endpoint should be restricted to administrators in production
   */
  app.post('/api/user/:userId/update-role', verifyAuth, async (req: Request, res: Response) => {
    try {
      // In a real application, you would check admin permissions here
      // For now, we'll allow any authenticated user to demonstrate the functionality
      
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!userId || !role) {
        return res.status(400).json({ error: 'User ID and role are required' });
      }
      
      if (!['consumer', 'producer', 'partner'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      
      const userRef = doc(db, 'harmonized_users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      await updateDoc(userRef, {
        role,
        updatedAt: new Date()
      });
      
      // Ensure appropriate profile exists for new role
      if (role === 'consumer') {
        const profileRef = doc(db, 'user_profiles_tourist', userId);
        const profileDoc = await getDoc(profileRef);
        
        if (!profileDoc.exists()) {
          await setDoc(profileRef, {
            id: userId,
            profilePhoto: '',
            preferences: [],
            loyaltyTier: 'Bronze',
            wishlist: [],
            bookingHistory: [],
            reviewsProvided: [],
            lastUpdated: new Date()
          });
        }
      } else if (role === 'producer' || role === 'partner') {
        const profileRef = doc(db, 'user_profiles_service_provider', userId);
        const profileDoc = await getDoc(profileRef);
        
        if (!profileDoc.exists()) {
          const userData = userDoc.data();
          
          await setDoc(profileRef, {
            providerId: userId,
            businessName: userData.name || '',
            contactInformation: { address: '' },
            profilePhoto: '',
            servicesOffered: [],
            certifications: [],
            ratings: 0,
            tags: [],
            lastUpdated: new Date()
          });
        }
      }
      
      res.json({ success: true });
      
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Error updating user role' });
    }
  });
}