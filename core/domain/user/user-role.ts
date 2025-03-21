/**
 * User Role Enumeration
 * 
 * Defines the possible roles for users in the system.
 */

export enum UserRole {
  // Regular user roles
  CONSUMER = 'consumer',
  PRODUCER = 'producer',
  PARTNER = 'partner',
  
  // Administrator roles
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

/**
 * User role utility functions
 */
export class UserRoleUtils {
  /**
   * Check if a role is an administrator role
   */
  static isAdminRole(role: UserRole): boolean {
    return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  }
  
  /**
   * Check if a role is a super administrator role
   */
  static isSuperAdminRole(role: UserRole): boolean {
    return role === UserRole.SUPER_ADMIN;
  }
  
  /**
   * Get all available user roles
   */
  static getAllRoles(): UserRole[] {
    return Object.values(UserRole);
  }
  
  /**
   * Get all administrator roles
   */
  static getAdminRoles(): UserRole[] {
    return [UserRole.ADMIN, UserRole.SUPER_ADMIN];
  }
  
  /**
   * Get all regular user roles (non-admin)
   */
  static getRegularRoles(): UserRole[] {
    return [UserRole.CONSUMER, UserRole.PRODUCER, UserRole.PARTNER];
  }
}