/**
 * Administrator Domain Entity
 * 
 * This represents an administrator user in the domain model.
 * It extends the base User entity with additional administrator-specific properties.
 */

import { EmailAddress } from '../value-objects/email-address';
import { PhoneNumber } from '../value-objects/phone-number';
import { Password } from '../value-objects/password';
import { UserRole } from './user-role';
import { User, UserProps } from './user';

/**
 * Administrator approval status
 */
export enum AdministratorApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

/**
 * Administrator properties
 */
export interface AdministratorProps extends UserProps {
  employeeId?: string;
  department?: string;
  position?: string;
  approvalStatus: AdministratorApprovalStatus;
  approvedById?: string;
  approvedAt?: Date;
  rejectedById?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  lastActivityAt?: Date;
  invitationId?: string;
  invitedBy?: string;
  ipWhitelist?: string[];
}

/**
 * Administrator entity
 */
export class Administrator extends User {
  readonly employeeId?: string;
  readonly department?: string;
  readonly position?: string;
  readonly approvalStatus: AdministratorApprovalStatus;
  readonly approvedById?: string;
  readonly approvedAt?: Date;
  readonly rejectedById?: string;
  readonly rejectedAt?: Date;
  readonly rejectionReason?: string;
  readonly mfaEnabled: boolean;
  readonly mfaSecret?: string;
  readonly lastActivityAt?: Date;
  readonly invitationId?: string;
  readonly invitedBy?: string;
  readonly ipWhitelist?: string[];
  
  constructor(props: AdministratorProps) {
    // Ensure the role is always an admin role
    const role = props.role === UserRole.ADMINISTRATOR || props.role === UserRole.SUPER_ADMINISTRATOR
      ? props.role
      : UserRole.ADMINISTRATOR;
    
    const adminProps: AdministratorProps = {
      ...props,
      role
    };
    
    super(adminProps);
    
    this.employeeId = props.employeeId;
    this.department = props.department;
    this.position = props.position;
    this.approvalStatus = props.approvalStatus;
    this.approvedById = props.approvedById;
    this.approvedAt = props.approvedAt;
    this.rejectedById = props.rejectedById;
    this.rejectedAt = props.rejectedAt;
    this.rejectionReason = props.rejectionReason;
    this.mfaEnabled = props.mfaEnabled;
    this.mfaSecret = props.mfaSecret;
    this.lastActivityAt = props.lastActivityAt;
    this.invitationId = props.invitationId;
    this.invitedBy = props.invitedBy;
    this.ipWhitelist = props.ipWhitelist;
    
    this.validateAdmin();
  }
  
  /**
   * Validate administrator-specific properties
   */
  private validateAdmin(): void {
    if (this.approvalStatus === AdministratorApprovalStatus.APPROVED) {
      if (!this.approvedById) {
        throw new Error('Approved by ID is required for approved administrators');
      }
      
      if (!this.approvedAt) {
        throw new Error('Approved at is required for approved administrators');
      }
      
      if (!(this.approvedAt instanceof Date)) {
        throw new Error('Approved at must be a Date');
      }
    }
    
    if (this.approvalStatus === AdministratorApprovalStatus.REJECTED) {
      if (!this.rejectedById) {
        throw new Error('Rejected by ID is required for rejected administrators');
      }
      
      if (!this.rejectedAt) {
        throw new Error('Rejected at is required for rejected administrators');
      }
      
      if (!(this.rejectedAt instanceof Date)) {
        throw new Error('Rejected at must be a Date');
      }
      
      if (!this.rejectionReason) {
        throw new Error('Rejection reason is required for rejected administrators');
      }
    }
    
    if (this.lastActivityAt && !(this.lastActivityAt instanceof Date)) {
      throw new Error('Last activity at must be a Date');
    }
  }
  
  /**
   * Validate that the role is an admin role
   */
  private validateAdminRole(role: UserRole): UserRole {
    if (role !== UserRole.ADMINISTRATOR && role !== UserRole.SUPER_ADMINISTRATOR) {
      throw new Error('Administrator must have an admin role');
    }
    
    return role;
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
   * Check if the administrator has MFA enabled
   */
  hasMfaEnabled(): boolean {
    return this.mfaEnabled;
  }
  
  /**
   * Check if the administrator has completed MFA setup
   */
  hasMfaSetup(): boolean {
    return this.mfaEnabled && !!this.mfaSecret;
  }
  
  /**
   * Create a new administrator with approved status
   */
  approve(approvedById: string): Administrator {
    if (this.isApproved()) {
      return this;
    }
    
    return new Administrator({
      ...this,
      approvalStatus: AdministratorApprovalStatus.APPROVED,
      approvedById,
      approvedAt: new Date(),
      rejectedById: undefined,
      rejectedAt: undefined,
      rejectionReason: undefined,
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a new administrator with rejected status
   */
  reject(rejectedById: string, rejectionReason: string): Administrator {
    if (this.isRejected()) {
      return this;
    }
    
    return new Administrator({
      ...this,
      approvalStatus: AdministratorApprovalStatus.REJECTED,
      rejectedById,
      rejectedAt: new Date(),
      rejectionReason,
      approvedById: undefined,
      approvedAt: undefined,
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a new administrator with MFA enabled
   */
  enableMfa(mfaSecret: string): Administrator {
    return new Administrator({
      ...this,
      mfaEnabled: true,
      mfaSecret,
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a new administrator with MFA disabled
   */
  disableMfa(): Administrator {
    return new Administrator({
      ...this,
      mfaEnabled: false,
      mfaSecret: undefined,
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a new administrator with updated activity time
   */
  updateActivity(): Administrator {
    return new Administrator({
      ...this,
      lastActivityAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a new administrator with updated IP whitelist
   */
  updateIpWhitelist(ipWhitelist: string[]): Administrator {
    return new Administrator({
      ...this,
      ipWhitelist,
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a new administrator with added IP address to whitelist
   */
  addIpToWhitelist(ip: string): Administrator {
    const currentWhitelist = this.ipWhitelist || [];
    
    if (currentWhitelist.includes(ip)) {
      return this;
    }
    
    return new Administrator({
      ...this,
      ipWhitelist: [...currentWhitelist, ip],
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a new administrator with removed IP address from whitelist
   */
  removeIpFromWhitelist(ip: string): Administrator {
    const currentWhitelist = this.ipWhitelist || [];
    
    if (!currentWhitelist.includes(ip)) {
      return this;
    }
    
    return new Administrator({
      ...this,
      ipWhitelist: currentWhitelist.filter(i => i !== ip),
      updatedAt: new Date()
    });
  }
  
  /**
   * Check if an IP address is in the whitelist
   */
  isIpWhitelisted(ip: string): boolean {
    if (!this.ipWhitelist || this.ipWhitelist.length === 0) {
      return true; // No whitelist means all IPs are allowed
    }
    
    return this.ipWhitelist.includes(ip);
  }
  
  /**
   * Check if the administrator's session is active
   */
  isSessionActive(sessionTimeoutMinutes: number = 30): boolean {
    if (!this.lastActivityAt) {
      return false;
    }
    
    const currentTime = new Date();
    const sessionTimeoutMs = sessionTimeoutMinutes * 60 * 1000;
    const timeSinceLastActivity = currentTime.getTime() - this.lastActivityAt.getTime();
    
    return timeSinceLastActivity < sessionTimeoutMs;
  }
  
  /**
   * Create a new Administrator from User properties
   */
  static fromUser(
    user: User, 
    adminProps: Omit<AdministratorProps, keyof UserProps>
  ): Administrator {
    return new Administrator({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      password: user.password,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      ...adminProps
    });
  }
}