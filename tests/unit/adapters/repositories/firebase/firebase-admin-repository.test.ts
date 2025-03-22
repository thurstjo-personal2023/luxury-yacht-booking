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
import { Permission } from '../../../../../core/domain/admin/permission';
import { Firestore, DocumentData, CollectionReference, DocumentReference, DocumentSnapshot, QueryDocumentSnapshot, Query, Timestamp } from 'firebase-admin/firestore';

describe('FirebaseAdminRepository', () => {
  // Define properly typed mocks
  let mockFirestore: jest.Mocked<Firestore>;
  let mockCollection: jest.Mocked<CollectionReference<DocumentData>>;
  let mockDoc: jest.Mocked<DocumentReference<DocumentData>>;
  let mockQuery: jest.Mocked<Query<DocumentData>>;
  let mockDocSnapshot: jest.Mocked<DocumentSnapshot<DocumentData>>;
  let mockQueryDocSnapshot: jest.Mocked<QueryDocumentSnapshot<DocumentData>>;
  let repository: FirebaseAdminRepository;
  
  beforeEach(() => {
    // Create mock document reference
    mockDoc = {
      id: 'admin-123',
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      collection: jest.fn(),
      path: 'admin_users/admin-123',
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
      data: jest.fn(),
      get: jest.fn(),
      ref: mockDoc,
      isEqual: jest.fn()
    } as unknown as jest.Mocked<DocumentSnapshot<DocumentData>>;
    
    // Create mock query document snapshot
    mockQueryDocSnapshot = {
      ...mockDocSnapshot,
      data: jest.fn()
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
      id: 'admin_users',
      doc: jest.fn().mockReturnValue(mockDoc),
      get: jest.fn(),
      add: jest.fn(),
      where: jest.fn().mockReturnValue(mockQuery),
      orderBy: jest.fn().mockReturnValue(mockQuery),
      limit: jest.fn().mockReturnValue(mockQuery),
      parent: null as any,
      path: 'admin_users',
      isEqual: jest.fn(),
      withConverter: jest.fn(),
      listDocuments: jest.fn(),
      onSnapshot: jest.fn(),
      stream: jest.fn(),
      count: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          data: jest.fn().mockReturnValue({ count: 5 })
        })
      })
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
    repository = new FirebaseAdminRepository(mockFirestore);
  });
  
  it('should find admin by ID', async () => {
    // Arrange
    const adminId = 'admin-123';
    
    // Create test date for proper comparison
    const createdDate = new Date();
    
    // Setup mock document snapshot data
    mockDocSnapshot.data.mockReturnValue({
      email: 'admin@example.com',
      name: 'Test Admin',
      role: { type: AdminRoleType.ADMIN },
      permissions: [],
      status: AdminUserStatus.ACTIVE,
      mfaStatus: { type: MfaStatusType.DISABLED },
      createdAt: Timestamp.fromDate(createdDate),
      updatedAt: Timestamp.fromDate(createdDate),
      lastLoginAt: null,
      lastLoginAttempts: [],
      whitelistedIps: []
    });
    
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
    expect(admin?.role.type).toBe(AdminRoleType.ADMIN);
    expect(admin?.status).toBe(AdminUserStatus.ACTIVE);
  });
  
  it('should return null when admin ID is not found', async () => {
    // Arrange
    const adminId = 'nonexistent-admin';
    mockDocSnapshot.exists = false;
    
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
    
    // Setup mock query document snapshot data
    mockQueryDocSnapshot.id = adminId;
    mockQueryDocSnapshot.data.mockReturnValue({
      email,
      name: 'Test Admin',
      role: { type: AdminRoleType.ADMIN },
      permissions: [],
      status: AdminUserStatus.ACTIVE,
      mfaStatus: { type: MfaStatusType.DISABLED },
      createdAt: Timestamp.fromDate(createdDate),
      updatedAt: Timestamp.fromDate(createdDate),
      lastLoginAt: null,
      lastLoginAttempts: [],
      whitelistedIps: []
    });
    
    // Act
    const admin = await repository.findByEmail(email);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.where).toHaveBeenCalledWith('email', '==', email);
    expect(mockQuery.limit).toHaveBeenCalledWith(1);
    expect(mockQuery.get).toHaveBeenCalled();
    expect(admin).not.toBeNull();
    expect(admin?.id).toBe(adminId);
    expect(admin?.email).toBe(email);
    expect(admin?.role.type).toBe(AdminRoleType.ADMIN);
  });
  
  it('should return null when admin email is not found', async () => {
    // Arrange
    const email = 'nonexistent@example.com';
    
    // Setup empty query result
    mockQuery.get.mockResolvedValueOnce({
      empty: true,
      size: 0,
      docs: [],
      forEach: jest.fn()
    });
    
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
    const admin = new AdminUser(
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
    
    mockDoc.set.mockResolvedValue({} as any);
    
    // Act
    const result = await repository.create(admin);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.set).toHaveBeenCalled();
    expect(result).toBe(true);
  });
  
  it('should update an existing admin', async () => {
    // Arrange
    const adminId = 'admin-123';
    const createdDate = new Date();
    const updatedDate = new Date(createdDate.getTime() + 10000);
    
    // Create a real AdminUser instance
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
    
    mockDoc.update.mockResolvedValue({} as any);
    
    // Act
    const result = await repository.update(admin);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.update).toHaveBeenCalled();
    expect(result).toBe(true);
  });
  
  it('should delete an admin', async () => {
    // Arrange
    const adminId = 'admin-to-delete';
    
    mockDoc.delete.mockResolvedValue({} as any);
    
    // Act
    const result = await repository.delete(adminId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.delete).toHaveBeenCalled();
    expect(result).toBe(true);
  });
  
  it('should list admins by status', async () => {
    // Arrange
    const status = AdminUserStatus.PENDING_APPROVAL;
    const createdDate = new Date();
    
    // Setup multiple document snapshots with pending status
    const mockQuerySnapshots = Array(3).fill(0).map((_, i) => {
      const docSnapshot = { ...mockQueryDocSnapshot };
      const adminId = `admin-pending-${i}`;
      
      // Clone and modify the snapshot
      const snapshot = {
        id: adminId,
        data: jest.fn().mockReturnValue({
          email: `pending${i}@example.com`,
          name: `Pending Admin ${i}`,
          role: { type: AdminRoleType.ADMIN },
          permissions: [],
          status: AdminUserStatus.PENDING_APPROVAL,
          mfaStatus: { type: MfaStatusType.DISABLED },
          createdAt: Timestamp.fromDate(createdDate),
          updatedAt: Timestamp.fromDate(createdDate),
          lastLoginAt: null,
          lastLoginAttempts: [],
          whitelistedIps: []
        })
      };
      
      return snapshot;
    });
    
    mockQuery.get.mockResolvedValueOnce({
      empty: false,
      size: mockQuerySnapshots.length,
      docs: mockQuerySnapshots,
      forEach: jest.fn()
    });
    
    // Act
    const result = await repository.listByStatus(status);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.where).toHaveBeenCalledWith('status', '==', status);
    expect(result.length).toBe(3);
    expect(result[0].status).toBe(AdminUserStatus.PENDING_APPROVAL);
    expect(result[1].status).toBe(AdminUserStatus.PENDING_APPROVAL);
    expect(result[2].status).toBe(AdminUserStatus.PENDING_APPROVAL);
  });
  
  it('should count admins by status', async () => {
    // Arrange
    const status = AdminUserStatus.ACTIVE;
    
    const countResult = {
      data: jest.fn().mockReturnValue({ count: 5 })
    };
    
    const countQuery = {
      get: jest.fn().mockResolvedValue(countResult)
    };
    
    mockCollection.count.mockReturnValue(countQuery as any);
    
    // Act
    const result = await repository.countByStatus(status);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.where).toHaveBeenCalledWith('status', '==', status);
    expect(mockCollection.count).toHaveBeenCalled();
    expect(result).toBe(5);
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
    const admin = new AdminUser(
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
    await expect(repository.create(admin)).rejects.toThrow('Database error');
  });
  
  it('should list pending approval admins', async () => {
    // Arrange
    const createdDate = new Date();
    
    // Setup multiple document snapshots with pending status
    const mockQuerySnapshots = Array(2).fill(0).map((_, i) => {
      const adminId = `admin-pending-${i}`;
      
      // Clone and modify the snapshot
      const snapshot = {
        id: adminId,
        data: jest.fn().mockReturnValue({
          email: `pending${i}@example.com`,
          name: `Pending Admin ${i}`,
          role: { type: AdminRoleType.ADMIN },
          permissions: [],
          status: AdminUserStatus.PENDING_APPROVAL,
          mfaStatus: { type: MfaStatusType.DISABLED },
          createdAt: Timestamp.fromDate(createdDate),
          updatedAt: Timestamp.fromDate(createdDate),
          lastLoginAt: null,
          lastLoginAttempts: [],
          whitelistedIps: []
        })
      };
      
      return snapshot;
    });
    
    mockQuery.get.mockResolvedValueOnce({
      empty: false,
      size: mockQuerySnapshots.length,
      docs: mockQuerySnapshots,
      forEach: jest.fn()
    });
    
    // Act
    const result = await repository.listPendingApprovals();
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.where).toHaveBeenCalledWith('status', '==', AdminUserStatus.PENDING_APPROVAL);
    expect(result.length).toBe(2);
    expect(result[0].status).toBe(AdminUserStatus.PENDING_APPROVAL);
    expect(result[1].status).toBe(AdminUserStatus.PENDING_APPROVAL);
  });
});