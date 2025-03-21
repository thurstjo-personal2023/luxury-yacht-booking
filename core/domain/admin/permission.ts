/**
 * Permission Value Object
 * 
 * Represents a permission that can be assigned to an administrator.
 * This is a value object in the domain model.
 */

/**
 * Enum representing permission categories
 */
export enum PermissionCategory {
  USER_MANAGEMENT = 'user_management',
  CONTENT_MANAGEMENT = 'content_management',
  SYSTEM_SETTINGS = 'system_settings',
  MEDIA_MANAGEMENT = 'media_management',
  ANALYTICS = 'analytics'
}

/**
 * Enum representing permission actions
 */
export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  EDIT = 'edit',
  DELETE = 'delete',
  APPROVE = 'approve'
}

/**
 * Permission value object
 */
export class Permission {
  private readonly _category: PermissionCategory;
  private readonly _action: PermissionAction;

  /**
   * Create a new Permission
   * @param category The permission category
   * @param action The permission action
   */
  constructor(category: PermissionCategory, action: PermissionAction) {
    this._category = category;
    this._action = action;
  }

  /**
   * Get the permission category
   */
  get category(): PermissionCategory {
    return this._category;
  }

  /**
   * Get the permission action
   */
  get action(): PermissionAction {
    return this._action;
  }

  /**
   * Check if this permission equals another permission
   * @param other The other permission to compare with
   * @returns True if the permissions are equal
   */
  equals(other: Permission): boolean {
    return this._category === other.category && this._action === other.action;
  }

  /**
   * Get the string representation of this permission
   * Format: "category:action"
   */
  toString(): string {
    return `${this._category}:${this._action}`;
  }

  /**
   * Create a Permission from a string
   * @param value Permission string in format "category:action"
   * @returns Permission instance
   */
  static fromString(value: string): Permission {
    const [category, action] = value.split(':');
    
    if (!category || !action) {
      throw new Error(`Invalid permission format: ${value}`);
    }
    
    if (!Object.values(PermissionCategory).includes(category as PermissionCategory)) {
      throw new Error(`Invalid permission category: ${category}`);
    }
    
    if (!Object.values(PermissionAction).includes(action as PermissionAction)) {
      throw new Error(`Invalid permission action: ${action}`);
    }
    
    return new Permission(
      category as PermissionCategory,
      action as PermissionAction
    );
  }
}