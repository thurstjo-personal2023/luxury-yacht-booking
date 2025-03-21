/**
 * Firebase User Repository Implementation
 * 
 * This module implements the IUserRepository interface using Firebase Firestore.
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
  DocumentData,
  QueryDocumentSnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

import { 
  IUserRepository,
  UserFilterOptions,
  UserPaginationOptions,
  PaginatedUsers
} from '../interfaces/user-repository';
import { User } from '../../../core/domain/user/user';
import { EmailAddress } from '../../../core/domain/value-objects/email-address';
import { UserRole } from '../../../core/domain/user/user-role';

/**
 * Firebase user repository configuration
 */
export interface FirebaseUserRepositoryConfig {
  usersCollection: string;
  defaultPageSize: number;
}

/**
 * Firebase user repository implementation
 */
export class FirebaseUserRepository implements IUserRepository {
  private readonly usersCollection: string;
  
  constructor(
    private readonly firestore: Firestore,
    private readonly config: FirebaseUserRepositoryConfig
  ) {
    this.usersCollection = config.usersCollection;
  }
  
  /**
   * Save a user to Firestore
   */
  async save(user: User): Promise<User> {
    try {
      const userRef = doc(this.firestore, this.usersCollection, user.id);
      const userData = this.mapUserToFirestore(user);
      
      await setDoc(userRef, userData, { merge: true });
      
      return user;
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }
  
  /**
   * Find a user by ID from Firestore
   */
  async findById(id: string): Promise<User | null> {
    try {
      const userRef = doc(this.firestore, this.usersCollection, id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }
      
      return this.mapFirestoreToUser(userDoc);
    } catch (error) {
      console.error(`Error finding user by ID ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Find a user by email from Firestore
   */
  async findByEmail(email: EmailAddress | string): Promise<User | null> {
    try {
      const emailStr = email instanceof EmailAddress ? email.value : email;
      const usersRef = collection(this.firestore, this.usersCollection);
      const q = query(usersRef, where('email', '==', emailStr));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return this.mapFirestoreToUser(querySnapshot.docs[0]);
    } catch (error) {
      console.error(`Error finding user by email ${email}:`, error);
      return null;
    }
  }
  
  /**
   * Get all users with pagination and filtering
   */
  async findAll(
    filters?: UserFilterOptions,
    pagination?: UserPaginationOptions
  ): Promise<PaginatedUsers> {
    try {
      const usersRef = collection(this.firestore, this.usersCollection);
      let q = query(usersRef);
      
      // Apply filters if provided
      if (filters) {
        if (filters.role) {
          q = query(q, where('role', '==', filters.role));
        }
        
        if (filters.isEmailVerified !== undefined) {
          q = query(q, where('isEmailVerified', '==', filters.isEmailVerified));
        }
        
        // Note: Full-text search functionality would require Algolia or Firestore's 
        // compound queries to properly implement. This is a simplified version.
        if (filters.searchTerm) {
          // For simplicity, we'll search by name or email containing the search term
          // In a real implementation, this should use a proper search index
          q = query(q, where('name', '>=', filters.searchTerm));
        }
      }
      
      // Get total count for pagination
      const countSnapshot = await getDocs(q);
      const totalCount = countSnapshot.size;
      
      // Apply pagination
      const pageSize = pagination?.pageSize || this.config.defaultPageSize;
      const currentPage = pagination?.page || 1;
      const totalPages = Math.ceil(totalCount / pageSize);
      
      // Apply sorting
      if (pagination?.sortBy) {
        const sortDirection = pagination.sortDirection || 'asc';
        q = query(q, orderBy(pagination.sortBy, sortDirection));
      } else {
        // Default sort by createdAt
        q = query(q, orderBy('createdAt', 'desc'));
      }
      
      // Apply pagination
      q = query(q, limit(pageSize));
      
      // If not the first page, use startAfter with the last document from the previous page
      if (currentPage > 1) {
        // This is a simplified approach. In a real app, you'd need to store the last document
        // from each page or use a cursor-based pagination approach
        const prevPageQuery = query(
          q,
          limit((currentPage - 1) * pageSize)
        );
        const prevPageSnapshot = await getDocs(prevPageQuery);
        const lastDoc = prevPageSnapshot.docs[prevPageSnapshot.docs.length - 1];
        
        if (lastDoc) {
          q = query(q, startAfter(lastDoc));
        }
      }
      
      // Get the paginated results
      const querySnapshot = await getDocs(q);
      
      // Map the documents to User objects
      const users = querySnapshot.docs.map(doc => this.mapFirestoreToUser(doc));
      
      return {
        users,
        totalCount,
        page: currentPage,
        pageSize,
        totalPages
      };
    } catch (error) {
      console.error('Error finding all users:', error);
      
      return {
        users: [],
        totalCount: 0,
        page: 1,
        pageSize: this.config.defaultPageSize,
        totalPages: 0
      };
    }
  }
  
  /**
   * Delete a user from Firestore
   */
  async delete(id: string): Promise<boolean> {
    try {
      const userRef = doc(this.firestore, this.usersCollection, id);
      await deleteDoc(userRef);
      
      return true;
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Check if a user exists by email
   */
  async existsByEmail(email: EmailAddress | string): Promise<boolean> {
    try {
      const user = await this.findByEmail(email);
      return user !== null;
    } catch (error) {
      console.error(`Error checking if user exists by email ${email}:`, error);
      return false;
    }
  }
  
  /**
   * Find users by role with pagination
   */
  async findByRole(
    role: UserRole,
    pagination?: UserPaginationOptions
  ): Promise<PaginatedUsers> {
    return this.findAll({ role }, pagination);
  }
  
  /**
   * Search users with filters and pagination
   */
  async search(
    query: string,
    filters?: UserFilterOptions,
    pagination?: UserPaginationOptions
  ): Promise<PaginatedUsers> {
    return this.findAll({ ...filters, searchTerm: query }, pagination);
  }
  
  /**
   * Count users by role
   */
  async countByRole(role: UserRole): Promise<number> {
    try {
      const usersRef = collection(this.firestore, this.usersCollection);
      const q = query(usersRef, where('role', '==', role));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.size;
    } catch (error) {
      console.error(`Error counting users by role ${role}:`, error);
      return 0;
    }
  }
  
  /**
   * Map a User entity to Firestore format
   */
  private mapUserToFirestore(user: User): DocumentData {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email.value,
      phone: user.phone?.value,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    };
  }
  
  /**
   * Map Firestore data to a User entity
   */
  private mapFirestoreToUser(doc: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>): User {
    const data = doc.data();
    
    if (!data) {
      throw new Error(`No data found for user document ${doc.id}`);
    }
    
    return new User({
      id: doc.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: new EmailAddress(data.email),
      phone: data.phone,
      role: data.role,
      isEmailVerified: data.isEmailVerified,
      isPhoneVerified: data.isPhoneVerified,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      lastLoginAt: data.lastLoginAt?.toDate()
    });
  }
}