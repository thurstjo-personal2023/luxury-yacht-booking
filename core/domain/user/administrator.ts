/**
 * Administrator Domain Entity
 * 
 * This extends the base User entity with administrator-specific properties and behaviors.
 */

import { User, UserProps } from './user';
import { UserRole } from './user-role';
import { EmailAddress } from '../value-objects/email-address';
import { PhoneNumber } from '../value-objects/phone-number';

export interface AdministratorProps extends UserProps {
  isApproved: boolean;
  approvedBy?: string;
  approvalDate?: Date;
  mfaEnabled: boolean;
  invitedBy?: string;
  invitationDate?: Date;
  lastLoginDate?: Date;
  isSuper: boolean;
}

export class Administrator extends User {
  readonly isApproved: boolean;
  readonly approvedBy?: string;
  readonly approvalDate?: Date;
  readonly mfaEnabled: boolean;
  readonly invitedBy?: string;
  readonly invitationDate?: Date;
  readonly lastLoginDate?: Date;
  readonly isSuper: boolean;

  constructor(props: AdministratorProps) {
    super(props);
    
    if (props.role !== UserRole.ADMINISTRATOR) {
      throw new Error('Administrator entity must have ADMINISTRATOR role');
    }
    
    this.isApproved = props.isApproved;
    this.approvedBy = props.approvedBy;
    this.approvalDate = props.approvalDate;
    this.mfaEnabled = props.mfaEnabled;
    this.invitedBy = props.invitedBy;
    this.invitationDate = props.invitationDate;
    this.lastLoginDate = props.lastLoginDate;
    this.isSuper = props.isSuper;
  }

  /**
   * Create a new Administrator via invitation
   */
  static createViaInvitation(props: {
    id: string;
    name: string;
    email: EmailAddress;
    phone?: PhoneNumber;
    invitedBy: string;
  }): Administrator {
    return new Administrator({
      ...props,
      role: UserRole.ADMINISTRATOR,
      emailVerified: false,
      points: 0,
      isApproved: false,
      mfaEnabled: false,
      isSuper: false,
      invitationDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Approve an administrator account
   */
  approve(approvedBy: string): Administrator {
    if (this.isApproved) {
      throw new Error('Administrator is already approved');
    }

    return new Administrator({
      ...this,
      isApproved: true,
      approvedBy,
      approvalDate: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Enable MFA for the administrator
   */
  enableMfa(): Administrator {
    return new Administrator({
      ...this,
      mfaEnabled: true,
      updatedAt: new Date()
    });
  }

  /**
   * Record a login event
   */
  recordLogin(): Administrator {
    return new Administrator({
      ...this,
      lastLoginDate: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Check if the administrator can approve other administrators
   */
  canApproveAdministrators(): boolean {
    return this.isSuper && this.isApproved;
  }

  /**
   * Update administrator properties
   */
  updateAdministrator(props: Partial<Omit<AdministratorProps, 'id' | 'createdAt' | 'role'>>): Administrator {
    return new Administrator({
      ...this,
      ...props,
      id: this.id, // Ensure ID cannot be changed
      role: UserRole.ADMINISTRATOR, // Ensure role cannot be changed
      createdAt: this.createdAt, // Ensure createdAt cannot be changed
      updatedAt: new Date() // Always update the updatedAt timestamp
    });
  }
}