/**
 * Firebase Admin Invitation Repository
 * 
 * This class implements the IAdminInvitationRepository interface using Firebase Firestore.
 * It handles CRUD operations for admin invitations in the Firestore database.
 */

import { Firestore, DocumentSnapshot } from 'firebase-admin/firestore';
import { AdminInvitation } from '../../../core/domain/admin/admin-invitation';
import { AdminRole } from '../../../core/domain/admin/admin-role';
import { IAdminInvitationRepository } from '../../../core/application/interfaces/repositories/admin-invitation-repository';

export class FirebaseAdminInvitationRepository implements IAdminInvitationRepository {
  private readonly collectionName = 'admin_invitations';
  
  constructor(private readonly firestore: Firestore) {}

  /**
   * Convert a Firestore document to an AdminInvitation domain entity
   */
  private documentToAdminInvitation(doc: DocumentSnapshot): AdminInvitation | null {
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    return {
      id: doc.id,
      email: data.email,
      name: data.name,
      role: data.role as AdminRole,
      code: data.code,
      invitedBy: data.invitedBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      expiresAt: data.expiresAt?.toDate() || null,
      used: data.used || false,
      usedAt: data.usedAt?.toDate() || null
    };
  }

  /**
   * Convert an AdminInvitation domain entity to a Firestore document
   */
  private adminInvitationToDocument(invitation: AdminInvitation): Record<string, any> {
    return {
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      code: invitation.code,
      invitedBy: invitation.invitedBy,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      used: invitation.used,
      usedAt: invitation.usedAt
    };
  }

  /**
   * Find an invitation by ID
   */
  async findById(id: string): Promise<AdminInvitation | null> {
    try {
      const doc = await this.firestore.collection(this.collectionName).doc(id).get();
      return this.documentToAdminInvitation(doc);
    } catch (error) {
      console.error('Error finding invitation by ID:', error);
      return null;
    }
  }

  /**
   * Find an invitation by email
   */
  async findByEmail(email: string): Promise<AdminInvitation | null> {
    try {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('email', '==', email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return this.documentToAdminInvitation(snapshot.docs[0]);
    } catch (error) {
      console.error('Error finding invitation by email:', error);
      return null;
    }
  }

  /**
   * Find an invitation by code
   */
  async findByCode(code: string): Promise<AdminInvitation | null> {
    try {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('code', '==', code)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return this.documentToAdminInvitation(snapshot.docs[0]);
    } catch (error) {
      console.error('Error finding invitation by code:', error);
      return null;
    }
  }

  /**
   * Save a new invitation
   */
  async save(invitation: AdminInvitation): Promise<AdminInvitation> {
    try {
      const docRef = invitation.id
        ? this.firestore.collection(this.collectionName).doc(invitation.id)
        : this.firestore.collection(this.collectionName).doc();

      const id = docRef.id;
      const data = this.adminInvitationToDocument(invitation);

      await docRef.set(data);

      return {
        ...invitation,
        id
      };
    } catch (error) {
      console.error('Error saving invitation:', error);
      throw error;
    }
  }

  /**
   * Update an existing invitation
   */
  async update(invitation: AdminInvitation): Promise<AdminInvitation> {
    try {
      if (!invitation.id) {
        throw new Error('Invitation ID is required for update');
      }

      const docRef = this.firestore.collection(this.collectionName).doc(invitation.id);
      const data = this.adminInvitationToDocument(invitation);

      await docRef.update(data);

      return invitation;
    } catch (error) {
      console.error('Error updating invitation:', error);
      throw error;
    }
  }

  /**
   * Delete an invitation
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.firestore.collection(this.collectionName).doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting invitation:', error);
      return false;
    }
  }

  /**
   * Find all invitations
   */
  async findAll(): Promise<AdminInvitation[]> {
    try {
      const snapshot = await this.firestore.collection(this.collectionName).get();
      return snapshot.docs
        .map(doc => this.documentToAdminInvitation(doc))
        .filter((invitation): invitation is AdminInvitation => invitation !== null);
    } catch (error) {
      console.error('Error finding all invitations:', error);
      return [];
    }
  }

  /**
   * Find active (unused and not expired) invitations
   */
  async findActive(): Promise<AdminInvitation[]> {
    try {
      const now = new Date();
      
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('used', '==', false)
        .where('expiresAt', '>', now)
        .get();

      return snapshot.docs
        .map(doc => this.documentToAdminInvitation(doc))
        .filter((invitation): invitation is AdminInvitation => invitation !== null);
    } catch (error) {
      console.error('Error finding active invitations:', error);
      return [];
    }
  }

  /**
   * Find invitations by role
   */
  async findByRole(role: AdminRole): Promise<AdminInvitation[]> {
    try {
      const snapshot = await this.firestore
        .collection(this.collectionName)
        .where('role', '==', role)
        .get();

      return snapshot.docs
        .map(doc => this.documentToAdminInvitation(doc))
        .filter((invitation): invitation is AdminInvitation => invitation !== null);
    } catch (error) {
      console.error('Error finding invitations by role:', error);
      return [];
    }
  }

  /**
   * Mark an invitation as used
   */
  async markAsUsed(id: string): Promise<boolean> {
    try {
      const invitation = await this.findById(id);
      if (!invitation) {
        return false;
      }

      invitation.used = true;
      invitation.usedAt = new Date();

      await this.update(invitation);
      
      return true;
    } catch (error) {
      console.error('Error marking invitation as used:', error);
      return false;
    }
  }
}