/**
 * Firebase User Repository Implementation
 * 
 * Implements the IUserRepository interface using Firebase Firestore.
 */

import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentReference,
  DocumentSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

import { IUserRepository, UserSearchCriteria } from '../interfaces/user-repository';
import { User, UserProps } from '../../../core/domain/user/user';
import { EmailAddress } from '../../../core/domain/value-objects/email-address';
import { PhoneNumber } from '../../../core/domain/value-objects/phone-number';
import { UserRole } from '../../../core/domain/user/user-role';

/**
 * Firebase User Repository configuration
 */
export interface FirebaseUserRepositoryConfig {
  usersCollection: string;
}

/**
 * Firebase User Repository implementation
 */
export class FirebaseUserRepository implements IUserRepository {
  private readonly firestore: Firestore;
  private readonly config: FirebaseUserRepositoryConfig;
  
  constructor(firestore: Firestore, config: FirebaseUserRepositoryConfig) {
    this.firestore = firestore;
    this.config = config;
  }
  
  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const userRef = doc(this.firestore, this.config.usersCollection, id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }
      
      return this.documentToUser(userDoc);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }
  
  /**
   * Find a user by email
   */
  async findByEmail(email: EmailAddress | string): Promise<User | null> {
    try {
      const emailStr = email instanceof EmailAddress ? email.value : email;
      
      const usersRef = collection(this.firestore, this.config.usersCollection);
      const q = query(usersRef, where('email', '==', emailStr));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return this.documentToUser(querySnapshot.docs[0]);
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }
  
  /**
   * Find a user by phone number
   */
  async findByPhone(phone: PhoneNumber | string): Promise<User | null> {
    try {
      const phoneStr = phone instanceof PhoneNumber ? phone.value : phone;
      
      const usersRef = collection(this.firestore, this.config.usersCollection);
      const q = query(usersRef, where('phone', '==', phoneStr));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return this.documentToUser(querySnapshot.docs[0]);
    } catch (error) {
      console.error('Error finding user by phone:', error);
      return null;
    }
  }
  
  /**
   * Find users by role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    try {
      const usersRef = collection(this.firestore, this.config.usersCollection);
      const q = query(usersRef, where('role', '==', role));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => this.documentToUser(doc));
    } catch (error) {
      console.error('Error finding users by role:', error);
      return [];
    }
  }
  
  /**
   * Search for users based on criteria
   */
  async search(criteria: UserSearchCriteria): Promise<User[]> {
    try {
      const usersRef = collection(this.firestore, this.config.usersCollection);
      let q = query(usersRef);
      
      // Add filters
      if (criteria.role) {
        q = query(q, where('role', '==', criteria.role));
      }
      
      if (criteria.email) {
        q = query(q, where('email', '==', criteria.email));
      }
      
      if (criteria.isEmailVerified !== undefined) {
        q = query(q, where('isEmailVerified', '==', criteria.isEmailVerified));
      }
      
      if (criteria.isPhoneVerified !== undefined) {
        q = query(q, where('isPhoneVerified', '==', criteria.isPhoneVerified));
      }
      
      if (criteria.createdAfter) {
        const timestamp = Timestamp.fromDate(criteria.createdAfter);
        q = query(q, where('createdAt', '>=', timestamp));
      }
      
      if (criteria.createdBefore) {
        const timestamp = Timestamp.fromDate(criteria.createdBefore);
        q = query(q, where('createdAt', '<=', timestamp));
      }
      
      // Add sorting and pagination
      q = query(q, orderBy('createdAt', 'desc'));
      
      if (criteria.limit) {
        q = query(q, limit(criteria.limit));
      }
      
      if (criteria.offset && criteria.offset > 0) {
        // Get the first offset documents
        const offsetSnapshot = await getDocs(
          query(q, limit(criteria.offset))
        );
        
        if (!offsetSnapshot.empty) {
          const lastVisible = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
          q = query(q, startAfter(lastVisible));
        }
      }
      
      const querySnapshot = await getDocs(q);
      
      const users = querySnapshot.docs.map(doc => this.documentToUser(doc));
      
      // Handle firstName and lastName client-side filtering
      // This is not ideal but Firestore doesn't support case-insensitive queries
      if (criteria.firstName) {
        const firstName = criteria.firstName.toLowerCase();
        return users.filter(user => 
          user.firstName.toLowerCase().includes(firstName)
        );
      }
      
      if (criteria.lastName) {
        const lastName = criteria.lastName.toLowerCase();
        return users.filter(user => 
          user.lastName.toLowerCase().includes(lastName)
        );
      }
      
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
  
  /**
   * Count users matching criteria
   */
  async count(criteria: UserSearchCriteria): Promise<number> {
    try {
      const usersRef = collection(this.firestore, this.config.usersCollection);
      let q = query(usersRef);
      
      // Add filters
      if (criteria.role) {
        q = query(q, where('role', '==', criteria.role));
      }
      
      if (criteria.email) {
        q = query(q, where('email', '==', criteria.email));
      }
      
      if (criteria.isEmailVerified !== undefined) {
        q = query(q, where('isEmailVerified', '==', criteria.isEmailVerified));
      }
      
      if (criteria.isPhoneVerified !== undefined) {
        q = query(q, where('isPhoneVerified', '==', criteria.isPhoneVerified));
      }
      
      if (criteria.createdAfter) {
        const timestamp = Timestamp.fromDate(criteria.createdAfter);
        q = query(q, where('createdAt', '>=', timestamp));
      }
      
      if (criteria.createdBefore) {
        const timestamp = Timestamp.fromDate(criteria.createdBefore);
        q = query(q, where('createdAt', '<=', timestamp));
      }
      
      const querySnapshot = await getDocs(q);
      let count = querySnapshot.size;
      
      // Handle firstName and lastName client-side filtering
      if (criteria.firstName || criteria.lastName) {
        const users = querySnapshot.docs.map(doc => this.documentToUser(doc));
        
        if (criteria.firstName) {
          const firstName = criteria.firstName.toLowerCase();
          count = users.filter(user => 
            user.firstName.toLowerCase().includes(firstName)
          ).length;
        }
        
        if (criteria.lastName) {
          const lastName = criteria.lastName.toLowerCase();
          count = users.filter(user => 
            user.lastName.toLowerCase().includes(lastName)
          ).length;
        }
      }
      
      return count;
    } catch (error) {
      console.error('Error counting users:', error);
      return 0;
    }
  }
  
  /**
   * Save a user (create or update)
   */
  async save(user: User): Promise<User> {
    try {
      const userRef = doc(this.firestore, this.config.usersCollection, user.id);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await this.update(user);
      } else {
        await this.create(user);
      }
      
      return user;
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }
  
  /**
   * Create a new user
   */
  async create(user: User): Promise<User> {
    try {
      const userId = user.id || uuidv4();
      const userRef = doc(this.firestore, this.config.usersCollection, userId);
      
      const userData = this.userToDocument(user);
      
      // Add creation timestamps
      userData.createdAt = serverTimestamp();
      userData.updatedAt = serverTimestamp();
      
      await setDoc(userRef, userData);
      
      // Get the newly created user
      const userDoc = await getDoc(userRef);
      return this.documentToUser(userDoc);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing user
   */
  async update(user: User): Promise<User> {
    try {
      const userRef = doc(this.firestore, this.config.usersCollection, user.id);
      
      const userData = this.userToDocument(user);
      
      // Update timestamp
      userData.updatedAt = serverTimestamp();
      
      await updateDoc(userRef, userData);
      
      // Get the updated user
      const userDoc = await getDoc(userRef);
      return this.documentToUser(userDoc);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
  
  /**
   * Delete a user by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const userRef = doc(this.firestore, this.config.usersCollection, id);
      await deleteDoc(userRef);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
  
  /**
   * Verify a user's email
   */
  async verifyEmail(id: string): Promise<User | null> {
    try {
      const userRef = doc(this.firestore, this.config.usersCollection, id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }
      
      const userData = userDoc.data();
      
      await updateDoc(userRef, {
        isEmailVerified: true,
        updatedAt: serverTimestamp()
      });
      
      const updatedUserDoc = await getDoc(userRef);
      return this.documentToUser(updatedUserDoc);
    } catch (error) {
      console.error('Error verifying email:', error);
      return null;
    }
  }
  
  /**
   * Verify a user's phone number
   */
  async verifyPhone(id: string): Promise<User | null> {
    try {
      const userRef = doc(this.firestore, this.config.usersCollection, id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }
      
      await updateDoc(userRef, {
        isPhoneVerified: true,
        updatedAt: serverTimestamp()
      });
      
      const updatedUserDoc = await getDoc(userRef);
      return this.documentToUser(updatedUserDoc);
    } catch (error) {
      console.error('Error verifying phone:', error);
      return null;
    }
  }
  
  /**
   * Update a user's last login time
   */
  async updateLastLogin(id: string, lastLoginAt: Date): Promise<User | null> {
    try {
      const userRef = doc(this.firestore, this.config.usersCollection, id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }
      
      await updateDoc(userRef, {
        lastLoginAt: Timestamp.fromDate(lastLoginAt),
        updatedAt: serverTimestamp()
      });
      
      const updatedUserDoc = await getDoc(userRef);
      return this.documentToUser(updatedUserDoc);
    } catch (error) {
      console.error('Error updating last login:', error);
      return null;
    }
  }
  
  /**
   * Convert a Firestore document to a User entity
   */
  private documentToUser(doc: DocumentSnapshot | QueryDocumentSnapshot): User {
    const data = doc.data();
    
    if (!data) {
      throw new Error(`User document ${doc.id} does not exist`);
    }
    
    const props: UserProps = {
      id: doc.id,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: new EmailAddress(data.email),
      phone: data.phone ? new PhoneNumber(data.phone) : undefined,
      role: data.role as UserRole,
      isEmailVerified: data.isEmailVerified || false,
      isPhoneVerified: data.isPhoneVerified || false,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastLoginAt: data.lastLoginAt?.toDate(),
      preferences: data.preferences || []
    };
    
    return new User(props);
  }
  
  /**
   * Convert a User entity to a Firestore document
   */
  private userToDocument(user: User): Record<string, any> {
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email.value,
      phone: user.phone?.value,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      updatedAt: Timestamp.fromDate(user.updatedAt),
      lastLoginAt: user.lastLoginAt ? Timestamp.fromDate(user.lastLoginAt) : null,
      preferences: user.preferences
    };
  }
}