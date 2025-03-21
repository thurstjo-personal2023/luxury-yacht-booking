/**
 * Unit tests for AdminUser entity
 */
import { describe, expect, it } from '@jest/globals';
import { AdminUser } from '../../../../../core/domain/admin/admin-user';
import { AdminRole } from '../../../../../core/domain/admin/admin-role';
import { MfaStatus } from '../../../../../core/domain/admin/mfa-status';

describe('AdminUser Entity', () => {
  it('should create an admin user with valid properties', () => {
    // Arrange
    const id = 'admin-123';
    const email = 'admin@example.com';
    const name = 'Test Admin';
    const role = AdminRole.ADMIN;
    const phoneNumber = '+1234567890';
    const createdAt = new Date();
    const lastLoginAt = new Date();
    const mfaStatus = MfaStatus.ENABLED;
    const isApproved = true;
    
    // Act
    const adminUser = new AdminUser({
      id,
      email,
      name,
      role,
      phoneNumber,
      createdAt,
      lastLoginAt,
      mfaStatus,
      isApproved
    });
    
    // Assert
    expect(adminUser.id).toBe(id);
    expect(adminUser.email).toBe(email);
    expect(adminUser.name).toBe(name);
    expect(adminUser.role).toBe(role);
    expect(adminUser.phoneNumber).toBe(phoneNumber);
    expect(adminUser.createdAt).toBe(createdAt);
    expect(adminUser.lastLoginAt).toBe(lastLoginAt);
    expect(adminUser.mfaStatus).toBe(mfaStatus);
    expect(adminUser.isApproved).toBe(isApproved);
  });
  
  it('should validate email format', () => {
    // Arrange & Act & Assert
    expect(() => {
      new AdminUser({
        id: 'admin-123',
        email: 'invalid-email',
        name: 'Test Admin',
        role: AdminRole.ADMIN
      });
    }).toThrow('Invalid email format');
  });
  
  it('should require a name', () => {
    // Arrange & Act & Assert
    expect(() => {
      new AdminUser({
        id: 'admin-123',
        email: 'admin@example.com',
        name: '',
        role: AdminRole.ADMIN
      });
    }).toThrow('Name is required');
  });
  
  it('should check if admin has a specific role', () => {
    // Arrange
    const adminUser = new AdminUser({
      id: 'admin-123',
      email: 'admin@example.com',
      name: 'Test Admin',
      role: AdminRole.ADMIN
    });
    
    // Act & Assert
    expect(adminUser.hasRole(AdminRole.ADMIN)).toBe(true);
    expect(adminUser.hasRole(AdminRole.SUPER_ADMIN)).toBe(false);
  });
  
  it('should check if admin has MFA enabled', () => {
    // Arrange
    const adminWithMfa = new AdminUser({
      id: 'admin-123',
      email: 'admin@example.com',
      name: 'Test Admin',
      role: AdminRole.ADMIN,
      mfaStatus: MfaStatus.ENABLED
    });
    
    const adminWithoutMfa = new AdminUser({
      id: 'admin-456',
      email: 'admin2@example.com',
      name: 'Test Admin 2',
      role: AdminRole.ADMIN,
      mfaStatus: MfaStatus.DISABLED
    });
    
    // Act & Assert
    expect(adminWithMfa.hasMfaEnabled()).toBe(true);
    expect(adminWithoutMfa.hasMfaEnabled()).toBe(false);
  });
  
  it('should check if admin is approved', () => {
    // Arrange
    const approvedAdmin = new AdminUser({
      id: 'admin-123',
      email: 'admin@example.com',
      name: 'Test Admin',
      role: AdminRole.ADMIN,
      isApproved: true
    });
    
    const unapprovedAdmin = new AdminUser({
      id: 'admin-456',
      email: 'admin2@example.com',
      name: 'Test Admin 2',
      role: AdminRole.ADMIN,
      isApproved: false
    });
    
    // Act & Assert
    expect(approvedAdmin.isApproved).toBe(true);
    expect(unapprovedAdmin.isApproved).toBe(false);
  });
  
  it('should handle default values correctly', () => {
    // Arrange
    const adminUser = new AdminUser({
      id: 'admin-123',
      email: 'admin@example.com',
      name: 'Test Admin',
      role: AdminRole.ADMIN
    });
    
    // Act & Assert
    expect(adminUser.mfaStatus).toBe(MfaStatus.DISABLED);
    expect(adminUser.isApproved).toBe(false);
    expect(adminUser.createdAt).toBeInstanceOf(Date);
    expect(adminUser.lastLoginAt).toBeUndefined();
  });
});