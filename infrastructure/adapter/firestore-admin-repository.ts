/**
 * Firestore Admin Repository
 * 
 * This module implements the admin repository interface using Firestore.
 * It handles data storage and retrieval for administrator users.
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
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { IAdminRepository, AdminProfile } from '../../core/application/repositories/admin-repository.interface';

/**
 * Firestore implementation of the admin repository
 */
export class FirestoreAdminRepository implements IAdminRepository {
  private firestore = getFirestore();
  private adminCollection = 'admin_profiles';
  private adminInvitationsCollection = 'admin_invitations';
  
  /**
   * Get administrator details by ID
   */
  async getAdminById(adminId: string): Promise<AdminProfile | null> {
    try {
      console.log('Firestore admin repository: Getting admin by ID', adminId);
      const docRef = doc(this.firestore, this.adminCollection, adminId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.log('Firestore admin repository: Admin profile not found');
        return null;
      }
      
      const data = docSnap.data();
      console.log('Firestore admin repository: Admin profile found');
      return this.mapFirestoreDocToAdminProfile(adminId, data);
    } catch (error) {
      console.error('Firestore admin repository: Error fetching admin profile', error);
      return null;
    }
  }
  
  /**
   * Update the last login timestamp for an administrator
   */
  async updateLastLogin(adminId: string): Promise<void> {
    try {
      console.log('Firestore admin repository: Updating last login for admin', adminId);
      const docRef = doc(this.firestore, this.adminCollection, adminId);
      await updateDoc(docRef, {
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('Firestore admin repository: Last login updated');
    } catch (error) {
      console.error('Firestore admin repository: Error updating last login', error);
      throw error;
    }
  }
  
  /**
   * Verify an MFA code for an administrator
   */
  async verifyMfaCode(adminId: string, code: string): Promise<boolean> {
    try {
      console.log('Firestore admin repository: Verifying MFA code for admin', adminId);
      // Get the admin profile first to check the MFA secret
      const docRef = doc(this.firestore, this.adminCollection, adminId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.log('Firestore admin repository: Admin profile not found for MFA verification');
        return false;
      }
      
      const data = docSnap.data();
      
      // In a real implementation, this would validate the code against the stored secret
      // using a TOTP library like otplib or speakeasy
      
      // For demo purposes, just check if the code is 6 digits
      const isValid = code.length === 6 && /^\d+$/.test(code);
      
      if (isValid) {
        // Update the MFA verified status
        await updateDoc(docRef, {
          mfaVerified: true,
          lastMfaVerification: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('Firestore admin repository: MFA verified successfully');
      } else {
        console.log('Firestore admin repository: Invalid MFA code provided');
      }
      
      return isValid;
    } catch (error) {
      console.error('Firestore admin repository: Error verifying MFA code', error);
      return false;
    }
  }
  
  /**
   * Generate a new MFA secret for an administrator
   */
  async generateMfaSecret(adminId: string): Promise<{ qrCodeUrl: string, secret: string }> {
    try {
      console.log('Firestore admin repository: Generating MFA secret for admin', adminId);
      
      // Get the admin profile first
      const adminDoc = await this.getAdminById(adminId);
      
      if (!adminDoc) {
        console.error('Firestore admin repository: Admin profile not found for MFA setup');
        throw new Error('Admin profile not found');
      }
      
      // In a real implementation, this would generate a proper TOTP secret
      // using a library like otplib or speakeasy
      
      // For demo purposes, generate a simple random string
      const secret = this.generateRandomSecret();
      
      // Create QR code URL (in real implementation would be a proper TOTP URI)
      const qrCodeUrl = `otpauth://totp/EtoileYachts:${adminDoc.email}?secret=${secret}&issuer=EtoileYachts`;
      
      // Save the secret
      const docRef = doc(this.firestore, this.adminCollection, adminId);
      await updateDoc(docRef, {
        mfaEnabled: true,
        mfaSecret: secret,
        mfaVerified: false,
        updatedAt: serverTimestamp()
      });
      
      console.log('Firestore admin repository: MFA secret generated');
      return { qrCodeUrl, secret };
    } catch (error) {
      console.error('Firestore admin repository: Error generating MFA secret', error);
      throw error;
    }
  }
  
  /**
   * Save or update an administrator profile
   */
  async saveAdminProfile(profile: AdminProfile): Promise<void> {
    try {
      console.log('Firestore admin repository: Saving admin profile', profile.uid);
      const docRef = doc(this.firestore, this.adminCollection, profile.uid);
      
      // Check if the document already exists
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Update existing profile
        await updateDoc(docRef, {
          displayName: profile.displayName,
          adminStatus: profile.adminStatus,
          department: profile.department,
          accessLevel: profile.accessLevel,
          mfaEnabled: profile.mfaEnabled,
          updatedAt: serverTimestamp()
        });
        console.log('Firestore admin repository: Admin profile updated');
      } else {
        // Create new profile
        await setDoc(docRef, {
          email: profile.email,
          displayName: profile.displayName,
          adminStatus: profile.adminStatus,
          department: profile.department,
          accessLevel: profile.accessLevel,
          mfaEnabled: profile.mfaEnabled,
          mfaVerified: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('Firestore admin repository: Admin profile created');
      }
    } catch (error) {
      console.error('Firestore admin repository: Error saving admin profile', error);
      throw error;
    }
  }
  
  /**
   * Check if a user is a pending administrator (has been invited)
   */
  async isInvitedAdmin(email: string): Promise<boolean> {
    try {
      console.log('Firestore admin repository: Checking if email is invited admin', email);
      const q = query(
        collection(this.firestore, this.adminInvitationsCollection),
        where('email', '==', email),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(q);
      const isInvited = !querySnapshot.empty;
      console.log('Firestore admin repository: Email invited status:', isInvited);
      return isInvited;
    } catch (error) {
      console.error('Firestore admin repository: Error checking admin invitation', error);
      return false;
    }
  }
  
  /**
   * Create an administrator invitation
   */
  async createAdminInvitation(email: string, invitedBy: string): Promise<string> {
    try {
      console.log('Firestore admin repository: Creating admin invitation', email);
      
      // Check if an invitation already exists
      const q = query(
        collection(this.firestore, this.adminInvitationsCollection),
        where('email', '==', email)
      );
      
      const querySnapshot = await getDocs(q);
      
      // If an invitation exists but is not pending, update it
      if (!querySnapshot.empty) {
        const inviteDoc = querySnapshot.docs[0];
        await updateDoc(doc(this.firestore, this.adminInvitationsCollection, inviteDoc.id), {
          status: 'pending',
          invitedBy: invitedBy,
          invitedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('Firestore admin repository: Existing admin invitation updated');
        return inviteDoc.id;
      }
      
      // Create a new invitation
      const inviteData = {
        email,
        invitedBy,
        status: 'pending',
        invitedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(this.firestore, this.adminInvitationsCollection), inviteData);
      console.log('Firestore admin repository: New admin invitation created');
      return docRef.id;
    } catch (error) {
      console.error('Firestore admin repository: Error creating admin invitation', error);
      throw error;
    }
  }
  
  /**
   * Map a Firestore document to an AdminProfile entity
   */
  private mapFirestoreDocToAdminProfile(id: string, data: any): AdminProfile {
    return {
      uid: id,
      email: data.email,
      displayName: data.displayName || null,
      adminStatus: data.adminStatus || 'pending',
      department: data.department,
      accessLevel: data.accessLevel,
      mfaEnabled: data.mfaEnabled || false,
      mfaSecret: data.mfaSecret,
      mfaVerified: data.mfaVerified || false,
      lastLogin: data.lastLogin ? new Date((data.lastLogin as Timestamp).toDate()) : undefined
    };
  }
  
  /**
   * Generate a random MFA secret
   * This is a simple implementation for demo purposes
   */
  private generateRandomSecret(): string {
    // In a real implementation, use a proper TOTP library
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}