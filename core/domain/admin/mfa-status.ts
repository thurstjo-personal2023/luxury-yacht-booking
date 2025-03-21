/**
 * MFA Status Value Object
 * 
 * Represents the Multi-Factor Authentication status of an administrator.
 * This is a value object in the domain model.
 */

/**
 * Enum representing MFA status types
 */
export enum MfaStatusType {
  DISABLED = 'disabled',
  ENABLED = 'enabled',
  REQUIRED = 'required',
  PENDING_SETUP = 'pending_setup'
}

/**
 * MFA Status value object
 */
export class MfaStatus {
  private readonly _type: MfaStatusType;
  private readonly _setupDate?: Date;
  private readonly _lastVerifiedDate?: Date;

  /**
   * Create a new MfaStatus
   * @param type The MFA status type
   * @param setupDate When MFA was set up (optional)
   * @param lastVerifiedDate When MFA was last verified (optional)
   */
  constructor(
    type: MfaStatusType,
    setupDate?: Date,
    lastVerifiedDate?: Date
  ) {
    this._type = type;
    this._setupDate = setupDate;
    this._lastVerifiedDate = lastVerifiedDate;
  }

  /**
   * Get the MFA status type
   */
  get type(): MfaStatusType {
    return this._type;
  }

  /**
   * Get the MFA setup date
   */
  get setupDate(): Date | undefined {
    return this._setupDate;
  }

  /**
   * Get the last verified date
   */
  get lastVerifiedDate(): Date | undefined {
    return this._lastVerifiedDate;
  }

  /**
   * Check if MFA is enabled
   */
  isEnabled(): boolean {
    return this._type === MfaStatusType.ENABLED || this._type === MfaStatusType.REQUIRED;
  }

  /**
   * Check if MFA is required
   */
  isRequired(): boolean {
    return this._type === MfaStatusType.REQUIRED;
  }

  /**
   * Check if MFA is pending setup
   */
  isPendingSetup(): boolean {
    return this._type === MfaStatusType.PENDING_SETUP;
  }

  /**
   * Create an MfaStatus from a data object
   * @param data Object with MFA status data
   * @returns MfaStatus instance
   */
  static fromData(data: {
    type: string;
    setupDate?: string | Date;
    lastVerifiedDate?: string | Date;
  }): MfaStatus {
    const setupDate = data.setupDate ? new Date(data.setupDate) : undefined;
    const lastVerifiedDate = data.lastVerifiedDate ? new Date(data.lastVerifiedDate) : undefined;
    
    return new MfaStatus(
      data.type as MfaStatusType,
      setupDate,
      lastVerifiedDate
    );
  }

  /**
   * Convert to a plain object for serialization
   */
  toData(): {
    type: string;
    setupDate?: string;
    lastVerifiedDate?: string;
  } {
    return {
      type: this._type,
      setupDate: this._setupDate?.toISOString(),
      lastVerifiedDate: this._lastVerifiedDate?.toISOString()
    };
  }
}