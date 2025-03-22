/**
 * Unit tests for FirebaseAdminRepository
 * 
 * These tests use mocks to simulate Firestore behavior
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { FirebaseAdminRepository } from '../../../../../adapters/repositories/firebase/firebase-admin-repository';
import { AdminUser, AdminUserStatus } from '../../../../../core/domain/admin/admin-user';
import { AdminRole, AdminRoleType } from '../../../../../core/domain/admin/admin-role';
import { MfaStatus, MfaStatusType } from '../../../../../core/domain/admin/mfa-status';
import { Timestamp } from 'firebase-admin/firestore';

describe('FirebaseAdminRepository', () => {
  let mockFirestore: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockWhere: any;
  let mockLimit: any;
  let mockCount: any;
  let mockQuerySnapshot: any;
  let mockCountSnapshot: any;
  let repository: FirebaseAdminRepository;
  
  beforeEach(() => {
    // Create mock document reference
    mockDoc = {
      id: 'admin-123',
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    
    // Create mock query functions
    mockLimit = jest.fn().mockReturnValue(mockQuery);
    mockWhere = jest.fn().mockReturnValue(mockQuery);
    
    // Create mock count function
    mockCount = jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({
        data: jest.fn().mockReturnValue({ count: 5 })
      })
    });
    
    // Create mock query with chainable methods
    mockQuery = {
      get: jest.fn(),
      where: mockWhere,
      limit: mockLimit,
    };
    
    // Create mock collection reference
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      where: mockWhere,
      get: jest.fn(),
      count: mockCount
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
    repository = new FirebaseAdminRepository(mockFirestore);
  });
  
  it('should find admin by ID', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mockDocSnapshot = {
      exists: true,
      id: adminId,
      data: jest.fn().mockReturnValue({
        authId: adminId,
        email: 'admin@example.com',
        name: 'Test Admin',
        role: 'admin',
        status: AdminUserStatus.ACTIVE,
        phoneNumber: '+1234567890',
        createdAt: Timestamp.fromDate(new Date()),
        lastLoginAt: null,
        mfaStatus: { type: 'disabled' }
      })
    };
    
    mockDoc.get.mockResolvedValue(mockDocSnapshot);
    
    // Act
    const admin = await repository.findById(adminId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.get).toHaveBeenCalled();
    expect(admin).not.toBeNull();
    expect(admin?.id).toBe(adminId);
    expect(admin?.email).toBe('admin@example.com');
    expect(admin?.name).toBe('Test Admin');
  });
  
  it('should return null when admin ID is not found', async () => {
    // Arrange
    const adminId = 'nonexistent-admin';
    const mockDocSnapshot = {
      exists: false
    };
    
    mockDoc.get.mockResolvedValue(mockDocSnapshot);
    
    // Act
    const admin = await repository.findById(adminId);
    
    // Assert
    expect(admin).toBeNull();
  });
  
  it('should find admin by email', async () => {
    // Arrange
    const email = 'admin@example.com';
    const adminId = 'admin-123';
    
    const mockDocSnapshot = {
      exists: true,
      id: adminId,
      data: jest.fn().mockReturnValue({
        authId: adminId,
        email,
        name: 'Test Admin',
        role: 'admin',
        status: AdminUserStatus.ACTIVE,
        phoneNumber: '+1234567890',
        createdAt: Timestamp.fromDate(new Date()),
        lastLoginAt: null,
        mfaStatus: { type: 'disabled' }
      })
    };
    
    mockQuerySnapshot.empty = false;
    mockQuerySnapshot.docs = [mockDocSnapshot];
    
    mockQuery.get.mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const admin = await repository.findByEmail(email);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.where).toHaveBeenCalledWith('email', '==', email);
    expect(mockQuery.get).toHaveBeenCalled();
    expect(admin).not.toBeNull();
    expect(admin?.id).toBe(adminId);
    expect(admin?.email).toBe(email);
  });
  
  it('should return null when admin email is not found', async () => {
    // Arrange
    const email = 'nonexistent@example.com';
    
    mockQuerySnapshot.empty = true;
    mockQuerySnapshot.docs = [];
    
    mockQuery.get.mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const admin = await repository.findByEmail(email);
    
    // Assert
    expect(admin).toBeNull();
  });
  
  it('should save a new admin', async () => {
    // Arrange
    const adminId = 'new-admin-123';
    const mockAdmin = {
      id: adminId,
      authId: adminId,
      email: 'newadmin@example.com',
      name: 'New Admin',
      role: AdminRoleType.ADMIN,
      status: AdminUserStatus.PENDING_APPROVAL,
      phoneNumber: '+1234567890',
      createdAt: new Date(),
      lastLoginAt: null,
      mfaStatus: MfaStatusType.DISABLED
    };
    
    mockDoc.set.mockResolvedValue({});
    
    // Act
    const result = await repository.save(mockAdmin as any);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.set).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      id: adminId
    }));
  });
  
  it('should update an existing admin', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mockAdmin = {
      id: adminId,
      authId: adminId,
      email: 'admin@example.com',
      name: 'Updated Admin',
      role: AdminRoleType.ADMIN,
      status: AdminUserStatus.ACTIVE,
      phoneNumber: '+9876543210',
      createdAt: new Date(),
      lastLoginAt: null,
      mfaStatus: MfaStatusType.DISABLED
    };
    
    mockDoc.update.mockResolvedValue({});
    
    // Act
    const result = await repository.update(mockAdmin as any);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.update).toHaveBeenCalled();
    expect(result).toBe(mockAdmin);
  });
  
  it('should delete an admin', async () => {
    // Arrange
    const adminId = 'admin-to-delete';
    
    mockDoc.delete.mockResolvedValue({});
    
    // Act
    const result = await repository.delete(adminId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.delete).toHaveBeenCalled();
    expect(result).toBe(true);
  });
  
  it('should find all admins', async () => {
    // Arrange
    const mockDocSnapshot1 = {
      id: 'admin-1',
      data: jest.fn().mockReturnValue({
        authId: 'admin-1',
        email: 'admin1@example.com',
        name: 'Admin 1',
        role: 'admin',
        status: AdminUserStatus.ACTIVE,
        createdAt: Timestamp.fromDate(new Date()),
        mfaStatus: { type: 'disabled' }
      })
    };
    
    const mockDocSnapshot2 = {
      id: 'admin-2',
      data: jest.fn().mockReturnValue({
        authId: 'admin-2',
        email: 'admin2@example.com',
        name: 'Admin 2',
        role: 'moderator',
        status: AdminUserStatus.ACTIVE,
        createdAt: Timestamp.fromDate(new Date()),
        mfaStatus: { type: 'enabled' }
      })
    };
    
    mockQuerySnapshot.docs = [mockDocSnapshot1, mockDocSnapshot2];
    
    mockCollection.get.mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const admins = await repository.findAll();
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.get).toHaveBeenCalled();
    expect(admins).toHaveLength(2);
    expect(admins[0].id).toBe('admin-1');
    expect(admins[1].id).toBe('admin-2');
  });
  
  it('should find admins by status', async () => {
    // Arrange
    const mockDocSnapshot = {
      id: 'pending-admin',
      data: jest.fn().mockReturnValue({
        authId: 'pending-admin',
        email: 'pending@example.com',
        name: 'Pending Admin',
        role: 'admin',
        status: AdminUserStatus.PENDING_APPROVAL,
        createdAt: Timestamp.fromDate(new Date()),
        mfaStatus: { type: 'disabled' }
      })
    };
    
    mockQuerySnapshot.docs = [mockDocSnapshot];
    
    mockQuery.get.mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const admins = await repository.findByStatus(AdminUserStatus.PENDING_APPROVAL);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.where).toHaveBeenCalledWith('status', '==', AdminUserStatus.PENDING_APPROVAL);
    expect(mockQuery.get).toHaveBeenCalled();
    expect(admins).toHaveLength(1);
    expect(admins[0].status).toBe(AdminUserStatus.PENDING_APPROVAL);
  });
  
  it('should find admins by role', async () => {
    // Arrange
    const mockDocSnapshot = {
      id: 'admin-user',
      data: jest.fn().mockReturnValue({
        authId: 'admin-user',
        email: 'admin@example.com',
        name: 'Admin User',
        role: AdminRoleType.ADMIN,
        status: AdminUserStatus.ACTIVE,
        createdAt: Timestamp.fromDate(new Date()),
        mfaStatus: { type: 'enabled' }
      })
    };
    
    mockQuerySnapshot.docs = [mockDocSnapshot];
    
    mockQuery.get.mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const admins = await repository.findByRole(AdminRoleType.ADMIN as any);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.where).toHaveBeenCalledWith('role', '==', AdminRoleType.ADMIN);
    expect(mockQuery.get).toHaveBeenCalled();
    expect(admins).toHaveLength(1);
    expect(admins[0].role).toBe(AdminRoleType.ADMIN);
  });
  
  it('should count all admins', async () => {
    // Act
    const count = await repository.count();
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.count).toHaveBeenCalled();
    expect(count).toBe(5);
  });
  
  it('should handle errors in findById method', async () => {
    // Arrange
    mockDoc.get.mockRejectedValue(new Error('Database error'));
    
    // Act
    const result = await repository.findById('admin-123');
    
    // Assert
    expect(result).toBeNull();
  });
  
  it('should handle errors in findByEmail method', async () => {
    // Arrange
    mockQuery.get.mockRejectedValue(new Error('Database error'));
    
    // Act
    const result = await repository.findByEmail('admin@example.com');
    
    // Assert
    expect(result).toBeNull();
  });
  
  it('should throw errors in save method', async () => {
    // Arrange
    mockDoc.set.mockRejectedValue(new Error('Database error'));
    
    // Act and Assert
    await expect(repository.save({ id: 'admin-123' } as any)).rejects.toThrow('Database error');
  });
});