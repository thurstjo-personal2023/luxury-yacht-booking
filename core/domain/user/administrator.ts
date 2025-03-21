/**
 * Administrator Entity
 * 
 * Represents an administrator in the system with administrative capabilities.
 */

import { EmailAddress } from '../value-objects/email-address';
import { PhoneNumber } from '../value-objects/phone-number';
import { UserRole, hasPermission } from './user-role';
import { AdministratorApprovalStatus } from './administrator-approval-status';

/**
 * Administrator constructor properties
 */
export interface AdministratorProps {
  id: string;
  firstName: string;
  lastName: string;
  email: EmailAddress;
  phone?: PhoneNumber;
  role: UserRole;
  employeeId: string;
  department: string;
  position: string;
  approvalStatus: AdministratorApprovalStatus;
  approvedBy?: string;
  approvalDate?: Date;
  rejectionReason?: string;
  lastActivityAt?: Date;
  mfaEnabled: boolean;
  mfaSecret?: string;
  ipWhitelist?: string[];
  isEmailVerified: boolean;
  isPhoneVerified?: boolean;
  invitationId?: string;
  invitedBy?: string;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Administrator entity
 */
export class Administrator {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: EmailAddress;
  readonly phone?: PhoneNumber;
  readonly role: UserRole;
  readonly employeeId: string;
  readonly department: string;
  readonly position: string;
  readonly approvalStatus: AdministratorApprovalStatus;
  readonly approvedBy?: string;
  readonly approvalDate?: Date;
  readonly rejectionReason?: string;
  readonly lastActivityAt?: Date;
  readonly mfaEnabled: boolean;
  readonly mfaSecret?: string;
  readonly ipWhitelist: string[];
  readonly isEmailVerified: boolean;
  readonly isPhoneVerified: boolean;
  readonly invitationId?: string;
  readonly invitedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  
  constructor(props: AdministratorProps) {
    this.id = props.id;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.email = props.email;
    this.phone = props.phone;
    this.role = props.role;
    this.employeeId = props.employeeId;
    this.department = props.department;
    this.position = props.position;
    this.approvalStatus = props.approvalStatus;
    this.approvedBy = props.approvedBy;
    this.approvalDate = props.approvalDate;
    this.rejectionReason = props.rejectionReason;
    this.lastActivityAt = props.lastActivityAt;
    this.mfaEnabled = props.mfaEnabled;
    this.mfaSecret = props.mfaSecret;
    this.ipWhitelist = props.ipWhitelist || [];
    this.isEmailVerified = props.isEmailVerified;
    this.isPhoneVerified = props.isPhoneVerified || false;
    this.invitationId = props.invitationId;
    this.invitedBy = props.invitedBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt || new Date();
    
    this.validate();
  }
  
