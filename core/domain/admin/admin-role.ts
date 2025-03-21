/**
 * Admin Role Value Object
 * 
 * Represents the role of an administrator in the system.
 * This is a value object in the domain model.
 */

/**
 * Enum representing admin roles with their permission levels
 */
export enum AdminRoleType {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

/**
 * Admin Role value object
 */
export class AdminRole {
  private readonly _type: AdminRoleType;

  /**
   * Create a new AdminRole
   * @param type The type of admin role
   */
  constructor(type: AdminRoleType) {
    this._type = type;
  }

  /**
   * Get the role type
   */
  get type(): AdminRoleType {
    return this._type;
  }

  /**
   * Check if this role is a super admin
   */
  isSuperAdmin(): boolean {
    return this._type === AdminRoleType.SUPER_ADMIN;
  }

  /**
   * Check if this role is at least an admin
   */
  isAdmin(): boolean {
    return this._type === AdminRoleType.ADMIN || this.isSuperAdmin();
  }

  /**
   * Check if this role is at least a moderator
   */
  isModerator(): boolean {
    return this._type === AdminRoleType.MODERATOR || this.isAdmin();
  }

  /**
   * Compare this role with another role
   * @param other The other role to compare with
   * @returns True if this role has equal or higher privilege
   */
  hasEqualOrHigherPrivilegeThan(other: AdminRole): boolean {
    if (this.isSuperAdmin()) return true;
    if (other.isSuperAdmin()) return false;
    
    if (this.isAdmin()) return true;
    if (other.isAdmin()) return false;
    
    return true; // Both are moderators
  }

  /**
   * Create a role from a string value
   * @param value The role string
   * @returns AdminRole instance
   */
  static fromString(value: string): AdminRole {
    switch (value) {
      case AdminRoleType.SUPER_ADMIN:
        return new AdminRole(AdminRoleType.SUPER_ADMIN);
      case AdminRoleType.ADMIN:
        return new AdminRole(AdminRoleType.ADMIN);
      case AdminRoleType.MODERATOR:
        return new AdminRole(AdminRoleType.MODERATOR);
      default:
        throw new Error(`Invalid admin role: ${value}`);
    }
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return this._type;
  }
}