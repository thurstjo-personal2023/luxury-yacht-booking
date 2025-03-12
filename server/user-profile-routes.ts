/**
 * User Profile Routes
 * 
 * API endpoints for managing user profiles across the harmonized structure
 */

import { Express, Request, Response } from "express";
import { adminDb, verifyAuth } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { HarmonizedUser, TouristProfile, ServiceProviderProfile } from "../shared/harmonized-user-schema";
import { Timestamp } from "firebase-admin/firestore";

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
      const userRef = adminDb.collection('harmonized_users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data() as HarmonizedUser;
      let profileData = {};

      // Add role-specific profile data
      if (userData.role === 'consumer') {
        const touristProfileRef = adminDb.collection('user_profiles_tourist').doc(userId);
        const touristProfileDoc = await touristProfileRef.get();
        
        if (touristProfileDoc.exists) {
          profileData = {
            ...userData,
            touristProfile: touristProfileDoc.data()
          };
        } else {
          profileData = {
            ...userData,
            touristProfile: null
          };
        }
      } else if (userData.role === 'producer' || userData.role === 'partner') {
        const providerProfileRef = adminDb.collection('user_profiles_service_provider').doc(userId);
        const providerProfileDoc = await providerProfileRef.get();
        
        if (providerProfileDoc.exists) {
          profileData = {
            ...userData,
            serviceProviderProfile: providerProfileDoc.data()
          };
        } else {
          profileData = {
            ...userData,
            serviceProviderProfile: null
          };
        }
      }

      res.json(profileData);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
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

      // Validate required fields
      if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone are required' });
      }

      // Update core user data
      await adminDb.collection('harmonized_users').doc(userId).update({
        name,
        phone,
        updatedAt: Timestamp.now()
      });

      res.json({ success: true, message: 'Core profile updated successfully' });
    } catch (error: any) {
      console.error('Error updating core profile:', error);
      res.status(500).json({ error: 'Failed to update core profile', details: error.message });
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
      const userRef = adminDb.collection('harmonized_users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data() as HarmonizedUser;
      
      // Check if user is a consumer
      if (userData.role !== 'consumer') {
        return res.status(403).json({ error: 'Only consumers can update tourist profiles' });
      }

      const touristProfileRef = adminDb.collection('user_profiles_tourist').doc(userId);
      const profileDoc = await touristProfileRef.get();
      const profileExists = profileDoc.exists;

      // Extract fields from request
      const { preferences, profilePhoto } = req.body;
      
      const profileData: Partial<TouristProfile> = {
        lastUpdated: Timestamp.now()
      };

      // Only set fields if they're provided
      if (preferences !== undefined) profileData.preferences = preferences;
      if (profilePhoto !== undefined) profileData.profilePhoto = profilePhoto;

      if (profileExists) {
        // Update existing profile
        await touristProfileRef.update(profileData);
      } else {
        // Create new profile
        await touristProfileRef.set({
          id: userId,
          profilePhoto: profilePhoto || '',
          loyaltyTier: 'Bronze',
          preferences: preferences || [],
          wishlist: [],
          bookingHistory: [],
          reviewsProvided: [],
          ...profileData
        });
      }

      res.json({ success: true, message: 'Tourist profile updated successfully' });
    } catch (error: any) {
      console.error('Error updating tourist profile:', error);
      res.status(500).json({ error: 'Failed to update tourist profile', details: error.message });
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
      const userRef = adminDb.collection('harmonized_users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data() as HarmonizedUser;
      
      // Check if user is a producer or partner
      if (userData.role !== 'producer' && userData.role !== 'partner') {
        return res.status(403).json({ error: 'Only producers or partners can update service provider profiles' });
      }

      const providerProfileRef = adminDb.collection('user_profiles_service_provider').doc(userId);
      const profileDoc = await providerProfileRef.get();
      const profileExists = profileDoc.exists;

      // Extract fields from request
      const { 
        businessName, 
        businessAddress, 
        servicesOffered, 
        certifications, 
        tags, 
        yearsOfExperience, 
        professionalDescription, 
        profilePhoto 
      } = req.body;
      
      // Validate required fields
      if (!businessName || !businessAddress || !servicesOffered || servicesOffered.length === 0) {
        return res.status(400).json({ 
          error: 'Business name, address, and at least one service offered are required' 
        });
      }

      const profileData: Partial<ServiceProviderProfile> = {
        businessName,
        contactInformation: {
          address: businessAddress
        },
        servicesOffered,
        lastUpdated: Timestamp.now()
      };

      // Only set fields if they're provided
      if (certifications !== undefined) profileData.certifications = certifications;
      if (tags !== undefined) profileData.tags = tags;
      if (yearsOfExperience !== undefined) profileData.yearsOfExperience = yearsOfExperience;
      if (professionalDescription !== undefined) profileData.professionalDescription = professionalDescription;
      if (profilePhoto !== undefined) profileData.profilePhoto = profilePhoto;

      if (profileExists) {
        // Update existing profile
        await providerProfileRef.update(profileData);
      } else {
        // Create new profile
        await providerProfileRef.set({
          providerId: userId,
          profilePhoto: profilePhoto || '',
          ratings: 0,
          ...profileData
        });
      }

      res.json({ success: true, message: 'Service provider profile updated successfully' });
    } catch (error: any) {
      console.error('Error updating service provider profile:', error);
      res.status(500).json({ error: 'Failed to update service provider profile', details: error.message });
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
      const { action, yachtId } = req.body;

      if (!action || !yachtId) {
        return res.status(400).json({ error: 'Action and yachtId are required' });
      }

      if (action !== 'add' && action !== 'remove') {
        return res.status(400).json({ error: 'Action must be either "add" or "remove"' });
      }

      const userRef = adminDb.collection('harmonized_users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data() as HarmonizedUser;
      
      // Check if user is a consumer
      if (userData.role !== 'consumer') {
        return res.status(403).json({ error: 'Only consumers can manage wishlists' });
      }

      const touristProfileRef = adminDb.collection('user_profiles_tourist').doc(userId);
      const profileDoc = await touristProfileRef.get();

      if (!profileDoc.exists) {
        // Create basic profile if it doesn't exist
        await touristProfileRef.set({
          id: userId,
          profilePhoto: '',
          loyaltyTier: 'Bronze',
          preferences: [],
          wishlist: action === 'add' ? [yachtId] : [],
          bookingHistory: [],
          reviewsProvided: [],
          lastUpdated: Timestamp.now()
        });
      } else {
        // Update wishlist based on action
        if (action === 'add') {
          await touristProfileRef.update({
            wishlist: FieldValue.arrayUnion(yachtId),
            lastUpdated: Timestamp.now()
          });
        } else {
          await touristProfileRef.update({
            wishlist: FieldValue.arrayRemove(yachtId),
            lastUpdated: Timestamp.now()
          });
        }
      }

      res.json({ 
        success: true, 
        message: action === 'add' ? 'Added to wishlist' : 'Removed from wishlist' 
      });
    } catch (error: any) {
      console.error('Error managing wishlist:', error);
      res.status(500).json({ error: 'Failed to manage wishlist', details: error.message });
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

      const userRef = adminDb.collection('harmonized_users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data() as HarmonizedUser;
      
      // Create a public profile with only necessary fields
      const publicProfile = {
        id: userData.id,
        name: userData.name,
        role: userData.role
      };

      // Add role-specific public information
      if (userData.role === 'consumer') {
        const touristProfileRef = adminDb.collection('user_profiles_tourist').doc(userId);
        const touristProfileDoc = await touristProfileRef.get();
        
        if (touristProfileDoc.exists) {
          const touristData = touristProfileDoc.data() as TouristProfile;
          
          // Include only public fields for consumer
          Object.assign(publicProfile, {
            profilePhoto: touristData.profilePhoto,
            loyaltyTier: touristData.loyaltyTier
          });
        }
      } else if (userData.role === 'producer' || userData.role === 'partner') {
        const providerProfileRef = adminDb.collection('user_profiles_service_provider').doc(userId);
        const providerProfileDoc = await providerProfileRef.get();
        
        if (providerProfileDoc.exists) {
          const providerData = providerProfileDoc.data() as ServiceProviderProfile;
          
          // Include only public fields for provider
          Object.assign(publicProfile, {
            providerId: providerData.providerId,
            businessName: providerData.businessName,
            profilePhoto: providerData.profilePhoto,
            ratings: providerData.ratings,
            servicesOffered: providerData.servicesOffered,
            certifications: providerData.certifications,
            yearsOfExperience: providerData.yearsOfExperience,
            professionalDescription: providerData.professionalDescription
          });
        }
      }

      res.json(publicProfile);
    } catch (error: any) {
      console.error('Error fetching public profile:', error);
      res.status(500).json({ error: 'Failed to fetch public profile', details: error.message });
    }
  });

  /**
   * Update user role 
   * This endpoint should be restricted to administrators in production
   */
  app.post('/api/user/:userId/update-role', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // In a production app, check if the current user has admin rights
      // For now, we'll allow this for development purposes

      const { userId } = req.params;
      const { role } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      if (!role || !['consumer', 'producer', 'partner'].includes(role)) {
        return res.status(400).json({ error: 'Valid role is required (consumer, producer, or partner)' });
      }

      const userRef = adminDb.collection('harmonized_users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      await userRef.update({
        role,
        updatedAt: Timestamp.now()
      });

      res.json({ success: true, message: 'User role updated successfully' });
    } catch (error: any) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update user role', details: error.message });
    }
  });
}