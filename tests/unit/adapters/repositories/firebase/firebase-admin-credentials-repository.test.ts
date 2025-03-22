/**
 * Unit tests for FirebaseAdminCredentialsRepository
 * 
 * These tests use mocks to simulate Firestore behavior
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { FirebaseAdminCredentialsRepository } from '../../../../../adapters/repositories/firebase/firebase-admin-credentials-repository';
import { AdminCredentials } from '../../../../../core/domain/admin/admin-credentials';
import { IAdminCredentialsRepository } from '../../../../../core/application/interfaces/repositories/admin-credentials-repository';
import { Firestore, DocumentData, CollectionReference, DocumentReference, DocumentSnapshot, QueryDocumentSnapshot, Query } from 'firebase-admin/firestore';

describe('FirebaseAdminCredentialsRepository', () => {
  // Define properly typed mocks
  let mockFirestore: jest.Mocked<Firestore>;
  let mockCollection: jest.Mocked<CollectionReference<DocumentData>>;
  let mockDoc: jest.Mocked<DocumentReference<DocumentData>>;
  let mockQuery: jest.Mocked<Query<DocumentData>>;
  let mockDocSnapshot: jest.Mocked<DocumentSnapshot<DocumentData>>;
  let mockQueryDocSnapshot: jest.Mocked<QueryDocumentSnapshot<DocumentData>>;
  let repository: FirebaseAdminCredentialsRepository;
  
  beforeEach(() => {
    // Create mock document reference
    mockDoc = {
      id: 'admin-123',
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      collection: jest.fn(),
      path: 'admin_credentials/admin-123',
      parent: null as any,
      isEqual: jest.fn(),
      withConverter: jest.fn(),
      listCollections: jest.fn(),
      create: jest.fn(),
      onSnapshot: jest.fn()
    } as unknown as jest.Mocked<DocumentReference<DocumentData>>;
    
    // Create mock document snapshot
    mockDocSnapshot = {
      exists: true,
      id: 'admin-123',
      data: jest.fn().mockReturnValue({
        id: 'admin-123',
        email: 'admin@example.com',
        passwordHash: 'hashed-password',
        passwordLastChanged: { toDate: () => new Date() },
        mfaEnabled: true,
        mfaSecret: 'mfa-secret',
        tempToken: null,
        tempTokenExpiry: null
      }),
      get: jest.fn(),
      ref: mockDoc,
      isEqual: jest.fn()
    } as unknown as jest.Mocked<DocumentSnapshot<DocumentData>>;
    
    // Create mock query document snapshot
    mockQueryDocSnapshot = {
      ...mockDocSnapshot,
      data: jest.fn().mockReturnValue({
        id: 'admin-123',
        email: 'admin@example.com',
        passwordHash: 'hashed-password',
        passwordLastChanged: { toDate: () => new Date() },
        mfaEnabled: true,
        mfaSecret: 'mfa-secret',
        tempToken: null,
        tempTokenExpiry: null
      })
    } as unknown as jest.Mocked<QueryDocumentSnapshot<DocumentData>>;
    
    // Create mock query
    mockQuery = {
      get: jest.fn().mockResolvedValue({
        empty: false,
        size: 1,
        docs: [mockQueryDocSnapshot],
        forEach: jest.fn()
      }),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
      startAt: jest.fn().mockReturnThis(),
      endBefore: jest.fn().mockReturnThis(),
      endAt: jest.fn().mockReturnThis(),
      isEqual: jest.fn(),
      stream: jest.fn(),
      onSnapshot: jest.fn(),
      withConverter: jest.fn()
    } as unknown as jest.Mocked<Query<DocumentData>>;
    
    // Create mock collection reference
    mockCollection = {
      id: 'admin_credentials',
      doc: jest.fn().mockReturnValue(mockDoc),
      get: jest.fn(),
      add: jest.fn(),
      where: jest.fn().mockReturnValue(mockQuery),
      orderBy: jest.fn().mockReturnValue(mockQuery),
      limit: jest.fn().mockReturnValue(mockQuery),
      parent: null as any,
      path: 'admin_credentials',
      isEqual: jest.fn(),
      withConverter: jest.fn(),
      listDocuments: jest.fn(),
      onSnapshot: jest.fn(),
      stream: jest.fn()
    } as unknown as jest.Mocked<CollectionReference<DocumentData>>;
    
    // Create mock Firestore
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection),
      doc: jest.fn(),
      getAll: jest.fn(),
      runTransaction: jest.fn(),
      batch: jest.fn(),
      settings: jest.fn(),
      terminate: jest.fn(),
      listCollections: jest.fn(),
      recursiveDelete: jest.fn(),
      bulkWriter: jest.fn()
    } as unknown as jest.Mocked<Firestore>;
    
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
    expect(credentials).toBeInstanceOf(AdminCredentials);
    expect(credentials?.id).toBe(userId);
  });
  
  it('should get credentials by email', async () => {
    // Arrange
    const email = 'admin@example.com';
    
    // Act
    const credentials = await repository.getCredentialsByEmail(email);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.where).toHaveBeenCalledWith('email', '==', email);
    expect(mockQuery.limit).toHaveBeenCalledWith(1);
    expect(credentials).not.toBeNull();
    expect(credentials).toBeInstanceOf(AdminCredentials);
  });
  
  it('should return null when no credentials found by email', async () => {
    // Arrange
    const email = 'nonexistent@example.com';
    
    mockQuery.get.mockResolvedValueOnce({
      empty: true,
      size: 0,
      docs: [],
      forEach: jest.fn()
    });
    
    // Act
    const credentials = await repository.getCredentialsByEmail(email);
    
    // Assert
    expect(credentials).toBeNull();
  });
  
  it('should create new credentials', async () => {
    // Arrange
    const adminId = 'admin-123';
    const email = 'admin@example.com';
    const updatedDate = new Date();
    const passwordHash = 'hashed-password';
    
    const credentials = new AdminCredentials(
      adminId,
      email,
      updatedDate,
      passwordHash
    );
    
    mockDoc.set.mockResolvedValue({} as any);
    
    // Act
    const result = await repository.createCredentials(credentials);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
      id: adminId,
      email: email,
      passwordHash: passwordHash,
      passwordLastChanged: updatedDate
    }));
    expect(result).toBe(true);
  });
  
  it('should update existing credentials', async () => {
    // Arrange
    const adminId = 'admin-123';
    const email = 'admin@example.com';
    const updatedDate = new Date();
    const passwordHash = 'updated-password-hash';
    const mfaSecret = 'updated-mfa-secret';
    
    const credentials = new AdminCredentials(
      adminId,
      email,
      updatedDate,
      passwordHash,
      mfaSecret
    );
    
    mockDoc.update.mockResolvedValue({} as any);
    
    // Act
    const result = await repository.updateCredentials(credentials);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
      email: email,
      passwordHash: passwordHash,
      mfaSecret: mfaSecret,
      passwordLastChanged: updatedDate
    }));
    expect(result).toBe(true);
  });
  
  it('should update password correctly', async () => {
    // Arrange
    const userId = 'admin-123';
    const passwordHash = 'new-password-hash';
    
    mockDoc.update.mockResolvedValue({} as any);
    
    // Act
    const result = await repository.updatePassword(userId, passwordHash);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);
    expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
      passwordHash: passwordHash,
      passwordLastChanged: expect.any(Date)
    }));
    expect(result).toBe(true);
  });
  
  it('should setup MFA correctly', async () => {
    // Arrange
    const userId = 'admin-123';
    const mfaSecret = 'new-mfa-secret';
    
    mockDoc.update.mockResolvedValue({} as any);
    
    // Act
    const result = await repository.setupMfa(userId, mfaSecret);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);
    expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
      mfaEnabled: true,
      mfaSecret: mfaSecret
    }));
    expect(result).toBe(true);
  });
  
  it('should disable MFA correctly', async () => {
    // Arrange
    const userId = 'admin-123';
    
    mockDoc.update.mockResolvedValue({} as any);
    
    // Act
    const result = await repository.disableMfa(userId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);
    expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
      mfaEnabled: false,
      mfaSecret: null
    }));
    expect(result).toBe(true);
  });
  
  it('should store temporary token correctly', async () => {
    // Arrange
    const userId = 'admin-123';
    const token = 'temp-token';
    const expiryDate = new Date();
    
    mockDoc.update.mockResolvedValue({} as any);
    
    // Act
    const result = await repository.storeTemporaryToken(userId, token, expiryDate);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);
    expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
      tempToken: token,
      tempTokenExpiry: expiryDate
    }));
    expect(result).toBe(true);
  });
  
  it('should validate temporary token correctly', async () => {
    // Arrange
    const userId = 'admin-123';
    const token = 'temp-token';
    const expiryDate = new Date(Date.now() + 3600000); // 1 hour in the future
    
    // Mock the document snapshot with a valid token
    mockDocSnapshot.data.mockReturnValueOnce({
      id: 'admin-123',
      email: 'admin@example.com',
      tempToken: token,
      tempTokenExpiry: { toDate: () => expiryDate }
    });
    
    mockDoc.get.mockResolvedValue(mockDocSnapshot);
    
    // Act
    const result = await repository.validateTemporaryToken(userId, token);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);
    expect(mockDoc.get).toHaveBeenCalled();
    expect(result).toBe(true);
  });
  
  it('should return false for expired temporary token', async () => {
    // Arrange
    const userId = 'admin-123';
    const token = 'temp-token';
    const expiryDate = new Date(Date.now() - 3600000); // 1 hour in the past
    
    // Mock the document snapshot with an expired token
    mockDocSnapshot.data.mockReturnValueOnce({
      id: 'admin-123',
      email: 'admin@example.com',
      tempToken: token,
      tempTokenExpiry: { toDate: () => expiryDate }
    });
    
    mockDoc.get.mockResolvedValue(mockDocSnapshot);
    
    // Act
    const result = await repository.validateTemporaryToken(userId, token);
    
    // Assert
    expect(result).toBe(false);
  });
  
  it('should clear temporary token correctly', async () => {
    // Arrange
    const userId = 'admin-123';
    
    mockDoc.update.mockResolvedValue({} as any);
    
    // Act
    const result = await repository.clearTemporaryToken(userId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);
    expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
      tempToken: null,
      tempTokenExpiry: null
    }));
    expect(result).toBe(true);
  });
  
  it('should delete credentials correctly', async () => {
    // Arrange
    const userId = 'admin-123';
    
    mockDoc.delete.mockResolvedValue({} as any);
    
    // Act
    const result = await repository.deleteCredentials(userId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_credentials');
    expect(mockCollection.doc).toHaveBeenCalledWith(userId);
    expect(mockDoc.delete).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});