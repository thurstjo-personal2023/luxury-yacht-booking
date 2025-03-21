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
    
    // Assert
    expect(enabled).toBeInstanceOf(MfaStatus);
    expect(disabled).toBeInstanceOf(MfaStatus);
    expect(required).toBeInstanceOf(MfaStatus);
  });
  
  it('should convert status to strings', () => {
    // Arrange
    const enabled = new MfaStatus(MfaStatusType.ENABLED);
    const disabled = new MfaStatus(MfaStatusType.DISABLED);
    const required = new MfaStatus(MfaStatusType.REQUIRED);
    
    // Act & Assert
    expect(enabled.toString()).toBe(MfaStatusType.ENABLED);
    expect(disabled.toString()).toBe(MfaStatusType.DISABLED);
    expect(required.toString()).toBe(MfaStatusType.REQUIRED);
    
    expect(enabled.toString()).not.toBe(MfaStatusType.DISABLED);
    expect(disabled.toString()).not.toBe(MfaStatusType.REQUIRED);
    expect(required.toString()).not.toBe(MfaStatusType.ENABLED);
  });
  
  it('should check if MFA is enabled', () => {
    // Arrange
    const enabled = new MfaStatus(MfaStatusType.ENABLED);
    const disabled = new MfaStatus(MfaStatusType.DISABLED);
    const required = new MfaStatus(MfaStatusType.REQUIRED);
    
    // Act & Assert
    expect(enabled.isEnabled()).toBe(true);
    expect(disabled.isEnabled()).toBe(false);
    expect(required.isEnabled()).toBe(false);
  });
  
  it('should check if MFA is disabled', () => {
    // Arrange
    const enabled = new MfaStatus(MfaStatusType.ENABLED);
    const disabled = new MfaStatus(MfaStatusType.DISABLED);
    const required = new MfaStatus(MfaStatusType.REQUIRED);
    
    // Act & Assert
    expect(enabled.isDisabled()).toBe(false);
    expect(disabled.isDisabled()).toBe(true);
    expect(required.isDisabled()).toBe(false);
  });
  
  it('should check if MFA is required', () => {
    // Arrange
    const enabled = new MfaStatus(MfaStatusType.ENABLED);
    const disabled = new MfaStatus(MfaStatusType.DISABLED);
    const required = new MfaStatus(MfaStatusType.REQUIRED);
    
    // Act & Assert
    expect(enabled.isRequired()).toBe(false);
    expect(disabled.isRequired()).toBe(false);
    expect(required.isRequired()).toBe(true);
  });
  
  it('should create status from string values', () => {
    // Arrange & Act
    const enabled = MfaStatus.fromString(MfaStatusType.ENABLED);
    const disabled = MfaStatus.fromString(MfaStatusType.DISABLED);
    const required = MfaStatus.fromString(MfaStatusType.REQUIRED);
    
    // Assert
    expect(enabled).toBeInstanceOf(MfaStatus);
    expect(disabled).toBeInstanceOf(MfaStatus);
    expect(required).toBeInstanceOf(MfaStatus);
  });
  
  it('should throw error for invalid status strings', () => {
    // Arrange & Act & Assert
    expect(() => {
      MfaStatus.fromString('invalid_status');
    }).toThrow('Invalid MFA status: invalid_status');
  });
  
  it('should correctly serialize to and deserialize from data', () => {
    // Arrange
    const original = new MfaStatus(MfaStatusType.ENABLED);
    
    // Act
    const data = original.toData();
    const recreated = MfaStatus.fromData(data);
    
    // Assert
    expect(recreated.type).toBe(original.type);
    expect(recreated.isEnabled()).toBe(original.isEnabled());
    expect(recreated.toString()).toBe(original.toString());
  });
  
  it('should handle equality comparisons correctly', () => {
    // Arrange
    const enabled1 = new MfaStatus(MfaStatusType.ENABLED);
    const enabled2 = new MfaStatus(MfaStatusType.ENABLED);
    const disabled = new MfaStatus(MfaStatusType.DISABLED);
    
    // Act & Assert
    expect(enabled1.equals(enabled2)).toBe(true);
    expect(enabled1.equals(disabled)).toBe(false);
    expect(disabled.equals(enabled1)).toBe(false);
  });
});