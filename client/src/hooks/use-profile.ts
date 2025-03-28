import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

/**
 * Hook for updating a tourist (consumer) profile in Firestore
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
      
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['consumer-profile'] });
    }
  });
}