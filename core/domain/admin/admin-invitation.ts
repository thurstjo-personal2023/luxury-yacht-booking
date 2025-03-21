/**
 * AdminInvitation Entity
 * 
 * Represents an invitation for a new administrator to join the system.
 * This is an entity in the domain model.
 */

import { Timestamp } from 'firebase/firestore';
import { AdminRole } from './admin-role';

/**
 * AdminInvitation status types
 */
export enum AdminInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

/**
 * AdminInvitation entity
 */
export class AdminInvitation {
  private readonly _id: string;
  private readonly _email: string;
  private readonly _role: AdminRole;
  private readonly _invitedBy: string;
  private readonly _createdAt: Date;
  private readonly _expirationDate: Date;
  private _status: AdminInvitationStatus;
  private _acceptedBy?: string;
  private _acceptedAt?: Date;
  private _invitationCode: string;

  /**
   * Create a new AdminInvitation
   */
  constructor(
    id: string,
    email: string,
    role: AdminRole,
    invitedBy: string,
    createdAt: Date,
    expirationDate: Date,
    status: AdminInvitationStatus,
    invitationCode: string,
    acceptedBy?: string,
    acceptedAt?: Date
  ) {
    this._id = id;
    this._email = email;
    this._role = role;
    this._invitedBy = invitedBy;
    this._createdAt = createdAt;
    this._expirationDate = expirationDate;
    this._status = status;
    this._invitationCode = invitationCode;
    this._acceptedBy = acceptedBy;
    this._acceptedAt = acceptedAt;
  }

  // Getters
  get id(): string { return this._id; }
  get email(): string { return this._email; }
  get role(): AdminRole { return this._role; }
  get invitedBy(): string { return this._invitedBy; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get expirationDate(): Date { return new Date(this._expirationDate); }
  get status(): AdminInvitationStatus { return this._status; }
  get invitationCode(): string { return this._invitationCode; }
  get acceptedBy(): string | undefined { return this._acceptedBy; }
  get acceptedAt(): Date | undefined { return this._acceptedAt ? new Date(this._acceptedAt) : undefined; }

  /**
   * Check if the invitation is expired
   */
  isExpired(): boolean {
    return new Date() > this._expirationDate || this._status === AdminInvitationStatus.EXPIRED;
  }

  /**
   * Mark the invitation as expired
   */
  markExpired(): void {
    this._status = AdminInvitationStatus.EXPIRED;
  }

  /**
   * Mark the invitation as accepted
   */
  markAccepted(userId: string): void {
    if (this.isExpired()) {
      throw new Error('Cannot accept an expired invitation');
    }
    
    if (this._status !== AdminInvitationStatus.PENDING) {
      throw new Error(`Cannot accept invitation with status: ${this._status}`);
    }
    
    this._status = AdminInvitationStatus.ACCEPTED;
    this._acceptedBy = userId;
    this._acceptedAt = new Date();
  }

  /**
   * Mark the invitation as revoked
   */
  markRevoked(): void {
    if (this._status === AdminInvitationStatus.ACCEPTED) {
      throw new Error('Cannot revoke an accepted invitation');
    }
    
    this._status = AdminInvitationStatus.REVOKED;
  }

  /**
   * Verify the invitation code
   */
  verifyInvitationCode(code: string): boolean {
    return this._invitationCode === code && 
           this._status === AdminInvitationStatus.PENDING &&
           !this.isExpired();
  }

  /**
   * Check if the invitation can be used
   */
  canBeUsed(): boolean {
    return this._status === AdminInvitationStatus.PENDING && !this.isExpired();
  }

  /**
   * Convert to a data object for storage
   */
  toData(): any {
    return {
      id: this._id,
      email: this._email,
      role: this._role.toString(),
      invitedBy: this._invitedBy,
      createdAt: Timestamp.fromDate(this._createdAt),
      expirationDate: Timestamp.fromDate(this._expirationDate),
      status: this._status,
      invitationCode: this._invitationCode,
      acceptedBy: this._acceptedBy,
      acceptedAt: this._acceptedAt ? Timestamp.fromDate(this._acceptedAt) : null
    };
  }

  /**
   * Create an AdminInvitation from a data object
   */
  static fromData(data: any): AdminInvitation {
    const role = AdminRole.fromString(data.role);
    
    return new AdminInvitation(
      data.id,
      data.email,
      role,
      data.invitedBy,
      data.createdAt.toDate(),
      data.expirationDate.toDate(),
      data.status as AdminInvitationStatus,
      data.invitationCode,
      data.acceptedBy,
      data.acceptedAt ? data.acceptedAt.toDate() : undefined
    );
  }

  /**
   * Generate a new invitation code
   * In a real system, this would be a more secure method
   */
  static generateInvitationCode(): string {
    // Simple code generator for demo purposes
    // In a real system, use a more secure method
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}