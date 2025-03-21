/**
 * Unit tests for MfaStatus value object
 */
import { describe, expect, it } from '@jest/globals';
import { MfaStatus, MfaStatusType } from '../../../../../core/domain/admin/mfa-status';

describe('MfaStatus Value Object', () => {
  it('should create valid MFA status objects', () => {
    // Arrange & Act
    const disabled = new MfaStatus(MfaStatusType.DISABLED);
    const enabled = new MfaStatus(MfaStatusType.ENABLED);
    const required = new MfaStatus(MfaStatusType.REQUIRED);
    const pendingSetup = new MfaStatus(MfaStatusType.PENDING_SETUP);
    
    // Assert
    expect(disabled).toBeInstanceOf(MfaStatus);
    expect(enabled).toBeInstanceOf(MfaStatus);
    expect(required).toBeInstanceOf(MfaStatus);
    expect(pendingSetup).toBeInstanceOf(MfaStatus);
    
    expect(disabled.type).toBe(MfaStatusType.DISABLED);
    expect(enabled.type).toBe(MfaStatusType.ENABLED);
    expect(required.type).toBe(MfaStatusType.REQUIRED);
    expect(pendingSetup.type).toBe(MfaStatusType.PENDING_SETUP);
  });
  
  it('should correctly handle setup date and last verified date', () => {
    // Arrange
    const setupDate = new Date();
    const lastVerifiedDate = new Date();
    
    // Act
    const status = new MfaStatus(
      MfaStatusType.ENABLED, 
      setupDate, 
      lastVerifiedDate
    );
    
    // Assert
    expect(status.setupDate).toEqual(setupDate);
    expect(status.lastVerifiedDate).toEqual(lastVerifiedDate);
  });
  
  it('should correctly identify enabled status', () => {
    // Arrange
    const disabled = new MfaStatus(MfaStatusType.DISABLED);
    const enabled = new MfaStatus(MfaStatusType.ENABLED);
    const required = new MfaStatus(MfaStatusType.REQUIRED);
    const pendingSetup = new MfaStatus(MfaStatusType.PENDING_SETUP);
    
    // Act & Assert
    expect(disabled.isEnabled()).toBe(false);
    expect(enabled.isEnabled()).toBe(true);
    expect(required.isEnabled()).toBe(true);
    expect(pendingSetup.isEnabled()).toBe(false);
  });
  
  it('should correctly identify required status', () => {
    // Arrange
    const disabled = new MfaStatus(MfaStatusType.DISABLED);
    const enabled = new MfaStatus(MfaStatusType.ENABLED);
    const required = new MfaStatus(MfaStatusType.REQUIRED);
    
    // Act & Assert
    expect(disabled.isRequired()).toBe(false);
    expect(enabled.isRequired()).toBe(false);
    expect(required.isRequired()).toBe(true);
  });
  
  it('should correctly identify pending setup status', () => {
    // Arrange
    const disabled = new MfaStatus(MfaStatusType.DISABLED);
    const pendingSetup = new MfaStatus(MfaStatusType.PENDING_SETUP);
    
    // Act & Assert
    expect(disabled.isPendingSetup()).toBe(false);
    expect(pendingSetup.isPendingSetup()).toBe(true);
  });
  
  it('should create MFA status from data object', () => {
    // Arrange
    const setupDate = new Date();
    const lastVerifiedDate = new Date();
    const data = {
      type: MfaStatusType.ENABLED,
      setupDate: setupDate.toISOString(),
      lastVerifiedDate: lastVerifiedDate.toISOString()
    };
    
    // Act
    const status = MfaStatus.fromData(data);
    
    // Assert
    expect(status).toBeInstanceOf(MfaStatus);
    expect(status.type).toBe(MfaStatusType.ENABLED);
    expect(status.setupDate?.getTime()).toBe(setupDate.getTime());
    expect(status.lastVerifiedDate?.getTime()).toBe(lastVerifiedDate.getTime());
  });
  
  it('should handle Date objects in fromData', () => {
    // Arrange
    const setupDate = new Date();
    const lastVerifiedDate = new Date();
    const data = {
      type: MfaStatusType.ENABLED,
      setupDate: setupDate,
      lastVerifiedDate: lastVerifiedDate
    };
    
    // Act
    const status = MfaStatus.fromData(data);
    
    // Assert
    expect(status.setupDate?.getTime()).toBe(setupDate.getTime());
    expect(status.lastVerifiedDate?.getTime()).toBe(lastVerifiedDate.getTime());
  });
  
  it('should convert to a data object', () => {
    // Arrange
    const setupDate = new Date();
    const lastVerifiedDate = new Date();
    const status = new MfaStatus(
      MfaStatusType.ENABLED, 
      setupDate, 
      lastVerifiedDate
    );
    
    // Act
    const data = status.toData();
    
    // Assert
    expect(data.type).toBe(MfaStatusType.ENABLED);
    expect(data.setupDate).toBe(setupDate.toISOString());
    expect(data.lastVerifiedDate).toBe(lastVerifiedDate.toISOString());
  });
});