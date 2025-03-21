/**
 * Firebase Administrator Repository Implementation
 * 
 * Implements the IAdministratorRepository interface using Firebase Firestore.
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

import { 
  IAdministratorRepository, 
  AdministratorSearchCriteria,
  AdministratorInvitation 
} from '../interfaces/administrator-repository';
import { Administrator, AdministratorProps } from '../../../core/domain/user/administrator';
import { EmailAddress } from '../../../core/domain/value-objects/email-address';
import { PhoneNumber } from '../../../core/domain/value-objects/phone-number';
import { UserRole } from '../../../core/domain/user/user-role';
import { AdministratorApprovalStatus } from '../../../core/domain/user/administrator-approval-status';

/**
 * Firebase Administrator Repository configuration
 */
export interface FirebaseAdministratorRepositoryConfig {
  adminsCollection: string;
  invitationsCollection: string;
}

/**
 * Firebase Administrator Repository implementation
 */
export class FirebaseAdministratorRepository implements IAdministratorRepository {
  private readonly firestore: Firestore;
  private readonly config: FirebaseAdministratorRepositoryConfig;
  
  constructor(firestore: Firestore, config: FirebaseAdministratorRepositoryConfig) {
    this.firestore = firestore;
    this.config = config;
  }
  
  /**
   * Find an administrator by ID
   */
  async findById(id: string): Promise<Administrator | null> {
    try {
      const adminRef = doc(this.firestore, this.config.adminsCollection, id);
      const adminDoc = await getDoc(adminRef);
      
      if (!adminDoc.exists()) {
        return null;
      }
      
      return this.documentToAdministrator(adminDoc);
    } catch (error) {
      console.error('Error finding administrator by ID:', error);
      return null;
    }
  }
  
  /**
   * Find an administrator by email
   */
  async findByEmail(email: EmailAddress | string): Promise<Administrator | null> {
    try {
      const emailStr = email instanceof EmailAddress ? email.value : email;
      
      const adminsRef = collection(this.firestore, this.config.adminsCollection);
      const q = query(adminsRef, where('email', '==', emailStr));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return this.documentToAdministrator(querySnapshot.docs[0]);
    } catch (error) {
      console.error('Error finding administrator by email:', error);
      return null;
    }
  }
  
