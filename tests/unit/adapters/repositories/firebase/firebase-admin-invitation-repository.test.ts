/**
 * Unit tests for FirebaseAdminInvitationRepository
 * 
 * These tests use mocks to simulate Firestore behavior
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { FirebaseAdminInvitationRepository } from '../../../../../adapters/repositories/firebase/firebase-admin-invitation-repository';
import { AdminInvitation } from '../../../../../core/domain/admin/admin-invitation';
import { AdminRole } from '../../../../../core/domain/admin/admin-role';
import { Timestamp } from 'firebase-admin/firestore';

describe('FirebaseAdminInvitationRepository', () => {
  let mockFirestore: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockWhere: any;
  let mockQuerySnapshot: any;
  let repository: FirebaseAdminInvitationRepository;
  
  beforeEach(() => {
    // Create mock document reference
    mockDoc = {
      id: 'invitation-123',
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
    repository = new FirebaseAdminInvitationRepository(mockFirestore);
  });
  
  it('should find invitation by ID', async () => {
    // Arrange
    const invitationId = 'invitation-123';
    const mockDocSnapshot = {
      exists: true,
      id: invitationId,
      data: jest.fn().mockReturnValue({
        email: 'invited@example.com',
        name: 'Invited Admin',
        role: 'admin',
        invitedById: 'admin-123',
        code: 'invite-code',
        createdAt: Timestamp.fromDate(new Date()),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)) // 1 day in future
      })
    };
    
    mockDoc.get.mockResolvedValue(mockDocSnapshot);
    
    // Act
    const invitation = await repository.findById(invitationId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_invitations');
    expect(mockCollection.doc).toHaveBeenCalledWith(invitationId);
    expect(mockDoc.get).toHaveBeenCalled();
    expect(invitation).toBeInstanceOf(AdminInvitation);
    expect(invitation?.id).toBe(invitationId);
    expect(invitation?.email).toBe('invited@example.com');
    expect(invitation?.name).toBe('Invited Admin');
    expect(invitation?.role).toBe(AdminRole.ADMIN);
    expect(invitation?.code).toBe('invite-code');
  });
  
  it('should return null when invitation ID is not found', async () => {
    // Arrange
    const invitationId = 'nonexistent-invitation';
    const mockDocSnapshot = {
      exists: false
    };
    
    mockDoc.get.mockResolvedValue(mockDocSnapshot);
    
    // Act
    const invitation = await repository.findById(invitationId);
    
    // Assert
    expect(invitation).toBeNull();
  });
  
  it('should find invitation by email', async () => {
    // Arrange
    const email = 'invited@example.com';
    const invitationId = 'invitation-123';
    
    const mockDocSnapshot = {
      exists: true,
      id: invitationId,
      data: jest.fn().mockReturnValue({
        email,
        name: 'Invited Admin',
        role: 'admin',
        invitedById: 'admin-123',
        code: 'invite-code',
        createdAt: Timestamp.fromDate(new Date()),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)) // 1 day in future
      })
    };
    
    mockQuerySnapshot.empty = false;
    mockQuerySnapshot.docs = [mockDocSnapshot];
    
    mockQuery.get.mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const invitation = await repository.findByEmail(email);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_invitations');
    expect(mockCollection.where).toHaveBeenCalledWith('email', '==', email);
    expect(mockQuery.get).toHaveBeenCalled();
    expect(invitation).toBeInstanceOf(AdminInvitation);
    expect(invitation?.id).toBe(invitationId);
    expect(invitation?.email).toBe(email);
  });
  
  it('should return null when email is not found', async () => {
    // Arrange
    const email = 'nonexistent@example.com';
    
    mockQuerySnapshot.empty = true;
    mockQuerySnapshot.docs = [];
    
    mockQuery.get.mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const invitation = await repository.findByEmail(email);
    
    // Assert
    expect(invitation).toBeNull();
  });
  
  it('should find invitation by code', async () => {
    // Arrange
    const code = 'unique-invite-code';
    const invitationId = 'invitation-123';
    
    const mockDocSnapshot = {
      exists: true,
      id: invitationId,
      data: jest.fn().mockReturnValue({
        email: 'invited@example.com',
        name: 'Invited Admin',
        role: 'admin',
        invitedById: 'admin-123',
        code,
        createdAt: Timestamp.fromDate(new Date()),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)) // 1 day in future
      })
    };
    
    mockQuerySnapshot.empty = false;
    mockQuerySnapshot.docs = [mockDocSnapshot];
    
    mockQuery.get.mockResolvedValue(mockQuerySnapshot);
    
    // Act
    const invitation = await repository.findByCode(code);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_invitations');
    expect(mockCollection.where).toHaveBeenCalledWith('code', '==', code);
    expect(mockQuery.get).toHaveBeenCalled();
    expect(invitation).toBeInstanceOf(AdminInvitation);
    expect(invitation?.id).toBe(invitationId);
    expect(invitation?.code).toBe(code);
  });
  
  it('should create a new invitation', async () => {
    // Arrange
    const invitationId = 'new-invitation-123';
    const invitation = new AdminInvitation({
      id: invitationId,
      email: 'newinvite@example.com',
      name: 'New Invited Admin',
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: 'new-invite-code'
    });
    
    mockDoc.set.mockResolvedValue({});
    
    // Act
    const createdInvitation = await repository.create(invitation);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_invitations');
    expect(mockCollection.doc).toHaveBeenCalledWith(invitationId);
    expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
      email: 'newinvite@example.com',
      name: 'New Invited Admin',
      role: 'admin',
      invitedById: 'admin-123',
      code: 'new-invite-code'
    }));
    expect(createdInvitation).toBe(invitation);
  });
  
  it('should update an existing invitation', async () => {
    // Arrange
    const invitationId = 'invitation-123';
    const invitation = new AdminInvitation({
      id: invitationId,
      email: 'updated@example.com',
      name: 'Updated Invited Admin',
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: 'updated-code'
    });
    
    mockDoc.update.mockResolvedValue({});
    
    // Act
    const updatedInvitation = await repository.update(invitation);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_invitations');
    expect(mockCollection.doc).toHaveBeenCalledWith(invitationId);
    expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
      email: 'updated@example.com',
      name: 'Updated Invited Admin',
      code: 'updated-code'
    }));
    expect(updatedInvitation).toBe(invitation);
  });
  
  it('should delete an invitation', async () => {
    // Arrange
    const invitationId = 'invitation-to-delete';
    
    mockDoc.delete.mockResolvedValue({});
    
    // Act
    await repository.delete(invitationId);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_invitations');
    expect(mockCollection.doc).toHaveBeenCalledWith(invitationId);
    expect(mockDoc.delete).toHaveBeenCalled();
  });
  
  it('should generate ID for new invitation without ID', async () => {
    // Arrange
    const invitation = new AdminInvitation({
      email: 'newinvite@example.com',
      name: 'New Invited Admin',
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: 'new-invite-code'
    });
    
    const mockAddRef = {
      id: 'generated-id'
    };
    
    mockCollection.add.mockResolvedValue(mockAddRef);
    
    // Act
    const createdInvitation = await repository.create(invitation);
    
    // Assert
    expect(mockFirestore.collection).toHaveBeenCalledWith('admin_invitations');
    expect(mockCollection.add).toHaveBeenCalledWith(expect.objectContaining({
      email: 'newinvite@example.com',
      name: 'New Invited Admin',
      role: 'admin',
      invitedById: 'admin-123',
      code: 'new-invite-code'
    }));
    expect(createdInvitation.id).toBe('generated-id');
  });
});