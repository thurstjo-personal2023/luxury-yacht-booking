/**
 * Unit tests for MfaStatus value object
 */
import { describe, expect, it } from '@jest/globals';
import { MfaStatus, MfaStatusType } from '../../../../../core/domain/admin/mfa-status';

describe('MfaStatus Value Object', () => {
  it('should create valid MFA status objects', () => {
    // Arrange & Act
    const enabled = new MfaStatus(MfaStatusType.ENABLED);
    const disabled = new MfaStatus(MfaStatusType.DISABLED);
    const required = new MfaStatus(MfaStatusType.REQUIRED);
    const pending = new MfaStatus(MfaStatusType.PENDING_SETUP);
    
    // Assert
    expect(enabled).toBeInstanceOf(MfaStatus);
    expect(disabled).toBeInstanceOf(MfaStatus);
    expect(required).toBeInstanceOf(MfaStatus);
    expect(pending).toBeInstanceOf(MfaStatus);
    
    expect(enabled.type).toBe(MfaStatusType.ENABLED);
    expect(disabled.type).toBe(MfaStatusType.DISABLED);
    expect(required.type).toBe(MfaStatusType.REQUIRED);
    expect(pending.type).toBe(MfaStatusType.PENDING_SETUP);
  });
  
  it('should include optional dates when provided', () => {
    // Arrange
    const setupDate = new Date('2025-01-01');
    const verifiedDate = new Date('2025-01-02');
    
    // Act
    const status = new MfaStatus(
      MfaStatusType.ENABLED,
      setupDate,
      verifiedDate
    );
    
    // Assert
    expect(status.setupDate).toEqual(setupDate);
    expect(status.lastVerifiedDate).toEqual(verifiedDate);
  });
  
  it('should check if MFA is enabled', () => {
    // Arrange
    const enabled = new MfaStatus(MfaStatusType.ENABLED);
    const disabled = new MfaStatus(MfaStatusType.DISABLED);
    const required = new MfaStatus(MfaStatusType.REQUIRED);
    const pending = new MfaStatus(MfaStatusType.PENDING_SETUP);
    
    // Act & Assert
    expect(enabled.isEnabled()).toBe(true);
    expect(disabled.isEnabled()).toBe(false);
    expect(required.isEnabled()).toBe(true); // Required implies enabled
    expect(pending.isEnabled()).toBe(false);
  });
  
  it('should check if MFA is required', () => {
    // Arrange
    const enabled = new MfaStatus(MfaStatusType.ENABLED);
    const disabled = new MfaStatus(MfaStatusType.DISABLED);
    const required = new MfaStatus(MfaStatusType.REQUIRED);
    const pending = new MfaStatus(MfaStatusType.PENDING_SETUP);
    
    // Act & Assert
    expect(enabled.isRequired()).toBe(false);
    expect(disabled.isRequired()).toBe(false);
    expect(required.isRequired()).toBe(true);
    expect(pending.isRequired()).toBe(false);
  });
  
  it('should check if MFA is pending setup', () => {
    // Arrange
    const enabled = new MfaStatus(MfaStatusType.ENABLED);
    const disabled = new MfaStatus(MfaStatusType.DISABLED);
    const required = new MfaStatus(MfaStatusType.REQUIRED);
    const pending = new MfaStatus(MfaStatusType.PENDING_SETUP);
    
    // Act & Assert
    expect(enabled.isPendingSetup()).toBe(false);
    expect(disabled.isPendingSetup()).toBe(false);
    expect(required.isPendingSetup()).toBe(false);
    expect(pending.isPendingSetup()).toBe(true);
  });
  
  it('should convert to and from data object correctly', () => {
    // Arrange
    const setupDate = new Date('2025-01-01');
    const verifiedDate = new Date('2025-01-02');
    const original = new MfaStatus(
      MfaStatusType.ENABLED,
      setupDate,
      verifiedDate
    );
    
    // Act
    const data = original.toData();
    const recreated = MfaStatus.fromData(data);
    
    // Assert
    expect(recreated.type).toBe(original.type);
    expect(recreated.setupDate?.toISOString()).toBe(setupDate.toISOString());
    expect(recreated.lastVerifiedDate?.toISOString()).toBe(verifiedDate.toISOString());
    expect(recreated.isEnabled()).toBe(original.isEnabled());
  });
  
  it('should handle missing dates in serialization and deserialization', () => {
    // Arrange
    const original = new MfaStatus(MfaStatusType.DISABLED);
    
    // Act
    const data = original.toData();
    const recreated = MfaStatus.fromData(data);
    
    // Assert
    expect(recreated.type).toBe(original.type);
    expect(recreated.setupDate).toBeUndefined();
    expect(recreated.lastVerifiedDate).toBeUndefined();
  });
  
  it('should handle string date formats in fromData method', () => {
    // Arrange
    const setupDateString = '2025-01-01T00:00:00.000Z';
    const verifiedDateString = '2025-01-02T00:00:00.000Z';
    
    // Act
    const status = MfaStatus.fromData({
      type: MfaStatusType.ENABLED,
      setupDate: setupDateString,
      lastVerifiedDate: verifiedDateString
    });
    
    // Assert
    expect(status.setupDate?.toISOString()).toBe(setupDateString);
    expect(status.lastVerifiedDate?.toISOString()).toBe(verifiedDateString);
  });
});