  /**
   * Get the full name of the administrator
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
  
  /**
   * Create an administrator with updated properties
   */
  update(props: Partial<Omit<AdministratorProps, 'id' | 'createdAt'>>): Administrator {
    return new Administrator({
      id: this.id,
      firstName: props.firstName || this.firstName,
      lastName: props.lastName || this.lastName,
      email: props.email || this.email,
      phone: props.phone || this.phone,
      role: props.role || this.role,
      employeeId: props.employeeId || this.employeeId,
      department: props.department || this.department,
      position: props.position || this.position,
      approvalStatus: props.approvalStatus || this.approvalStatus,
      approvedBy: props.approvedBy !== undefined ? props.approvedBy : this.approvedBy,
      approvalDate: props.approvalDate !== undefined ? props.approvalDate : this.approvalDate,
      rejectionReason: props.rejectionReason !== undefined ? props.rejectionReason : this.rejectionReason,
      lastActivityAt: props.lastActivityAt !== undefined ? props.lastActivityAt : this.lastActivityAt,
      mfaEnabled: props.mfaEnabled !== undefined ? props.mfaEnabled : this.mfaEnabled,
      mfaSecret: props.mfaSecret !== undefined ? props.mfaSecret : this.mfaSecret,
      ipWhitelist: props.ipWhitelist || this.ipWhitelist,
      isEmailVerified: props.isEmailVerified !== undefined ? props.isEmailVerified : this.isEmailVerified,
      isPhoneVerified: props.isPhoneVerified !== undefined ? props.isPhoneVerified : this.isPhoneVerified,
      invitationId: props.invitationId !== undefined ? props.invitationId : this.invitationId,
      invitedBy: props.invitedBy !== undefined ? props.invitedBy : this.invitedBy,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }
  
  /**
   * Approve this administrator
   */
  approve(approvedBy: string): Administrator {
    return this.update({
      approvalStatus: AdministratorApprovalStatus.APPROVED,
      approvedBy,
      approvalDate: new Date(),
      rejectionReason: undefined
    });
  }
  
  /**
   * Reject this administrator
   */
  reject(rejectedBy: string, reason: string): Administrator {
    return this.update({
      approvalStatus: AdministratorApprovalStatus.REJECTED,
      approvedBy: rejectedBy,
      approvalDate: new Date(),
      rejectionReason: reason
    });
  }
  
  /**
   * Update administrator activity timestamp
   */
  updateActivity(): Administrator {
    return this.update({
      lastActivityAt: new Date()
    });
  }
  
  /**
   * Enable MFA for this administrator
   */
  enableMfa(secret: string): Administrator {
    return this.update({
      mfaEnabled: true,
      mfaSecret: secret
    });
  }
  
  /**
   * Disable MFA for this administrator
   */
  disableMfa(): Administrator {
    return this.update({
      mfaEnabled: false,
      mfaSecret: undefined
    });
  }
  
  /**
   * Update the IP whitelist
   */
  updateIpWhitelist(ipAddresses: string[]): Administrator {
    return this.update({
      ipWhitelist: ipAddresses
    });
  }
  
  /**
   * Check if an IP is whitelisted
   */
  isIpWhitelisted(ip: string): boolean {
    // If no whitelist is defined, all IPs are allowed
    if (!this.ipWhitelist || this.ipWhitelist.length === 0) {
      return true;
    }
    
    return this.ipWhitelist.includes(ip);
  }
  
  /**
   * Check if the administrator is approved
   */
  isApproved(): boolean {
    return this.approvalStatus === AdministratorApprovalStatus.APPROVED;
  }
  
  /**
   * Check if the administrator is pending approval
   */
  isPending(): boolean {
    return this.approvalStatus === AdministratorApprovalStatus.PENDING;
  }
  
  /**
   * Check if the administrator is rejected
   */
  isRejected(): boolean {
    return this.approvalStatus === AdministratorApprovalStatus.REJECTED;
  }
  
  /**
   * Check if the administrator's session is active
   */
  isSessionActive(timeoutMinutes: number): boolean {
    if (!this.lastActivityAt) {
      return false;
    }
    
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const now = new Date().getTime();
    const lastActivity = this.lastActivityAt.getTime();
    
    return now - lastActivity < timeoutMs;
  }
  
  /**
   * Check if the administrator has a specific permission
   */
  hasPermission(permission: string): boolean {
    return hasPermission(this.role, permission);
  }
  
  /**
   * Convert to a plain object for storage
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email.value,
      phone: this.phone?.value,
      role: this.role,
      employeeId: this.employeeId,
      department: this.department,
      position: this.position,
      approvalStatus: this.approvalStatus,
      approvedBy: this.approvedBy,
      approvalDate: this.approvalDate,
      rejectionReason: this.rejectionReason,
      lastActivityAt: this.lastActivityAt,
      mfaEnabled: this.mfaEnabled,
      mfaSecret: this.mfaSecret,
      ipWhitelist: this.ipWhitelist,
      isEmailVerified: this.isEmailVerified,
      isPhoneVerified: this.isPhoneVerified,
      invitationId: this.invitationId,
      invitedBy: this.invitedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  /**
   * Validate the administrator properties
   */
  private validate(): void {
    if (!this.id) {
      throw new Error('Administrator ID is required');
    }
    
    if (!this.firstName) {
      throw new Error('First name is required');
    }
    
    if (!this.lastName) {
      throw new Error('Last name is required');
    }
    
    if (!this.email) {
      throw new Error('Email is required');
    }
    
    if (!this.employeeId) {
      throw new Error('Employee ID is required');
    }
    
    if (!this.department) {
      throw new Error('Department is required');
    }
    
    if (!this.position) {
      throw new Error('Position is required');
    }
    
    if (!Object.values(AdministratorApprovalStatus).includes(this.approvalStatus)) {
      throw new Error(`Invalid approval status: ${this.approvalStatus}`);
    }
    
    // Administrator role must be ADMINISTRATOR or SUPER_ADMINISTRATOR
    if (
      this.role !== UserRole.ADMINISTRATOR &&
      this.role !== UserRole.SUPER_ADMINISTRATOR
    ) {
      throw new Error(`Invalid role for administrator: ${this.role}`);
    }
  }
}