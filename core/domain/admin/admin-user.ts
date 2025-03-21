/**
 * AdminUser Entity
 * 
 * Represents an administrator in the system.
 * This is an entity in the domain model.
 */

import { Timestamp } from 'firebase/firestore';
import { AdminRole } from './admin-role';
import { Permission } from './permission';
import { MfaStatus } from './mfa-status';

/**
 * AdminUser status types
 */
export enum AdminUserStatus {
  ACTIVE = 'active',
  PENDING_APPROVAL = 'pending_approval',
  DISABLED = 'disabled'
}

/**
 * Admin login attempt interface
 */
export interface AdminLoginAttempt {
  timestamp: Date;
  ipAddress: string;
  successful: boolean;
  userAgent?: string;
}

/**
 * AdminUser entity
 */
export class AdminUser {
  private readonly _id: string;
  private _email: string;
  private _name: string;
  private _role: AdminRole;
  private _permissions: Permission[];
  private _mfaStatus: MfaStatus;
  private _status: AdminUserStatus;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _lastLoginAt?: Date;
  private _lastLoginAttempts: AdminLoginAttempt[];
  private _whitelistedIps: string[];

  /**
   * Create a new AdminUser
   */
  constructor(
    id: string,
    email: string,
    name: string,
    role: AdminRole,
    permissions: Permission[],
    mfaStatus: MfaStatus,
    status: AdminUserStatus,
    createdAt: Date,
    updatedAt: Date,
    lastLoginAt?: Date,
    lastLoginAttempts: AdminLoginAttempt[] = [],
    whitelistedIps: string[] = []
  ) {
    this._id = id;
    this._email = email;
    this._name = name;
    this._role = role;
    this._permissions = permissions;
    this._mfaStatus = mfaStatus;
    this._status = status;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._lastLoginAt = lastLoginAt;
    this._lastLoginAttempts = lastLoginAttempts;
    this._whitelistedIps = whitelistedIps;
  }

  // Getters
  get id(): string { return this._id; }
  get email(): string { return this._email; }
  get name(): string { return this._name; }
  get role(): AdminRole { return this._role; }
  get permissions(): Permission[] { return [...this._permissions]; }
  get mfaStatus(): MfaStatus { return this._mfaStatus; }
  get status(): AdminUserStatus { return this._status; }
  get createdAt(): Date { return new Date(this._createdAt); }
  get updatedAt(): Date { return new Date(this._updatedAt); }
  get lastLoginAt(): Date | undefined { return this._lastLoginAt ? new Date(this._lastLoginAt) : undefined; }
  get lastLoginAttempts(): AdminLoginAttempt[] { return [...this._lastLoginAttempts]; }
  get whitelistedIps(): string[] { return [...this._whitelistedIps]; }

  // Methods
  /**
   * Update the admin's name
   */
  updateName(name: string): void {
    this._name = name;
    this._updatedAt = new Date();
  }

  /**
   * Update the admin's email
   */
  updateEmail(email: string): void {
    this._email = email;
    this._updatedAt = new Date();
  }

  /**
   * Update the admin's role
   */
  updateRole(role: AdminRole): void {
    this._role = role;
    this._updatedAt = new Date();
  }

  /**
   * Update the admin's permissions
   */
  updatePermissions(permissions: Permission[]): void {
    this._permissions = permissions;
    this._updatedAt = new Date();
  }

  /**
   * Update the admin's MFA status
   */
  updateMfaStatus(mfaStatus: MfaStatus): void {
    this._mfaStatus = mfaStatus;
    this._updatedAt = new Date();
  }

  /**
   * Update the admin's status
   */
  updateStatus(status: AdminUserStatus): void {
    this._status = status;
    this._updatedAt = new Date();
  }

  /**
   * Add a login attempt
   */
  addLoginAttempt(attempt: AdminLoginAttempt): void {
    this._lastLoginAttempts = [attempt, ...this._lastLoginAttempts].slice(0, 10); // Keep last 10 attempts

    if (attempt.successful) {
      this._lastLoginAt = attempt.timestamp;
    }

    this._updatedAt = new Date();
  }

  /**
   * Set whitelisted IPs
   */
  setWhitelistedIps(ips: string[]): void {
    this._whitelistedIps = ips;
    this._updatedAt = new Date();
  }

  /**
   * Check if an IP is whitelisted
   */
  isIpWhitelisted(ip: string): boolean {
    if (this._whitelistedIps.length === 0) return true; // No restrictions
    return this._whitelistedIps.includes(ip);
  }

  /**
   * Check if the admin has a specific permission
   */
  hasPermission(permission: Permission): boolean {
    // Super admins have all permissions
    if (this._role.isSuperAdmin()) return true;

    // Check explicit permissions
    return this._permissions.some(p => p.equals(permission));
  }

  /**
   * Check if the admin is active
   */
  isActive(): boolean {
    return this._status === AdminUserStatus.ACTIVE;
  }

  /**
   * Check if the admin requires MFA
   */
  requiresMfa(): boolean {
    return this._mfaStatus.isRequired();
  }

  /**
   * Check if the admin can approve other admins
   */
  canApproveAdmins(): boolean {
    return this._role.isSuperAdmin();
  }

  /**
   * Convert to a data object for storage
   */
  toData(): any {
    return {
      id: this._id,
      email: this._email,
      name: this._name,
      role: this._role.toString(),
      permissions: this._permissions.map(p => p.toString()),
      mfaStatus: this._mfaStatus.toData(),
      status: this._status,
      createdAt: Timestamp.fromDate(this._createdAt),
      updatedAt: Timestamp.fromDate(this._updatedAt),
      lastLoginAt: this._lastLoginAt ? Timestamp.fromDate(this._lastLoginAt) : null,
      lastLoginAttempts: this._lastLoginAttempts.map(attempt => ({
        timestamp: Timestamp.fromDate(attempt.timestamp),
        ipAddress: attempt.ipAddress,
        successful: attempt.successful,
        userAgent: attempt.userAgent
      })),
      whitelistedIps: this._whitelistedIps
    };
  }

  /**
   * Create an AdminUser from a data object
   */
  static fromData(data: any): AdminUser {
    const role = AdminRole.fromString(data.role);
    
    const permissions = (data.permissions || [])
      .map((p: string) => Permission.fromString(p));
    
    const mfaStatus = MfaStatus.fromData({
      type: data.mfaStatus?.type || 'disabled',
      setupDate: data.mfaStatus?.setupDate,
      lastVerifiedDate: data.mfaStatus?.lastVerifiedDate
    });

    const lastLoginAttempts = (data.lastLoginAttempts || [])
      .map((attempt: any) => ({
        timestamp: attempt.timestamp.toDate(),
        ipAddress: attempt.ipAddress,
        successful: attempt.successful,
        userAgent: attempt.userAgent
      }));

    return new AdminUser(
      data.id,
      data.email,
      data.name,
      role,
      permissions,
      mfaStatus,
      data.status as AdminUserStatus,
      data.createdAt.toDate(),
      data.updatedAt.toDate(),
      data.lastLoginAt ? data.lastLoginAt.toDate() : undefined,
      lastLoginAttempts,
      data.whitelistedIps || []
    );
  }
}