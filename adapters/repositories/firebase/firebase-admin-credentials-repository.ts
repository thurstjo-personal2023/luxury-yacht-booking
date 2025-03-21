/**
 * Firebase Admin Credentials Repository
 * 
 * This class implements the IAdminCredentialsRepository interface using Firebase Firestore.
 * It handles CRUD operations for admin credentials in the Firestore database.
 */

import { Firestore, DocumentSnapshot } from 'firebase-admin/firestore';
import { AdminCredentials } from '../../../core/domain/admin/admin-credentials';
import { IAdminCredentialsRepository } from '../../../core/application/interfaces/repositories/admin-credentials-repository';

export class FirebaseAdminCredentialsRepository implements IAdminCredentialsRepository {
  private readonly collectionName = 'admin_credentials';
  
  constructor(private readonly firestore: Firestore) {}

  /**
   * Generate a unique ID for a new credentials document
   */
  generateId(): string {
    return this.firestore.collection(this.collectionName).doc().id;
  }

  /**
   * Convert a Firestore document to an AdminCredentials domain entity
   */
  private documentToAdminCredentials(doc: DocumentSnapshot): AdminCredentials | null {
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    return {
      id: doc.id,
      adminId: data.adminId,
      passwordLastChanged: data.passwordLastChanged?.toDate() || new Date(),
      mfaEnabled: data.mfaEnabled || false,
      mfaMethod: data.mfaMethod || null,
      mfaSecret: data.mfaSecret || null
    };
  }

  /**
   * Convert an AdminCredentials domain entity to a Firestore document
   */
  private adminCredentialsToDocument(credentials: AdminCredentials): Record<string, any> {
    return {
      adminId: credentials.adminId,
      passwordLastChanged: credentials.passwordLastChanged,
      mfaEnabled: credentials.mfaEnabled,
      mfaMethod: credentials.mfaMethod,
      mfaSecret: credentials.mfaSecret
    };
  }

  /**
   * Find credentials by ID
   */
  async findById(id: string): Promise<AdminCredentials | null> {
    try {
      const doc = await this.firestore.collection(this.collectionName).doc(id).get();
      return this.documentToAdminCredentials(doc);
    } catch (error) {
      console.error('Error finding credentials by ID:', error);
      return null;
    }
  }

  /**
   * Find credentials by admin ID
   */
  async findByAdminId(adminId: string): Promise<AdminCredentials | null> {
    try {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('adminId', '==', adminId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return this.documentToAdminCredentials(snapshot.docs[0]);
    } catch (error) {
      console.error('Error finding credentials by admin ID:', error);
      return null;
    }
  }

  /**
   * Save new credentials
   */
  async save(credentials: AdminCredentials): Promise<AdminCredentials> {
    try {
      const docRef = credentials.id
        ? this.firestore.collection(this.collectionName).doc(credentials.id)
        : this.firestore.collection(this.collectionName).doc();

      const id = docRef.id;
      const data = this.adminCredentialsToDocument(credentials);

      await docRef.set(data);

      return {
        ...credentials,
        id
      };
    } catch (error) {
      console.error('Error saving credentials:', error);
      throw error;
    }
  }

  /**
   * Update existing credentials
   */
  async update(credentials: AdminCredentials): Promise<AdminCredentials> {
    try {
      if (!credentials.id) {
        throw new Error('Credentials ID is required for update');
      }

      const docRef = this.firestore.collection(this.collectionName).doc(credentials.id);
      const data = this.adminCredentialsToDocument(credentials);

      await docRef.update(data);

      return credentials;
    } catch (error) {
      console.error('Error updating credentials:', error);
      throw error;
    }
  }

  /**
   * Delete credentials
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.firestore.collection(this.collectionName).doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting credentials:', error);
      return false;
    }
  }

  /**
   * Update MFA settings for an admin
   */
  async updateMfaSettings(
    adminId: string, 
    mfaEnabled: boolean, 
    mfaMethod: string | null = null, 
    mfaSecret: string | null = null
  ): Promise<boolean> {
    try {
      const credentials = await this.findByAdminId(adminId);
      
      if (!credentials) {
        return false;
      }

      credentials.mfaEnabled = mfaEnabled;
      credentials.mfaMethod = mfaMethod;
      credentials.mfaSecret = mfaSecret;

      await this.update(credentials);
      
      return true;
    } catch (error) {
      console.error('Error updating MFA settings:', error);
      return false;
    }
  }

  /**
   * Update password last changed timestamp
   */
  async updatePasswordLastChanged(adminId: string): Promise<boolean> {
    try {
      const credentials = await this.findByAdminId(adminId);
      
      if (!credentials) {
        return false;
      }

      credentials.passwordLastChanged = new Date();

      await this.update(credentials);
      
      return true;
    } catch (error) {
      console.error('Error updating password last changed:', error);
      return false;
    }
  }
}