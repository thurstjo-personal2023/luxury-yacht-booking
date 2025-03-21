/**
 * Unit tests for FirebaseAdminCredentialsRepository
 * 
 * These tests use mocks to simulate Firestore behavior
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { FirebaseAdminCredentialsRepository } from '../../../../../adapters/repositories/firebase/firebase-admin-credentials-repository';
import { AdminCredentials } from '../../../../../core/domain/admin/admin-credentials';

describe('FirebaseAdminCredentialsRepository', () => {
  let mockFirestore: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockWhere: any;
  let mockQuerySnapshot: any;
  let repository: FirebaseAdminCredentialsRepository;
  
  beforeEach(() => {
    // Create mock document reference
    mockDoc = {
      id: 'admin-123',
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    
    // Create mock query
    mockQuery = {
      get: jest.fn()
    };
    
    // Create mock where function
    mockWhere = jest.fn().mockReturnValue(mockQuery);
    
    // Create mock collection reference
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      where: mockWhere,
      add: jest.fn()
    };
    
    // Create mock Firestore
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };
    
    // Create mock query snapshot
    mockQuerySnapshot = {
      empty: false,
      docs: [],
      forEach: jest.fn()
    };
    
    // Create repository with mock Firestore
    repository = new FirebaseAdminCredentialsRepository(mockFirestore);
  });
  
  it('should find credentials by admin ID', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mockDocSnapshot = {
      exists: true,
      id: 'credentials-123',
      data: jest.fn().mockReturnValue({
        adminId,
        passwordHash: 'hashed-password',
        mfaSecret: 'mfa-secret',
        recoveryKeys: ['key1', 'key2']
      })
    };
    
    mockQuerySnapshot.empty = false;
    mockQuerySnapshot.docs = [mockDocSnapshot];
    
    mockQuery.get.mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const credentials = await repository.findByAdminId(adminId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.where).toHaveBeenCalledWith('adminId', '==', adminId);
    expect(mockQuery.get).toHaveBeenCalled();
    expect(credentials).toBeInstanceOf(AdminCredentials);
    expect(credentials?.adminId).toBe(adminId);
    expect(credentials?.passwordHash).toBe('hashed-password');
    expect(credentials?.mfaSecret).toBe('mfa-secret');
    expect(credentials?.recoveryKeys).toEqual(['key1', 'key2']);
  });
  
  it('should return null when admin ID is not found', async () => {
    // Arrange
    const adminId = 'nonexistent-admin';
    
    mockQuerySnapshot.empty = true;
    mockQuerySnapshot.docs = [];
    
    mockQuery.get.mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const credentials = await repository.findByAdminId(adminId);
    
    // Assert
    expect(credentials).toBeNull();
  });
  
  it('should create new credentials', async () => {
    // Arrange
    const adminId = 'admin-123';
    const credentials = new AdminCredentials({
      id: 'credentials-123',
      adminId,
      passwordHash: 'hashed-password'
    });
    
    mockDoc.set.mockResolvedValue({});
    
    // Act
    const createdCredentials = await repository.create(credentials);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith('credentials-123');
    expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
      adminId,
      passwordHash: 'hashed-password'
    }));
    expect(createdCredentials).toBe(credentials);
  });
  
  it('should update existing credentials', async () => {
    // Arrange
    const adminId = 'admin-123';
    const credentials = new AdminCredentials({
      id: 'credentials-123',
      adminId,
      passwordHash: 'updated-password-hash',
      mfaSecret: 'updated-mfa-secret'
    });
    
    mockDoc.update.mockResolvedValue({});
    
    // Act
    const updatedCredentials = await repository.update(credentials);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith('credentials-123');
    expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
      passwordHash: 'updated-password-hash',
      mfaSecret: 'updated-mfa-secret'
    }));
    expect(updatedCredentials).toBe(credentials);
  });
  
  it('should delete credentials', async () => {
    // Arrange
    const credentialsId = 'credentials-to-delete';
    
    mockDoc.delete.mockResolvedValue({});
    
    // Act
    await repository.delete(credentialsId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(credentialsId);
    expect(mockDoc.delete).toHaveBeenCalled();
  });
  
  it('should generate ID for new credentials without ID', async () => {
    // Arrange
    const adminId = 'admin-123';
    const credentials = new AdminCredentials({
      adminId,
      passwordHash: 'hashed-password'
    });
    
    const mockAddRef = {
      id: 'generated-id'
    };
    
    mockCollection.add.mockResolvedValue(mockAddRef);
    
    // Act
    const createdCredentials = await repository.create(credentials);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.add).toHaveBeenCalledWith(expect.objectContaining({
      adminId,
      passwordHash: 'hashed-password'
    }));
    expect(createdCredentials.id).toBe('generated-id');
  });
});