/**
 * Administrator Domain Entity
 * 
 * This represents an administrator user in the system with additional properties and behaviors.
 */

import { EmailAddress } from '../value-objects/email-address';
import { PhoneNumber } from '../value-objects/phone-number';
import { User, UserProps } from './user';
import { UserRole } from './user-role';

/**
 * Administrator properties interface
 */
export interface AdministratorProps extends UserProps {
  mfaEnabled: boolean;
  isApproved: boolean;
  approvedBy?: string;
  approvalDate?: Date;
  invitedBy: string;
  invitationDate: Date;
  lastActivityDate?: Date;
  permissions?: string[];
  ipWhitelist?: string[];
  accessLevel?: number; // 1: Basic, 2: Standard, 3: Super Admin
}

/**
 * Administrator domain entity
 */
export class Administrator extends User {
  readonly mfaEnabled: boolean;
  readonly isApproved: boolean;
  readonly approvedBy?: string;
  readonly approvalDate?: Date;
  readonly invitedBy: string;
  readonly invitationDate: Date;
  readonly lastActivityDate?: Date;
  readonly permissions: string[];
  readonly ipWhitelist: string[];
  readonly accessLevel: number;
  
  constructor(props: AdministratorProps) {
    super(props);
    
    // Ensure the role is set to admin
    if (props.role !== UserRole.ADMIN && props.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Invalid role for administrator');
    }
    
    this.mfaEnabled = props.mfaEnabled;
    this.isApproved = props.isApproved;
    this.approvedBy = props.approvedBy;
    this.approvalDate = props.approvalDate;
    this.invitedBy = props.invitedBy;
    this.invitationDate = props.invitationDate;
    this.lastActivityDate = props.lastActivityDate;
    this.permissions = props.permissions || [];
    this.ipWhitelist = props.ipWhitelist || [];
    this.accessLevel = props.accessLevel || (props.role === UserRole.SUPER_ADMIN ? 3 : 1);
  }
  
  /**
   * Create a new administrator from invitation
   */
  static createFromInvitation(
    id: string,
    email: EmailAddress,
    name: string,
    invitedBy: string,
    phone?: PhoneNumber
  ): Administrator {
    const now = new Date();
    
    return new Administrator({
      id,
      email,
      name,
      role: UserRole.ADMIN,
      phone,
      emailVerified: false,
      mfaEnabled: false,
      isApproved: false,
      invitedBy,
      invitationDate: now,
      createdAt: now,
      updatedAt: now,
      preferences: new Map()
    });
  }
  
  /**
   * Enable multi-factor authentication
   */
  enableMfa(): Administrator {
    if (this.mfaEnabled) {
      return this;
    }
    
    return this.updateAdminProps({ mfaEnabled: true });
  }
  
  /**
   * Disable multi-factor authentication
   * Only super admins can disable MFA for other admins
   */
  disableMfa(): Administrator {
    if (!this.mfaEnabled) {
      return this;
    }
    
    return this.updateAdminProps({ mfaEnabled: false });
  }
  
  /**
   * Approve the administrator (by a super admin)
   */
  approve(approvedBy: string): Administrator {
    if (this.isApproved) {
      return this;
    }
    
    return this.updateAdminProps({
      isApproved: true,
      approvedBy,
      approvalDate: new Date()
    });
  }
  
  /**
   * Record administrator activity (to prevent session timeout)
   */
  recordActivity(): Administrator {
    return this.updateAdminProps({
      lastActivityDate: new Date()
    });
  }
  
  /**
   * Add a permission to the administrator
   */
  addPermission(permission: string): Administrator {
    if (this.permissions.includes(permission)) {
      return this;
    }
    
    return this.updateAdminProps({
      permissions: [...this.permissions, permission]
    });
  }
  
  /**
   * Remove a permission from the administrator
   */
  removePermission(permission: string): Administrator {
    if (!this.permissions.includes(permission)) {
      return this;
    }
    
    return this.updateAdminProps({
      permissions: this.permissions.filter(p => p !== permission)
    });
  }
  
  /**
   * Check if the administrator has a specific permission
   */
  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }
  
  /**
   * Add an IP address to the whitelist
   */
  addToIpWhitelist(ip: string): Administrator {
    if (this.ipWhitelist.includes(ip)) {
      return this;
    }
    
    return this.updateAdminProps({
      ipWhitelist: [...this.ipWhitelist, ip]
    });
  }
  
  /**
   * Remove an IP address from the whitelist
   */
  removeFromIpWhitelist(ip: string): Administrator {
    if (!this.ipWhitelist.includes(ip)) {
      return this;
    }
    
    return this.updateAdminProps({
      ipWhitelist: this.ipWhitelist.filter(i => i !== ip)
    });
  }
  
  /**
   * Check if an IP address is whitelisted
   * Returns true if whitelist is empty
   */
  isIpWhitelisted(ip: string): boolean {
    return this.ipWhitelist.length === 0 || this.ipWhitelist.includes(ip);
  }
  
  /**
   * Update administrator-specific properties
   */
  private updateAdminProps(props: Partial<Omit<AdministratorProps, keyof UserProps>>): Administrator {
    return new Administrator({
      ...this,
      ...props,
      updatedAt: new Date()
    });
  }
  
  /**
   * Update user properties (override from User)
   */
  update(props: Partial<Omit<UserProps, 'id' | 'email' | 'createdAt' | 'role'>>): Administrator {
    // Ensure role cannot be changed from admin
    const userInstance = super.update(props);
    
    return new Administrator({
      ...userInstance,
      mfaEnabled: this.mfaEnabled,
      isApproved: this.isApproved,
      approvedBy: this.approvedBy,
      approvalDate: this.approvalDate,
      invitedBy: this.invitedBy,
      invitationDate: this.invitationDate,
      lastActivityDate: this.lastActivityDate,
      permissions: this.permissions,
      ipWhitelist: this.ipWhitelist,
      accessLevel: this.accessLevel
    });
  }
  
  /**
   * Check if this administrator is a super admin
   */
  isSuperAdmin(): boolean {
    return this.role === UserRole.SUPER_ADMIN;
  }
  
  /**
   * Check if the session is active (not timed out)
   * @param maxInactivityMinutes Maximum inactivity time in minutes
   */
  isSessionActive(maxInactivityMinutes: number): boolean {
    if (!this.lastActivityDate) {
      return false;
    }
    
    const now = new Date();
    const diffMs = now.getTime() - this.lastActivityDate.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    
    return diffMinutes < maxInactivityMinutes;
  }
  
  /**
   * Convert to a plain object for data transfer (override from User)
   */
  toObject(): Record<string, any> {
    return {
      ...super.toObject(),
      mfaEnabled: this.mfaEnabled,
      isApproved: this.isApproved,
      approvedBy: this.approvedBy,
      approvalDate: this.approvalDate,
      invitedBy: this.invitedBy,
      invitationDate: this.invitationDate,
      lastActivityDate: this.lastActivityDate,
      permissions: this.permissions,
      ipWhitelist: this.ipWhitelist,
      accessLevel: this.accessLevel
    };
  }
}