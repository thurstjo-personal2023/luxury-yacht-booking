/**
 * Firestore User Repository
 * 
 * This module implements the user repository interface using Firestore.
 * It handles data storage and retrieval for regular users (consumers, producers, and partners).
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  getFirestore, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { IUserRepository } from '../../core/application/repositories/user-repository.interface';
import { User, UserRole } from '../../core/domain/auth/user';

/**
 * Firestore implementation of the user repository
 */
export class FirestoreUserRepository implements IUserRepository {
  private firestore = getFirestore();
  private consumerCollection = 'user_profiles_consumer';
  private producerCollection = 'user_profiles_producer';
  private partnerCollection = 'user_profiles_partner';
  
  /**
   * Get a user by their ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      console.log('Firestore user repository: Getting user by ID', userId);
      
      // First try user_profiles_consumer
      const consumerDoc = await getDoc(doc(this.firestore, this.consumerCollection, userId));
      if (consumerDoc.exists()) {
        const data = consumerDoc.data();
        console.log('Firestore user repository: Found consumer user');
        return this.mapFirestoreDocToUser(userId, data, 'consumer');
      }
      
      // Then try user_profiles_producer
      const producerDoc = await getDoc(doc(this.firestore, this.producerCollection, userId));
      if (producerDoc.exists()) {
        const data = producerDoc.data();
        console.log('Firestore user repository: Found producer user');
        return this.mapFirestoreDocToUser(userId, data, 'producer');
      }
      
      // Finally try user_profiles_partner
      const partnerDoc = await getDoc(doc(this.firestore, this.partnerCollection, userId));
      if (partnerDoc.exists()) {
        const data = partnerDoc.data();
        console.log('Firestore user repository: Found partner user');
        return this.mapFirestoreDocToUser(userId, data, 'partner');
      }
      
      console.log('Firestore user repository: User not found');
      return null;
    } catch (error) {
      console.error('Firestore user repository: Error fetching user by ID', error);
      return null;
    }
  }
  
  /**
   * Get a user by their email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      console.log('Firestore user repository: Getting user by email', email);
      
      // Try to find the user in each collection by email
      const collections = [
        this.consumerCollection,
        this.producerCollection,
        this.partnerCollection
      ];
      
      for (const collectionName of collections) {
        const q = query(
          collection(this.firestore, collectionName),
          where('email', '==', email)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const role = this.getRoleFromCollection(collectionName);
          console.log(`Firestore user repository: Found user in ${collectionName}`);
          return this.mapFirestoreDocToUser(doc.id, doc.data(), role);
        }
      }
      
      console.log('Firestore user repository: User not found by email');
      return null;
    } catch (error) {
      console.error('Firestore user repository: Error fetching user by email', error);
      return null;
    }
  }
  
  /**
   * Create a new user profile
   */
  async createUserProfile(userId: string, userData: Partial<User>): Promise<void> {
    try {
      console.log('Firestore user repository: Creating user profile', userId);
      const role = userData.role || 'consumer';
      const collectionName = this.getCollectionForRole(role);
      
      // Prepare data for Firestore
      const firestoreData = {
        email: userData.email,
        displayName: userData.displayName || null,
        phoneNumber: userData.phoneNumber || null,
        photoURL: userData.photoURL || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Create the document
      await setDoc(doc(this.firestore, collectionName, userId), firestoreData);
      console.log(`Firestore user repository: User profile created in ${collectionName}`);
    } catch (error) {
      console.error('Firestore user repository: Error creating user profile', error);
      throw error;
    }
  }
  
  /**
   * Update an existing user profile
   */
  async updateUserProfile(userId: string, userData: Partial<User>): Promise<void> {
    try {
      console.log('Firestore user repository: Updating user profile', userId);
      
      // If role is specified, we might need to move the user to a different collection
      if (userData.role) {
        const currentUser = await this.getUserById(userId);
        
        // If the user exists and the role is changing
        if (currentUser && currentUser.role !== userData.role) {
          console.log('Firestore user repository: User role is changing, moving user profile');
          
          // Create user in new collection
          await this.createUserProfile(userId, {
            ...currentUser,
            ...userData
          });
          
          // Delete from old collection
          const oldCollection = this.getCollectionForRole(currentUser.role);
          await this.deleteUserProfile(userId, oldCollection);
          
          console.log('Firestore user repository: User profile moved to new collection');
          return;
        }
      }
      
      // If we're just updating fields and not changing collections
      const user = await this.getUserById(userId);
      if (!user) {
        console.error('Firestore user repository: User not found for update');
        throw new Error('User not found');
      }
      
      const collectionName = this.getCollectionForRole(user.role || 'consumer');
      
      // Prepare data for update
      const updateData: any = {
        updatedAt: serverTimestamp()
      };
      
      // Add all changed fields
      if (userData.displayName !== undefined) updateData.displayName = userData.displayName;
      if (userData.phoneNumber !== undefined) updateData.phoneNumber = userData.phoneNumber;
      if (userData.photoURL !== undefined) updateData.photoURL = userData.photoURL;
      
      // Update the document
      await updateDoc(doc(this.firestore, collectionName, userId), updateData);
      console.log('Firestore user repository: User profile updated');
    } catch (error) {
      console.error('Firestore user repository: Error updating user profile', error);
      throw error;
    }
  }
  
  /**
   * Delete a user profile from a specific collection
   * This is a private helper method used during profile moves
   */
  private async deleteUserProfile(userId: string, collectionName: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, collectionName, userId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Firestore user repository: Error deleting user profile', error);
      throw error;
    }
  }
  
  /**
   * Map a Firestore document to a User entity
   */
  private mapFirestoreDocToUser(id: string, data: any, role: UserRole): User {
    return {
      uid: id,
      email: data.email || null,
      displayName: data.displayName || null,
      role: role as UserRole, // Force cast to UserRole for type safety
      phoneNumber: data.phoneNumber || null,
      photoURL: data.photoURL || null
    };
  }
  
  /**
   * Get the appropriate collection name for a given role
   */
  private getCollectionForRole(role: UserRole): string {
    switch (role) {
      case 'producer':
        return this.producerCollection;
      case 'partner':
        return this.partnerCollection;
      case 'consumer':
      default:
        return this.consumerCollection;
    }
  }
  
  /**
   * Determine the role based on the collection name
   */
  private getRoleFromCollection(collectionName: string): UserRole {
    switch (collectionName) {
      case this.producerCollection:
        return 'producer';
      case this.partnerCollection:
        return 'partner';
      case this.consumerCollection:
      default:
        return 'consumer';
    }
  }
}