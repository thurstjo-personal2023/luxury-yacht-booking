/**
 * Unit tests for FirebaseAdminRepository
 * 
 * These tests use mocks to simulate Firestore behavior
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { FirebaseAdminRepository } from '../../../../../adapters/repositories/firebase/firebase-admin-repository';
import { AdminUser } from '../../../../../core/domain/admin/admin-user';
import { AdminRole } from '../../../../../core/domain/admin/admin-role';
import { Timestamp } from 'firebase-admin/firestore';

describe('FirebaseAdminRepository', () => {
  let mockFirestore: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockWhere: any;
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
    repository = new FirebaseAdminRepository(mockFirestore);
  });
  
  it('should find admin by ID', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mockDocSnapshot = {
      exists: true,
      id: adminId,
      data: jest.fn().mockReturnValue({
        email: 'admin@example.com',
        name: 'Test Admin',
        role: 'admin',
        phoneNumber: '+1234567890',
        createdAt: Timestamp.fromDate(new Date()),
        lastLoginAt: null,
        mfaStatus: 'disabled',
        isApproved: true
      })
    };
    
    mockDoc.get.mockResolvedValue(mockDocSnapshot);
    
    // Act
    const admin = await repository.findById(adminId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.get).toHaveBeenCalled();
    expect(admin).toBeInstanceOf(AdminUser);
    expect(admin?.id).toBe(adminId);
    expect(admin?.email).toBe('admin@example.com');
    expect(admin?.name).toBe('Test Admin');
    expect(admin?.role).toBe(AdminRole.ADMIN);
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
        email,
        name: 'Test Admin',
        role: 'admin',
        phoneNumber: '+1234567890',
        createdAt: Timestamp.fromDate(new Date()),
        lastLoginAt: null,
        mfaStatus: 'disabled',
        isApproved: true
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
    expect(admin).toBeInstanceOf(AdminUser);
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
    const admin = new AdminUser({
      id: adminId,
      email: 'newadmin@example.com',
      name: 'New Admin',
      role: AdminRole.ADMIN,
      phoneNumber: '+1234567890'
    });
    
    mockDoc.set.mockResolvedValue({});
    
    // Act
    const createdAdmin = await repository.create(admin);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
      email: 'newadmin@example.com',
      name: 'New Admin',
      role: 'admin',
      phoneNumber: '+1234567890',
      mfaStatus: 'disabled',
      isApproved: false
    }));
    expect(createdAdmin).toBe(admin);
  });
  
  it('should update an existing admin', async () => {
    // Arrange
    const adminId = 'admin-123';
    const admin = new AdminUser({
      id: adminId,
      email: 'admin@example.com',
      name: 'Updated Admin',
      role: AdminRole.ADMIN,
      phoneNumber: '+9876543210',
      isApproved: true
    });
    
    mockDoc.update.mockResolvedValue({});
    
    // Act
    const updatedAdmin = await repository.update(admin);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Updated Admin',
      phoneNumber: '+9876543210',
      isApproved: true
    }));
    expect(updatedAdmin).toBe(admin);
  });
  
  it('should delete an admin', async () => {
    // Arrange
    const adminId = 'admin-to-delete';
    
    mockDoc.delete.mockResolvedValue({});
    
    // Act
    await repository.delete(adminId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.doc).toHaveBeenCalledWith(adminId);
    expect(mockDoc.delete).toHaveBeenCalled();
  });
  
  it('should find all admins', async () => {
    // Arrange
    const mockDocSnapshot1 = {
      id: 'admin-1',
      data: jest.fn().mockReturnValue({
        email: 'admin1@example.com',
        name: 'Admin 1',
        role: 'admin',
        createdAt: Timestamp.fromDate(new Date()),
        mfaStatus: 'disabled',
        isApproved: true
      })
    };
    
    const mockDocSnapshot2 = {
      id: 'admin-2',
      data: jest.fn().mockReturnValue({
        email: 'admin2@example.com',
        name: 'Admin 2',
        role: 'moderator',
        createdAt: Timestamp.fromDate(new Date()),
        mfaStatus: 'enabled',
        isApproved: true
      })
    };
    
    mockQuerySnapshot.docs = [mockDocSnapshot1, mockDocSnapshot2];
    
    // Mock collection.get directly
    mockCollection.get = jest.fn().mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const admins = await repository.findAll();
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.get).toHaveBeenCalled();
    expect(admins).toHaveLength(2);
    expect(admins[0]).toBeInstanceOf(AdminUser);
    expect(admins[0].id).toBe('admin-1');
    expect(admins[1]).toBeInstanceOf(AdminUser);
    expect(admins[1].id).toBe('admin-2');
    expect(admins[1].role).toBe(AdminRole.MODERATOR);
  });
  
  it('should find pending approvals', async () => {
    // Arrange
    const mockDocSnapshot = {
      id: 'pending-admin',
      data: jest.fn().mockReturnValue({
        email: 'pending@example.com',
        name: 'Pending Admin',
        role: 'admin',
        createdAt: Timestamp.fromDate(new Date()),
        mfaStatus: 'disabled',
        isApproved: false
      })
    };
    
    mockQuerySnapshot.docs = [mockDocSnapshot];
    
    mockQuery.get.mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const pendingAdmins = await repository.findPendingApprovals();
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_users');
    expect(mockCollection.where).toHaveBeenCalledWith('isApproved', '==', false);
    expect(mockQuery.get).toHaveBeenCalled();
    expect(pendingAdmins).toHaveLength(1);
    expect(pendingAdmins[0]).toBeInstanceOf(AdminUser);
    expect(pendingAdmins[0].id).toBe('pending-admin');
    expect(pendingAdmins[0].isApproved).toBe(false);
  });
});