/**
 * Mock Admin Credentials Repository
 * 
 * This class provides a mock implementation of the IAdminCredentialsRepository interface
 * for testing admin authentication use cases without requiring a real database.
 */

import { BaseMockRepository } from '../base-mock-repository';
import { IAdminCredentialsRepository } from '../../../../core/application/ports/repositories/admin-credentials-repository';
import { AdminCredentials } from '../../../../core/domain/admin/admin-credentials';
import { MfaStatus } from '../../../../core/domain/admin/mfa-status';

export class MockAdminCredentialsRepository extends BaseMockRepository implements IAdminCredentialsRepository {
  // In-memory storage for admin credentials
  private credentials: Map<string, AdminCredentials> = new Map();
  private emailToIdMap: Map<string, string> = new Map();
  private temporaryTokens: Map<string, { token: string; expiry: Date; }> = new Map();
  
  /**
   * Get admin credentials by admin ID
   * @param adminId Admin ID
   */
  async getById(adminId: string): Promise<AdminCredentials | null> {
    return this.executeMethod<AdminCredentials | null>('getById', [adminId], () => {
      return this.credentials.has(adminId) ? this.credentials.get(adminId) || null : null;
    });
  }
  
  /**
   * Get admin credentials by email
   * @param email Admin email
   */
  async getByEmail(email: string): Promise<AdminCredentials | null> {
    return this.executeMethod<AdminCredentials | null>('getByEmail', [email], () => {
      const adminId = this.emailToIdMap.get(email);
      if (!adminId) return null;
      
      return this.credentials.get(adminId) || null;
    });
  }
  
  /**
   * Create admin credentials
   * @param credentials Admin credentials to create
   */
  async create(credentials: AdminCredentials): Promise<boolean> {
    return this.executeMethod<boolean>('create', [credentials], () => {
      this.credentials.set(credentials.adminId, credentials);
      this.emailToIdMap.set(credentials.email, credentials.adminId);
      return true;
    });
  }
  
  /**
   * Update admin credentials
   * @param adminId Admin ID
   * @param credentials Updated credentials data
   */
  async update(adminId: string, credentials: Partial<AdminCredentials>): Promise<boolean> {
    return this.executeMethod<boolean>('update', [adminId, credentials], () => {
      if (!this.credentials.has(adminId)) {
        return false;
      }
      
      const existingCreds = this.credentials.get(adminId);
      if (!existingCreds) return false;
      
      // If email is being updated, update the map
      if (credentials.email && credentials.email !== existingCreds.email) {
        this.emailToIdMap.delete(existingCreds.email);
        this.emailToIdMap.set(credentials.email, adminId);
      }
      
      this.credentials.set(adminId, { ...existingCreds, ...credentials });
      return true;
    });
  }
  
  /**
   * Delete admin credentials
   * @param adminId Admin ID
   */
  async delete(adminId: string): Promise<boolean> {
    return this.executeMethod<boolean>('delete', [adminId], () => {
      const credentials = this.credentials.get(adminId);
      if (credentials) {
        this.emailToIdMap.delete(credentials.email);
      }
      
      return this.credentials.delete(adminId);
    });
  }
  
  /**
   * Update admin password hash
   * @param adminId Admin ID
   * @param passwordHash New password hash
   */
  async updatePasswordHash(adminId: string, passwordHash: string): Promise<boolean> {
    return this.executeMethod<boolean>('updatePasswordHash', [adminId, passwordHash], () => {
      if (!this.credentials.has(adminId)) {
        return false;
      }
      
      const existingCreds = this.credentials.get(adminId);
      if (!existingCreds) return false;
      
      this.credentials.set(adminId, { ...existingCreds, passwordHash });
      return true;
    });
  }
  
  /**
   * Set up MFA for an admin
   * @param adminId Admin ID
   * @param secretKey MFA secret key
   * @param backupCodes Backup codes for MFA
   */
  async setupMfa(adminId: string, secretKey: string, backupCodes: string[]): Promise<boolean> {
    return this.executeMethod<boolean>(
      'setupMfa', 
      [adminId, secretKey, backupCodes], 
      () => {
        if (!this.credentials.has(adminId)) {
          return false;
        }
        
        const existingCreds = this.credentials.get(adminId);
        if (!existingCreds) return false;
        
        this.credentials.set(adminId, { 
          ...existingCreds, 
          mfaSecretKey: secretKey,
          mfaBackupCodes: backupCodes,
          mfaStatus: MfaStatus.ENABLED
        });
        
        return true;
      }
    );
  }
  
  /**
   * Disable MFA for an admin
   * @param adminId Admin ID
   */
  async disableMfa(adminId: string): Promise<boolean> {
    return this.executeMethod<boolean>('disableMfa', [adminId], () => {
      if (!this.credentials.has(adminId)) {
        return false;
      }
      
      const existingCreds = this.credentials.get(adminId);
      if (!existingCreds) return false;
      
      this.credentials.set(adminId, { 
        ...existingCreds, 
        mfaSecretKey: null,
        mfaBackupCodes: [],
        mfaStatus: MfaStatus.DISABLED
      });
      
      return true;
    });
  }
  
  /**
   * Store a temporary token
   * @param adminId Admin ID
   * @param token Token
   * @param expiryMinutes Expiry time in minutes
   */
  async storeTemporaryToken(
    adminId: string, 
    token: string, 
    expiryMinutes: number = 15
  ): Promise<boolean> {
    return this.executeMethod<boolean>(
      'storeTemporaryToken', 
      [adminId, token, expiryMinutes], 
      () => {
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + expiryMinutes);
        
        this.temporaryTokens.set(adminId, { token, expiry });
        return true;
      }
    );
  }
  
  /**
   * Validate a temporary token
   * @param adminId Admin ID
   * @param token Token to validate
   */
  async validateTemporaryToken(adminId: string, token: string): Promise<boolean> {
    return this.executeMethod<boolean>(
      'validateTemporaryToken', 
      [adminId, token], 
      () => {
        const storedInfo = this.temporaryTokens.get(adminId);
        
        if (!storedInfo) {
          return false;
        }
        
        const now = new Date();
        if (now > storedInfo.expiry) {
          // Token expired
          return false;
        }
        
        return storedInfo.token === token;
      }
    );
  }
  
  /**
   * Clear a temporary token
   * @param adminId Admin ID
   */
  async clearTemporaryToken(adminId: string): Promise<boolean> {
    return this.executeMethod<boolean>('clearTemporaryToken', [adminId], () => {
      return this.temporaryTokens.delete(adminId);
    });
  }
  
  /**
   * Set mock admin credentials for testing
   * @param credentialsList Array of admin credentials to use as mock data
   */
  setMockCredentials(credentialsList: AdminCredentials[]): void {
    this.credentials.clear();
    this.emailToIdMap.clear();
    
    for (const creds of credentialsList) {
      this.credentials.set(creds.adminId, creds);
      this.emailToIdMap.set(creds.email, creds.adminId);
    }
  }
  
  /**
   * Set mock temporary tokens for testing
   * @param tokens Map of admin ID to token info
   */
  setMockTemporaryTokens(tokens: Map<string, { token: string; expiry: Date; }>): void {
    this.temporaryTokens.clear();
    
    for (const [adminId, tokenInfo] of tokens.entries()) {
      this.temporaryTokens.set(adminId, tokenInfo);
    }
  }
  
  /**
   * Clear all mock data
   */
  clearMockData(): void {
    this.credentials.clear();
    this.emailToIdMap.clear();
    this.temporaryTokens.clear();
  }
}