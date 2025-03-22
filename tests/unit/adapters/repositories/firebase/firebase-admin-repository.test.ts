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
import { IAdminRepository } from '../../../../../core/application/interfaces/repositories/admin-repository';
import { Permission } from '../../../../../core/domain/admin/permission';

describe('FirebaseAdminRepository', () => {
  let mockFirestore: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockWhere: any;
  let mockLimit: any;
  let mockCount: any;
  let mockQuerySnapshot: any;
  let repository: IAdminRepository;
  
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
    
    // Create test date for proper comparison
    const createdDate = new Date();
    
    // Create admin user with proper structure
    const mockAdmin = new AdminUser(
      adminId,
      'admin@example.com',
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.ACTIVE,
      createdDate,
      createdDate
    );
    
    // Setup Firestore document mock
    const mockDocSnapshot = {
      exists: true,
      id: adminId,
      data: jest.fn().mockReturnValue({
        email: 'admin@example.com',
        name: 'Test Admin',
        role: 'admin',
        permissions: [],
        status: AdminUserStatus.ACTIVE,
        mfaStatus: { type: 'disabled' },
        createdAt: Timestamp.fromDate(createdDate),
        updatedAt: Timestamp.fromDate(createdDate),
        lastLoginAt: null,
        lastLoginAttempts: [],
        whitelistedIps: []
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
    
    // Create test date for proper comparison
    const createdDate = new Date();
    
    // Setup Firestore document mock
    const mockDocSnapshot = {
      exists: true,
      id: adminId,
      data: jest.fn().mockReturnValue({
        email,
        name: 'Test Admin',
        role: 'admin',
        permissions: [],
        status: AdminUserStatus.ACTIVE,
        mfaStatus: { type: 'disabled' },
        createdAt: Timestamp.fromDate(createdDate),
        updatedAt: Timestamp.fromDate(createdDate),
        lastLoginAt: null,
        lastLoginAttempts: [],
        whitelistedIps: []
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
  
  it('should create a new admin', async () => {
    // Arrange
    const adminId = 'new-admin-123';
    const createdDate = new Date();
    
    // Create a real AdminUser instance
    const mockAdmin = new AdminUser(
      adminId,
      'newadmin@example.com',
      'New Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.PENDING_APPROVAL,
      createdDate,
      createdDate
    );
    
    mockDoc.set.mockResolvedValue({});
    
    // Act
    const result = await repository.create(mockAdmin);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.set).toHaveBeenCalled();
    expect(result).toBe(mockAdmin);
  });
  
  it('should update an existing admin', async () => {
    // Arrange
    const adminId = 'admin-123';
    const createdDate = new Date();
    const updatedDate = new Date(createdDate.getTime() + 10000);
    
    // Create a real AdminUser instance
    const mockAdmin = new AdminUser(
      adminId,
      'admin@example.com',
      'Updated Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.ACTIVE,
      createdDate,
      updatedDate
    );
    
    mockDoc.update.mockResolvedValue({});
    
    // Act
    const result = await repository.update(mockAdmin);
    
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
  
  it('should throw errors in create method', async () => {
    // Arrange
    const adminId = 'admin-123';
    const createdDate = new Date();
    
    // Create a real AdminUser instance
    const mockAdmin = new AdminUser(
      adminId,
      'admin@example.com',
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.ACTIVE,
      createdDate,
      createdDate
    );
    
    mockDoc.set.mockRejectedValue(new Error('Database error'));
    
    // Act and Assert
    await expect(repository.create(mockAdmin)).rejects.toThrow('Database error');
  });
});