/**
 * Unit tests for AdminRole value object
 */
import { describe, expect, it } from '@jest/globals';
import { AdminRole, AdminRoleType } from '../../../../../core/domain/admin/admin-role';

describe('AdminRole Value Object', () => {
  it('should create valid admin roles', () => {
    // Arrange & Act
    const superAdmin = new AdminRole(AdminRoleType.SUPER_ADMIN);
    const admin = new AdminRole(AdminRoleType.ADMIN);
    const moderator = new AdminRole(AdminRoleType.MODERATOR);
    
    // Assert
    expect(superAdmin).toBeInstanceOf(AdminRole);
    expect(admin).toBeInstanceOf(AdminRole);
    expect(moderator).toBeInstanceOf(AdminRole);
  });
  
  it('should convert roles to strings', () => {
    // Arrange
    const superAdmin = new AdminRole(AdminRoleType.SUPER_ADMIN);
    const admin = new AdminRole(AdminRoleType.ADMIN);
    const moderator = new AdminRole(AdminRoleType.MODERATOR);
    
    // Act & Assert
    expect(superAdmin.toString()).toBe(AdminRoleType.SUPER_ADMIN);
    expect(admin.toString()).toBe(AdminRoleType.ADMIN);
    expect(moderator.toString()).toBe(AdminRoleType.MODERATOR);
    
    expect(superAdmin.toString()).not.toBe(AdminRoleType.ADMIN);
    expect(admin.toString()).not.toBe(AdminRoleType.MODERATOR);
    expect(moderator.toString()).not.toBe(AdminRoleType.SUPER_ADMIN);
  });
  
  it('should correctly identify role hierarchies', () => {
    // Arrange
    const superAdmin = new AdminRole(AdminRoleType.SUPER_ADMIN);
    const admin = new AdminRole(AdminRoleType.ADMIN);
    const moderator = new AdminRole(AdminRoleType.MODERATOR);
    
    // Act & Assert - Check role privileges
    expect(superAdmin.isSuperAdmin()).toBe(true);
    expect(admin.isSuperAdmin()).toBe(false);
    expect(moderator.isSuperAdmin()).toBe(false);
    
    expect(superAdmin.isAdmin()).toBe(true);
    expect(admin.isAdmin()).toBe(true);
    expect(moderator.isAdmin()).toBe(false);
    
    expect(superAdmin.isModerator()).toBe(true);
    expect(admin.isModerator()).toBe(true);
    expect(moderator.isModerator()).toBe(true);
  });
  
  it('should correctly compare role privileges', () => {
    // Arrange
    const superAdmin = new AdminRole(AdminRoleType.SUPER_ADMIN);
    const admin = new AdminRole(AdminRoleType.ADMIN);
    const moderator = new AdminRole(AdminRoleType.MODERATOR);
    
    // Act & Assert - Super Admin has highest privileges
    expect(superAdmin.hasEqualOrHigherPrivilegeThan(superAdmin)).toBe(true);
    expect(superAdmin.hasEqualOrHigherPrivilegeThan(admin)).toBe(true);
    expect(superAdmin.hasEqualOrHigherPrivilegeThan(moderator)).toBe(true);
    
    expect(admin.hasEqualOrHigherPrivilegeThan(superAdmin)).toBe(false);
    expect(moderator.hasEqualOrHigherPrivilegeThan(admin)).toBe(false);
    expect(moderator.hasEqualOrHigherPrivilegeThan(superAdmin)).toBe(false);
    
    // Admin has mid-level privileges
    expect(admin.hasEqualOrHigherPrivilegeThan(admin)).toBe(true);
    expect(admin.hasEqualOrHigherPrivilegeThan(moderator)).toBe(true);
    
    // Moderator has lowest privileges
    expect(moderator.hasEqualOrHigherPrivilegeThan(moderator)).toBe(true);
  });
  
  it('should create roles from string values', () => {
    // Arrange & Act
    const superAdmin = AdminRole.fromString(AdminRoleType.SUPER_ADMIN);
    const admin = AdminRole.fromString(AdminRoleType.ADMIN);
    const moderator = AdminRole.fromString(AdminRoleType.MODERATOR);
    
    // Assert
    expect(superAdmin).toBeInstanceOf(AdminRole);
    expect(admin).toBeInstanceOf(AdminRole);
    expect(moderator).toBeInstanceOf(AdminRole);
  });
  
  it('should throw error for invalid role strings', () => {
    // Arrange & Act & Assert
    expect(() => {
      AdminRole.fromString('invalid_role');
    }).toThrow('Invalid admin role: invalid_role');
  });
});