  /**
   * Find administrators by role
   */
  async findByRole(role: UserRole): Promise<Administrator[]> {
    try {
      const adminsRef = collection(this.firestore, this.config.adminsCollection);
      const q = query(adminsRef, where('role', '==', role));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => this.documentToAdministrator(doc));
    } catch (error) {
      console.error('Error finding administrators by role:', error);
      return [];
    }
  }
  
  /**
   * Find administrators by approval status
   */
  async findByApprovalStatus(status: AdministratorApprovalStatus): Promise<Administrator[]> {
    try {
      const adminsRef = collection(this.firestore, this.config.adminsCollection);
      const q = query(adminsRef, where('approvalStatus', '==', status));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => this.documentToAdministrator(doc));
    } catch (error) {
      console.error('Error finding administrators by approval status:', error);
      return [];
    }
  }
  
  /**
   * Find administrators by who invited them
   */
  async findByInvitedBy(invitedBy: string): Promise<Administrator[]> {
    try {
      const adminsRef = collection(this.firestore, this.config.adminsCollection);
      const q = query(adminsRef, where('invitedBy', '==', invitedBy));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => this.documentToAdministrator(doc));
    } catch (error) {
      console.error('Error finding administrators by inviter:', error);
      return [];
    }
  }
  
  /**
   * Search for administrators based on criteria
   */
  async search(criteria: AdministratorSearchCriteria): Promise<Administrator[]> {
    try {
      const adminsRef = collection(this.firestore, this.config.adminsCollection);
      let q = query(adminsRef);
      
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
      
      if (criteria.department) {
        q = query(q, where('department', '==', criteria.department));
      }
      
      if (criteria.position) {
        q = query(q, where('position', '==', criteria.position));
      }
      
      if (criteria.approvalStatus) {
        q = query(q, where('approvalStatus', '==', criteria.approvalStatus));
      }
      
      if (criteria.mfaEnabled !== undefined) {
        q = query(q, where('mfaEnabled', '==', criteria.mfaEnabled));
      }
      
      if (criteria.invitedBy) {
        q = query(q, where('invitedBy', '==', criteria.invitedBy));
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
      
      const administrators = querySnapshot.docs.map(doc => this.documentToAdministrator(doc));
      
      // Handle firstName and lastName client-side filtering
      if (criteria.firstName) {
        const firstName = criteria.firstName.toLowerCase();
        return administrators.filter(admin => 
          admin.firstName.toLowerCase().includes(firstName)
        );
      }
      
      if (criteria.lastName) {
        const lastName = criteria.lastName.toLowerCase();
        return administrators.filter(admin => 
          admin.lastName.toLowerCase().includes(lastName)
        );
      }
      
      return administrators;
    } catch (error) {
      console.error('Error searching administrators:', error);
      return [];
    }
  }
  
  /**
   * Count administrators matching criteria
   */
  async count(criteria: AdministratorSearchCriteria): Promise<number> {
    try {
      const adminsRef = collection(this.firestore, this.config.adminsCollection);
      let q = query(adminsRef);
      
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
      
      if (criteria.department) {
        q = query(q, where('department', '==', criteria.department));
      }
      
      if (criteria.position) {
        q = query(q, where('position', '==', criteria.position));
      }
      
      if (criteria.approvalStatus) {
        q = query(q, where('approvalStatus', '==', criteria.approvalStatus));
      }
      
      if (criteria.mfaEnabled !== undefined) {
        q = query(q, where('mfaEnabled', '==', criteria.mfaEnabled));
      }
      
      if (criteria.invitedBy) {
        q = query(q, where('invitedBy', '==', criteria.invitedBy));
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
        const administrators = querySnapshot.docs.map(doc => this.documentToAdministrator(doc));
        
        if (criteria.firstName) {
          const firstName = criteria.firstName.toLowerCase();
          count = administrators.filter(admin => 
            admin.firstName.toLowerCase().includes(firstName)
          ).length;
        }
        
        if (criteria.lastName) {
          const lastName = criteria.lastName.toLowerCase();
          count = administrators.filter(admin => 
            admin.lastName.toLowerCase().includes(lastName)
          ).length;
        }
      }
      
      return count;
    } catch (error) {
      console.error('Error counting administrators:', error);
      return 0;
    }
  }
  
  /**
   * Save an administrator (create or update)
   */
  async save(administrator: Administrator): Promise<Administrator> {
    try {
      const adminRef = doc(this.firestore, this.config.adminsCollection, administrator.id);
      const adminDoc = await getDoc(adminRef);
      
      if (adminDoc.exists()) {
        await this.update(administrator);
      } else {
        await this.create(administrator);
      }
      
      return administrator;
    } catch (error) {
      console.error('Error saving administrator:', error);
      throw error;
    }
  }
  
  /**
   * Create a new administrator
   */
  async create(administrator: Administrator): Promise<Administrator> {
    try {
      const adminId = administrator.id || uuidv4();
      const adminRef = doc(this.firestore, this.config.adminsCollection, adminId);
      
      const adminData = this.administratorToDocument(administrator);
      
      // Add creation timestamps
      adminData.createdAt = serverTimestamp();
      adminData.updatedAt = serverTimestamp();
      
      await setDoc(adminRef, adminData);
      
      // Get the newly created administrator
      const adminDoc = await getDoc(adminRef);
      return this.documentToAdministrator(adminDoc);
    } catch (error) {
      console.error('Error creating administrator:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing administrator
   */
  async update(administrator: Administrator): Promise<Administrator> {
    try {
      const adminRef = doc(this.firestore, this.config.adminsCollection, administrator.id);
      
      const adminData = this.administratorToDocument(administrator);
      
      // Update timestamp
      adminData.updatedAt = serverTimestamp();
      
      await updateDoc(adminRef, adminData);
      
      // Get the updated administrator
      const adminDoc = await getDoc(adminRef);
      return this.documentToAdministrator(adminDoc);
    } catch (error) {
      console.error('Error updating administrator:', error);
      throw error;
    }
  }
  
  /**
   * Delete an administrator by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const adminRef = doc(this.firestore, this.config.adminsCollection, id);
      await deleteDoc(adminRef);
      return true;
    } catch (error) {
      console.error('Error deleting administrator:', error);
      return false;
    }
  }
  
  /**
   * Create an invitation for a new administrator
   */
  async createInvitation(invitation: Omit<AdministratorInvitation, 'id'>): Promise<AdministratorInvitation> {
    try {
      const invitationId = uuidv4();
      const invitationRef = doc(this.firestore, this.config.invitationsCollection, invitationId);
      
      const invitationData = {
        ...invitation,
        id: invitationId,
        invitedAt: Timestamp.fromDate(invitation.invitedAt),
        expiresAt: Timestamp.fromDate(invitation.expiresAt),
        acceptedAt: invitation.acceptedAt ? Timestamp.fromDate(invitation.acceptedAt) : null
      };
      
      await setDoc(invitationRef, invitationData);
      
      return {
        ...invitation,
        id: invitationId
      };
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  }
  
  /**
   * Find an invitation by token
   */
  async findInvitationByToken(token: string): Promise<AdministratorInvitation | null> {
    try {
      const invitationsRef = collection(this.firestore, this.config.invitationsCollection);
      const q = query(invitationsRef, where('token', '==', token));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const invitationDoc = querySnapshot.docs[0];
      const invitationData = invitationDoc.data();
      
      return {
        id: invitationDoc.id,
        email: invitationData.email,
        token: invitationData.token,
        role: invitationData.role,
        invitedBy: invitationData.invitedBy,
        invitedAt: invitationData.invitedAt.toDate(),
        expiresAt: invitationData.expiresAt.toDate(),
        isAccepted: invitationData.isAccepted,
        acceptedAt: invitationData.acceptedAt ? invitationData.acceptedAt.toDate() : undefined
      };
    } catch (error) {
      console.error('Error finding invitation by token:', error);
      return null;
    }
  }
  
  /**
   * Find invitations by email
   */
  async findInvitationsByEmail(email: string): Promise<AdministratorInvitation[]> {
    try {
      const invitationsRef = collection(this.firestore, this.config.invitationsCollection);
      const q = query(invitationsRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        return {
          id: doc.id,
          email: data.email,
          token: data.token,
          role: data.role,
          invitedBy: data.invitedBy,
          invitedAt: data.invitedAt.toDate(),
          expiresAt: data.expiresAt.toDate(),
          isAccepted: data.isAccepted,
          acceptedAt: data.acceptedAt ? data.acceptedAt.toDate() : undefined
        };
      });
    } catch (error) {
      console.error('Error finding invitations by email:', error);
      return [];
    }
  }
  
  /**
   * Find invitations by who sent them
   */
  async findInvitationsByInviter(invitedBy: string): Promise<AdministratorInvitation[]> {
    try {
      const invitationsRef = collection(this.firestore, this.config.invitationsCollection);
      const q = query(invitationsRef, where('invitedBy', '==', invitedBy));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        return {
          id: doc.id,
          email: data.email,
          token: data.token,
          role: data.role,
          invitedBy: data.invitedBy,
          invitedAt: data.invitedAt.toDate(),
          expiresAt: data.expiresAt.toDate(),
          isAccepted: data.isAccepted,
          acceptedAt: data.acceptedAt ? data.acceptedAt.toDate() : undefined
        };
      });
    } catch (error) {
      console.error('Error finding invitations by inviter:', error);
      return [];
    }
  }
  
  /**
   * Mark an invitation as accepted
   */
  async markInvitationAsAccepted(invitationId: string): Promise<boolean> {
    try {
      const invitationRef = doc(this.firestore, this.config.invitationsCollection, invitationId);
      const invitationDoc = await getDoc(invitationRef);
      
      if (!invitationDoc.exists()) {
        return false;
      }
      
      await updateDoc(invitationRef, {
        isAccepted: true,
        acceptedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error marking invitation as accepted:', error);
      return false;
    }
  }
  
  /**
   * Delete an invitation
   */
  async deleteInvitation(invitationId: string): Promise<boolean> {
    try {
      const invitationRef = doc(this.firestore, this.config.invitationsCollection, invitationId);
      await deleteDoc(invitationRef);
      return true;
    } catch (error) {
      console.error('Error deleting invitation:', error);
      return false;
    }
  }
  
  /**
   * Approve an administrator
   */
  async approve(id: string, approvedBy: string): Promise<Administrator | null> {
    try {
      const adminRef = doc(this.firestore, this.config.adminsCollection, id);
      const adminDoc = await getDoc(adminRef);
      
      if (!adminDoc.exists()) {
        return null;
      }
      
      const admin = this.documentToAdministrator(adminDoc);
      
      // Update the administrator with approval information
      const updatedAdmin = admin.approve(approvedBy);
      
      // Save the updated administrator
      await this.update(updatedAdmin);
      
      // Get the updated administrator
      const updatedAdminDoc = await getDoc(adminRef);
      return this.documentToAdministrator(updatedAdminDoc);
    } catch (error) {
      console.error('Error approving administrator:', error);
      return null;
    }
  }
  
  /**
   * Reject an administrator
   */
  async reject(id: string, rejectedBy: string, reason: string): Promise<Administrator | null> {
    try {
      const adminRef = doc(this.firestore, this.config.adminsCollection, id);
      const adminDoc = await getDoc(adminRef);
      
      if (!adminDoc.exists()) {
        return null;
      }
      
      const admin = this.documentToAdministrator(adminDoc);
      
      // Update the administrator with rejection information
      const updatedAdmin = admin.reject(rejectedBy, reason);
      
      // Save the updated administrator
      await this.update(updatedAdmin);
      
      // Get the updated administrator
      const updatedAdminDoc = await getDoc(adminRef);
      return this.documentToAdministrator(updatedAdminDoc);
    } catch (error) {
      console.error('Error rejecting administrator:', error);
      return null;
    }
  }
  
  /**
   * Update administrator activity
   */
  async updateActivity(id: string): Promise<Administrator | null> {
    try {
      const adminRef = doc(this.firestore, this.config.adminsCollection, id);
      const adminDoc = await getDoc(adminRef);
      
      if (!adminDoc.exists()) {
        return null;
      }
      
      const admin = this.documentToAdministrator(adminDoc);
      
      // Update the administrator with new activity timestamp
      const updatedAdmin = admin.updateActivity();
      
      // Save the updated administrator
      await this.update(updatedAdmin);
      
      // Get the updated administrator
      const updatedAdminDoc = await getDoc(adminRef);
      return this.documentToAdministrator(updatedAdminDoc);
    } catch (error) {
      console.error('Error updating administrator activity:', error);
      return null;
    }
  }
  
  /**
   * Convert a Firestore document to an Administrator entity
   */
  private documentToAdministrator(doc: DocumentSnapshot | QueryDocumentSnapshot): Administrator {
    const data = doc.data();
    
    if (!data) {
      throw new Error(`Administrator document ${doc.id} does not exist`);
    }
    
    const props: AdministratorProps = {
      id: doc.id,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: new EmailAddress(data.email),
      phone: data.phone ? new PhoneNumber(data.phone) : undefined,
      role: data.role as UserRole,
      employeeId: data.employeeId,
      department: data.department,
      position: data.position,
      approvalStatus: data.approvalStatus as AdministratorApprovalStatus,
      approvedBy: data.approvedBy,
      approvalDate: data.approvalDate?.toDate(),
      rejectionReason: data.rejectionReason,
      lastActivityAt: data.lastActivityAt?.toDate(),
      mfaEnabled: data.mfaEnabled || false,
      mfaSecret: data.mfaSecret,
      ipWhitelist: data.ipWhitelist || [],
      isEmailVerified: data.isEmailVerified || false,
      isPhoneVerified: data.isPhoneVerified || false,
      invitationId: data.invitationId,
      invitedBy: data.invitedBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
    
    return new Administrator(props);
  }
  
  /**
   * Convert an Administrator entity to a Firestore document
   */
  private administratorToDocument(administrator: Administrator): Record<string, any> {
    return {
      firstName: administrator.firstName,
      lastName: administrator.lastName,
      email: administrator.email.value,
      phone: administrator.phone?.value,
      role: administrator.role,
      employeeId: administrator.employeeId,
      department: administrator.department,
      position: administrator.position,
      approvalStatus: administrator.approvalStatus,
      approvedBy: administrator.approvedBy,
      approvalDate: administrator.approvalDate ? Timestamp.fromDate(administrator.approvalDate) : null,
      rejectionReason: administrator.rejectionReason,
      lastActivityAt: administrator.lastActivityAt ? Timestamp.fromDate(administrator.lastActivityAt) : null,
      mfaEnabled: administrator.mfaEnabled,
      mfaSecret: administrator.mfaSecret,
      ipWhitelist: administrator.ipWhitelist,
      isEmailVerified: administrator.isEmailVerified,
      isPhoneVerified: administrator.isPhoneVerified,
      invitationId: administrator.invitationId,
      invitedBy: administrator.invitedBy,
      updatedAt: Timestamp.fromDate(administrator.updatedAt)
    };
  }
}