/**
 * Firebase Admin Repository
 * 
 * This class implements the IAdminRepository interface using Firebase Firestore.
 * It handles CRUD operations for admin users in the Firestore database.
 */

import { Firestore, DocumentSnapshot } from 'firebase-admin/firestore';
import { AdminUser } from '../../../core/domain/admin/admin-user';
import { AdminRole } from '../../../core/domain/admin/admin-role';
import { MfaStatus } from '../../../core/domain/admin/mfa-status';
import { IAdminRepository } from '../../../core/application/interfaces/repositories/admin-repository';

export class FirebaseAdminRepository implements IAdminRepository {
  private readonly collectionName = 'admin_users';
  
  constructor(private readonly firestore: Firestore) {}

  /**
   * Convert a Firestore document to an AdminUser domain entity
   */
  private documentToAdminUser(doc: DocumentSnapshot): AdminUser | null {
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    return {
      id: doc.id,
      authId: data.authId || doc.id,
      email: data.email,
      name: data.name,
      phoneNumber: data.phoneNumber,
      role: data.role as AdminRole,
      status: data.status,
      mfaStatus: data.mfaStatus as MfaStatus || MfaStatus.DISABLED,
      createdAt: data.createdAt?.toDate() || new Date(),
      lastLoginAt: data.lastLoginAt?.toDate() || null,
      createdBy: data.createdBy
    };
  }

  /**
   * Convert an AdminUser domain entity to a Firestore document
   */
  private adminUserToDocument(admin: AdminUser): Record<string, any> {
    return {
      authId: admin.authId,
      email: admin.email,
      name: admin.name,
      phoneNumber: admin.phoneNumber,
      role: admin.role,
      status: admin.status,
      mfaStatus: admin.mfaStatus,
      createdAt: admin.createdAt,
      lastLoginAt: admin.lastLoginAt,
      createdBy: admin.createdBy
    };
  }

  /**
   * Find an admin user by ID
   */
  async findById(id: string): Promise<AdminUser | null> {
    try {
      const doc = await this.firestore.collection(this.collectionName).doc(id).get();
      return this.documentToAdminUser(doc);
    } catch (error) {
      console.error('Error finding admin by ID:', error);
      return null;
    }
  }

  /**
   * Find an admin user by authentication ID
   */
  async findByAuthId(authId: string): Promise<AdminUser | null> {
    try {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('authId', '==', authId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return this.documentToAdminUser(snapshot.docs[0]);
    } catch (error) {
      console.error('Error finding admin by auth ID:', error);
      return null;
    }
  }

  /**
   * Find an admin user by email
   */
  async findByEmail(email: string): Promise<AdminUser | null> {
    try {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('email', '==', email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return this.documentToAdminUser(snapshot.docs[0]);
    } catch (error) {
      console.error('Error finding admin by email:', error);
      return null;
    }
  }

  /**
   * Save a new admin user
   */
  async save(admin: AdminUser): Promise<AdminUser> {
    try {
      const docRef = admin.id
        ? this.firestore.collection(this.collectionName).doc(admin.id)
        : this.firestore.collection(this.collectionName).doc();

      const id = docRef.id;
      const data = this.adminUserToDocument(admin);

      await docRef.set(data);

      return {
        ...admin,
        id
      };
    } catch (error) {
      console.error('Error saving admin:', error);
      throw error;
    }
  }

  /**
   * Update an existing admin user
   */
  async update(admin: AdminUser): Promise<AdminUser> {
    try {
      if (!admin.id) {
        throw new Error('Admin ID is required for update');
      }

      const docRef = this.firestore.collection(this.collectionName).doc(admin.id);
      const data = this.adminUserToDocument(admin);

      await docRef.update(data);

      return admin;
    } catch (error) {
      console.error('Error updating admin:', error);
      throw error;
    }
  }

  /**
   * Delete an admin user
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.firestore.collection(this.collectionName).doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting admin:', error);
      return false;
    }
  }

  /**
   * Find all admin users
   */
  async findAll(): Promise<AdminUser[]> {
    try {
      const snapshot = await this.firestore.collection(this.collectionName).get();
      return snapshot.docs
        .map(doc => this.documentToAdminUser(doc))
        .filter((admin): admin is AdminUser => admin !== null);
    } catch (error) {
      console.error('Error finding all admins:', error);
      return [];
    }
  }

  /**
   * Find admin users by status
   */
  async findByStatus(status: string): Promise<AdminUser[]> {
    try {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('status', '==', status)
        .get();

      return snapshot.docs
        .map(doc => this.documentToAdminUser(doc))
        .filter((admin): admin is AdminUser => admin !== null);
    } catch (error) {
      console.error('Error finding admins by status:', error);
      return [];
    }
  }

  /**
   * Find admin users by role
   */
  async findByRole(role: AdminRole): Promise<AdminUser[]> {
    try {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('role', '==', role)
        .get();

      return snapshot.docs
        .map(doc => this.documentToAdminUser(doc))
        .filter((admin): admin is AdminUser => admin !== null);
    } catch (error) {
      console.error('Error finding admins by role:', error);
      return [];
    }
  }

  /**
   * Count admin users
   */
  async count(): Promise<number> {
    try {
      const snapshot = await this.firestore.collection(this.collectionName).count().get();
      return snapshot.data().count;
    } catch (error) {
      console.error('Error counting admins:', error);
      return 0;
    }
  }
}