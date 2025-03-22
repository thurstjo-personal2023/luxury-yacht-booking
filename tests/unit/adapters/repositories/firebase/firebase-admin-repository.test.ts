/**
 * Unit tests for FirebaseAdminRepository
 * 
 * These tests use mocks to simulate Firestore behavior
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { FirebaseAdminRepository } from '../../../../../adapters/repositories/firebase/firebase-admin-repository';
import { AdminUser, AdminUserStatus } from '../../../../../core/domain/admin/admin-user';
import { AdminRole, AdminRoleType } from '../../../../../core/domain/admin/admin-role';
import { Permission } from '../../../../../core/domain/admin/permission';
import { MfaStatus, MfaStatusType } from '../../../../../core/domain/admin/mfa-status';
import { Timestamp } from 'firebase-admin/firestore';
import { IAdminRepository, AdminSearchOptions, AdminSearchResult } from '../../../../../core/application/interfaces/repositories/admin-repository';

describe('FirebaseAdminRepository', () => {
  let mockFirestore: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockWhere: any;
  let mockLimit: any;
  let mockOrderBy: any;
  let mockOffset: any;
  let mockQuerySnapshot: any;
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
    mockOrderBy = jest.fn().mockReturnValue(mockQuery);
    mockOffset = jest.fn().mockReturnValue(mockQuery);
    mockWhere = jest.fn().mockReturnValue(mockQuery);
    
    // Create mock query with chainable methods
    mockQuery = {
      get: jest.fn(),
      where: mockWhere,
      limit: mockLimit,
      orderBy: mockOrderBy,
      offset: mockOffset
    };
    
    // Create mock collection reference
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      where: mockWhere,
      add: jest.fn(),
      get: jest.fn()
    };
    
    // Create mock Firestore
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };
    
    // Create mock query snapshot
    mockQuerySnapshot = {
      empty: false,
      docs: [],
      size: 0,
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
        updatedAt: Timestamp.fromDate(new Date()),
        lastLoginAt: null,
        mfaStatus: {
          type: 'disabled'
        },
        permissions: ['content_management.view', 'media_management.view'],
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
        updatedAt: Timestamp.fromDate(new Date()),
        lastLoginAt: null,
        mfaStatus: {
          type: 'disabled'
        },
        permissions: ['content_management.view', 'media_management.view'],
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
    const updatedDate = new Date();
    
    const admin = new AdminUser(
      adminId,
      'newadmin@example.com',
      'New Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.PENDING_APPROVAL,
      createdDate,
      updatedDate
    );
    
    jest.spyOn(admin, 'toData').mockReturnValue({
      id: adminId,
      email: 'newadmin@example.com',
      name: 'New Admin',
      role: 'admin',
      permissions: [],
      mfaStatus: { type: 'disabled' },
      status: AdminUserStatus.PENDING_APPROVAL,
      createdAt: Timestamp.fromDate(createdDate),
      updatedAt: Timestamp.fromDate(updatedDate),
      lastLoginAt: null,
      lastLoginAttempts: [],
      whitelistedIps: []
    });
    
    mockDoc.set.mockResolvedValue({});
    
    // Act
    const createdAdmin = await repository.create(admin);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.set).toHaveBeenCalled();
    expect(createdAdmin).toBe(admin);
  });
  
  it('should update an existing admin', async () => {
    // Arrange
    const adminId = 'admin-123';
    const createdDate = new Date();
    const updatedDate = new Date();
    
    const admin = new AdminUser(
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
    
    jest.spyOn(admin, 'toData').mockReturnValue({
      id: adminId,
      email: 'admin@example.com',
      name: 'Updated Admin',
      role: 'admin',
      permissions: [],
      mfaStatus: { type: 'disabled' },
      status: AdminUserStatus.ACTIVE,
      createdAt: Timestamp.fromDate(createdDate),
      updatedAt: Timestamp.fromDate(updatedDate),
      lastLoginAt: null,
      lastLoginAttempts: [],
      whitelistedIps: []
    });
    
    mockDoc.update.mockResolvedValue({});
    
    // Act
    const updatedAdmin = await repository.update(admin);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.update).toHaveBeenCalled();
    expect(updatedAdmin).toBe(admin);
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
  
  it('should list admins with pagination and filtering', async () => {
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
        updatedAt: Timestamp.fromDate(new Date()),
        mfaStatus: { type: 'disabled' },
        permissions: [],
        lastLoginAttempts: [],
        whitelistedIps: []
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
        updatedAt: Timestamp.fromDate(new Date()),
        mfaStatus: { type: 'enabled' },
        permissions: [],
        lastLoginAttempts: [],
        whitelistedIps: []
      })
    };
    
    mockQuerySnapshot.docs = [mockDocSnapshot1, mockDocSnapshot2];
    mockQuerySnapshot.size = 2;
    
    mockQuery.get.mockResolvedValue(mockQuerySnapshot);
    
    const options: AdminSearchOptions = {
      status: AdminUserStatus.ACTIVE,
      role: 'admin',
      limit: 10,
      offset: 0
    };
    
    // Act
    const result = await repository.list(options);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.where).toHaveBeenCalledWith('status', '==', AdminUserStatus.ACTIVE);
    expect(mockQuery.where).toHaveBeenCalledWith('role', '==', 'admin');
    expect(mockQuery.limit).toHaveBeenCalledWith(10);
    expect(mockQuery.offset).toHaveBeenCalledWith(0);
    expect(mockQuery.get).toHaveBeenCalled();
    
    expect(result).toMatchObject({
      admins: expect.any(Array),
      total: 2,
      limit: 10,
      offset: 0
    });
    expect(result.admins.length).toBe(2);
  });
  
  it('should list pending admin approvals', async () => {
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
        updatedAt: Timestamp.fromDate(new Date()),
        mfaStatus: { type: 'disabled' },
        permissions: [],
        lastLoginAttempts: [],
        whitelistedIps: []
      })
    };
    
    mockQuerySnapshot.docs = [mockDocSnapshot];
    mockQuerySnapshot.size = 1;
    
    mockQuery.get.mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const result = await repository.listPendingApprovals(10, 0);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.where).toHaveBeenCalledWith('status', '==', AdminUserStatus.PENDING_APPROVAL);
    expect(mockQuery.limit).toHaveBeenCalledWith(10);
    expect(mockQuery.offset).toHaveBeenCalledWith(0);
    expect(mockQuery.get).toHaveBeenCalled();
    
    expect(result).toMatchObject({
      admins: expect.any(Array),
      total: 1,
      limit: 10,
      offset: 0
    });
    expect(result.admins.length).toBe(1);
    expect(result.admins[0].status).toBe(AdminUserStatus.PENDING_APPROVAL);
  });
  
  it('should count admins by status', async () => {
    // Arrange
    mockQuerySnapshot.size = 5;
    mockQuery.get.mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const count = await repository.countByStatus(AdminUserStatus.ACTIVE);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.where).toHaveBeenCalledWith('status', '==', AdminUserStatus.ACTIVE);
    expect(mockQuery.get).toHaveBeenCalled();
    expect(count).toBe(5);
  });
});