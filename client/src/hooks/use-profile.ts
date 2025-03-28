import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import axios from 'axios';

/**
 * Hook for updating a tourist (consumer) profile 
 * Uses the new server-side API endpoint with fallback to direct Firestore updates
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profileData: Record<string, any>) => {
      // Get the current user's ID
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const userId = user.uid;
      
      try {
        // First try to update using the API endpoint
        console.log("Updating profile via API endpoint");
        
        // Get the ID token for authentication
        const idToken = await user.getIdToken();
        
        // Call the API endpoint with the updated profile data
        const response = await axios.post('/api/user/update-profile', 
          profileData,
          {
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log("Profile update API response:", response.data);
        
        if (response.data.success) {
          return { success: true, message: response.data.message };
        } else {
          throw new Error(response.data.error || 'Failed to update profile via API');
        }
      } catch (apiError) {
        console.error("API update failed, falling back to direct Firestore update", apiError);
        
        // Fallback to direct Firestore updates if the API fails
        // Reference to the user's profile document
        const profileRef = doc(db, "user_profiles_tourist", userId);
        
        // Check if profile exists before updating
        const profileDoc = await getDoc(profileRef);
        if (!profileDoc.exists()) {
          throw new Error('Profile not found');
        }
        
        // Update fields that have been provided
        const updates: Record<string, any> = {
          ...profileData,
          lastUpdated: new Date()
        };
        
        // If we have a name update, update the corresponding fields in harmonized_users
        if (profileData.name) {
          const userRef = doc(db, "harmonized_users", userId);
          await updateDoc(userRef, {
            name: profileData.name,
            updatedAt: new Date()
          });
        }
        
        // If we have a phoneNumber update, update the corresponding field in harmonized_users
        if (profileData.phoneNumber) {
          const userRef = doc(db, "harmonized_users", userId);
          await updateDoc(userRef, {
            phone: profileData.phoneNumber,
            updatedAt: new Date()
          });
        }
        
        // Update the profile
        await updateDoc(profileRef, updates);
        
        return { success: true, message: "Profile updated via direct Firestore update" };
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['consumer-profile'] });
    }
  });
}