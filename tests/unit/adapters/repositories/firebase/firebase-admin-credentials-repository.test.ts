/**
 * Unit tests for FirebaseAdminCredentialsRepository
 * 
 * These tests use mocks to simulate Firestore behavior
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { FirebaseAdminCredentialsRepository } from '../../../../../adapters/repositories/firebase/firebase-admin-credentials-repository';
import { AdminCredentials } from '../../../../../core/domain/admin/admin-credentials';
import { IAdminCredentialsRepository } from '../../../../../core/application/interfaces/repositories/admin-credentials-repository';
import { Firestore } from 'firebase-admin/firestore';

describe('FirebaseAdminCredentialsRepository', () => {
  let mockFirestore: jest.Mocked<Firestore>;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockLimit: any;
  let mockWhere: any;
  let mockQuerySnapshot: any;
  let mockDocSnapshot: any;
  let repository: IAdminCredentialsRepository;
  
  beforeEach(() => {
    // Create mock document reference
    mockDoc = {
      id: 'credentials-123',
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    
    // Create mock document snapshot
    mockDocSnapshot = {
      exists: true,
      id: 'credentials-123',
      data: jest.fn().mockReturnValue({
        adminId: 'admin-123',
        passwordLastChanged: { toDate: () => new Date() },
        mfaEnabled: true,
        mfaMethod: 'totp',
        mfaSecret: 'mfa-secret'
      })
    };
    
    // Create mock query
    mockLimit = {
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [mockDocSnapshot]
      })
    };
    
    // Create mock where function
    mockWhere = {
      limit: jest.fn().mockReturnValue(mockLimit)
    };
    
    // Create mock collection reference
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      where: jest.fn().mockReturnValue(mockWhere)
    };
    
    // Create mock Firestore
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection)
    } as unknown as jest.Mocked<Firestore>;
    
    // Create mock query snapshot
    mockQuerySnapshot = {
      empty: false,
      docs: [mockDocSnapshot],
      forEach: jest.fn()
    };
    
    // Create repository with mock Firestore
    repository = new FirebaseAdminCredentialsRepository(mockFirestore);
  });
  
  it('should get credentials by user ID', async () => {
    // Arrange
    const userId = 'admin-123';
    
    mockDoc.get.mockResolvedValue(mockDocSnapshot);
    
    // Act
    const credentials = await repository.getCredentials(userId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);
    expect(mockDoc.get).toHaveBeenCalled();
    expect(credentials).not.toBeNull();
    expect(credentials?.adminId).toBe(userId);
  });
  
  it('should get credentials by email', async () => {
    // Arrange
    const email = 'admin@example.com';
    
    mockLimit.get.mockResolvedValue({
      empty: false,
      docs: [mockDocSnapshot]
    });
    
    // Act
    const credentials = await repository.getCredentialsByEmail(email);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.where).toHaveBeenCalledWith('email', '==', email);
    expect(mockWhere.limit).toHaveBeenCalledWith(1);
    expect(credentials).not.toBeNull();
  });
  
  it('should return null when no credentials found by email', async () => {
    // Arrange
    const email = 'nonexistent@example.com';
    
    mockLimit.get.mockResolvedValue({
      empty: true,
      docs: []
    });
    
    // Act
    const credentials = await repository.getCredentialsByEmail(email);
    
    // Assert
    expect(credentials).toBeNull();
  });
  
  it('should create new credentials', async () => {
    // Arrange
    const adminId = 'admin-123';
    const credentials = new AdminCredentials(
      adminId,
      'admin@example.com',
      new Date(),
      'hashed-password'
    );
    
    mockDoc.set.mockResolvedValue({});
    
    // Act
    const createdCredentials = await repository.createCredentials(credentials);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockDoc.set).toHaveBeenCalled();
    expect(createdCredentials).toBeTruthy();
  });
  
  it('should update existing credentials', async () => {
    // Arrange
    const adminId = 'admin-123';
    const credentials = new AdminCredentials(
      adminId,
      'admin@example.com',
      new Date(),
      'updated-password-hash',
      'updated-mfa-secret'
    );
    
    mockDoc.update.mockResolvedValue({});
    
    // Act
    const updatedCredentials = await repository.updateCredentials(credentials);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockDoc.update).toHaveBeenCalled();
    expect(updatedCredentials).toBeTruthy();
  });
  
  it('should update password correctly', async () => {
    // Arrange
    const userId = 'admin-123';
    const passwordHash = 'new-password-hash';
    
    mockDoc.get.mockResolvedValue(mockDocSnapshot);
    mockDoc.update.mockResolvedValue({});
    
    // Act
    const result = await repository.updatePassword(userId, passwordHash);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);
    expect(mockDoc.update).toHaveBeenCalled();
    expect(result).toBe(true);
  });
  
  it('should setup MFA correctly', async () => {
    // Arrange
    const userId = 'admin-123';
    const mfaSecret = 'new-mfa-secret';
    
    mockDoc.get.mockResolvedValue(mockDocSnapshot);
    mockDoc.update.mockResolvedValue({});
    
    // Act
    const result = await repository.setupMfa(userId, mfaSecret);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);
    expect(mockDoc.update).toHaveBeenCalled();
    expect(result).toBe(true);
  });
  
  it('should disable MFA correctly', async () => {
    // Arrange
    const userId = 'admin-123';
    
    mockDoc.get.mockResolvedValue(mockDocSnapshot);
    mockDoc.update.mockResolvedValue({});
    
    // Act
    const result = await repository.disableMfa(userId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);
    expect(mockDoc.update).toHaveBeenCalled();
    expect(result).toBe(true);
  });
  
  it('should store temporary token correctly', async () => {
    // Arrange
    const userId = 'admin-123';
    const token = 'temp-token';
    const expiryDate = new Date();
    
    mockDoc.get.mockResolvedValue(mockDocSnapshot);
    mockDoc.update.mockResolvedValue({});
    
    // Act
    const result = await repository.storeTemporaryToken(userId, token, expiryDate);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);
    expect(mockDoc.update).toHaveBeenCalled();
    expect(result).toBe(true);
  });
  
  it('should delete credentials correctly', async () => {
    // Arrange
    const userId = 'admin-123';
    
    mockDoc.delete.mockResolvedValue({});
    
    // Act
    const result = await repository.deleteCredentials(userId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);
    expect(mockDoc.delete).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});