/**
 * Unit tests for AdminRole value object
 */
import { describe, expect, it } from '@jest/globals';
import { AdminRole } from '../../../../../core/domain/admin/admin-role';

describe('AdminRole Value Object', () => {
  it('should create roles with the correct values', () => {
    // Assert
    expect(AdminRole.SUPER_ADMIN.value).toBe('super_admin');
    expect(AdminRole.ADMIN.value).toBe('admin');
    expect(AdminRole.MODERATOR.value).toBe('moderator');
  });
  
  it('should return a string representation', () => {
    // Assert
    expect(AdminRole.SUPER_ADMIN.toString()).toBe('super_admin');
    expect(AdminRole.ADMIN.toString()).toBe('admin');
    expect(AdminRole.MODERATOR.toString()).toBe('moderator');
  });
  
  it('should compare roles correctly', () => {
    // Assert
    expect(AdminRole.SUPER_ADMIN.equals(AdminRole.SUPER_ADMIN)).toBe(true);
    expect(AdminRole.ADMIN.equals(AdminRole.ADMIN)).toBe(true);
    expect(AdminRole.MODERATOR.equals(AdminRole.MODERATOR)).toBe(true);
    
    expect(AdminRole.SUPER_ADMIN.equals(AdminRole.ADMIN)).toBe(false);
    expect(AdminRole.ADMIN.equals(AdminRole.MODERATOR)).toBe(false);
    expect(AdminRole.MODERATOR.equals(AdminRole.SUPER_ADMIN)).toBe(false);
  });
  
  it('should check if a role has higher privileges than another', () => {
    // Assert
    expect(AdminRole.SUPER_ADMIN.hasHigherPrivilegesThan(AdminRole.ADMIN)).toBe(true);
    expect(AdminRole.SUPER_ADMIN.hasHigherPrivilegesThan(AdminRole.MODERATOR)).toBe(true);
    expect(AdminRole.ADMIN.hasHigherPrivilegesThan(AdminRole.MODERATOR)).toBe(true);
    
    expect(AdminRole.ADMIN.hasHigherPrivilegesThan(AdminRole.SUPER_ADMIN)).toBe(false);
    expect(AdminRole.MODERATOR.hasHigherPrivilegesThan(AdminRole.ADMIN)).toBe(false);
    expect(AdminRole.MODERATOR.hasHigherPrivilegesThan(AdminRole.SUPER_ADMIN)).toBe(false);
    
    // A role does not have higher privileges than itself
    expect(AdminRole.SUPER_ADMIN.hasHigherPrivilegesThan(AdminRole.SUPER_ADMIN)).toBe(false);
    expect(AdminRole.ADMIN.hasHigherPrivilegesThan(AdminRole.ADMIN)).toBe(false);
    expect(AdminRole.MODERATOR.hasHigherPrivilegesThan(AdminRole.MODERATOR)).toBe(false);
  });
  
  it('should create a role from a string value', () => {
    // Act & Assert
    expect(AdminRole.fromString('super_admin')).toBe(AdminRole.SUPER_ADMIN);
    expect(AdminRole.fromString('admin')).toBe(AdminRole.ADMIN);
    expect(AdminRole.fromString('moderator')).toBe(AdminRole.MODERATOR);
  });
  
  it('should throw an error for invalid role string', () => {
    // Act & Assert
    expect(() => AdminRole.fromString('invalid_role')).toThrow('Invalid admin role: invalid_role');
  });
  
  it('should check if a role is at least as privileged as another', () => {
    // Assert
    // Super admin has at least the same privileges as all roles
    expect(AdminRole.SUPER_ADMIN.hasAtLeastSamePrivilegesAs(AdminRole.SUPER_ADMIN)).toBe(true);
    expect(AdminRole.SUPER_ADMIN.hasAtLeastSamePrivilegesAs(AdminRole.ADMIN)).toBe(true);
    expect(AdminRole.SUPER_ADMIN.hasAtLeastSamePrivilegesAs(AdminRole.MODERATOR)).toBe(true);
    
    // Admin has at least the same privileges as admin and moderator
    expect(AdminRole.ADMIN.hasAtLeastSamePrivilegesAs(AdminRole.ADMIN)).toBe(true);
    expect(AdminRole.ADMIN.hasAtLeastSamePrivilegesAs(AdminRole.MODERATOR)).toBe(true);
    expect(AdminRole.ADMIN.hasAtLeastSamePrivilegesAs(AdminRole.SUPER_ADMIN)).toBe(false);
    
    // Moderator has at least the same privileges only as moderator
    expect(AdminRole.MODERATOR.hasAtLeastSamePrivilegesAs(AdminRole.MODERATOR)).toBe(true);
    expect(AdminRole.MODERATOR.hasAtLeastSamePrivilegesAs(AdminRole.ADMIN)).toBe(false);
    expect(AdminRole.MODERATOR.hasAtLeastSamePrivilegesAs(AdminRole.SUPER_ADMIN)).toBe(false);
  });
});