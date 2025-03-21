/**
 * Unit tests for AdminCredentials entity
 */
import { describe, expect, it } from '@jest/globals';
import { AdminCredentials } from '../../../../../core/domain/admin/admin-credentials';
import { MfaStatus } from '../../../../../core/domain/admin/mfa-status';

describe('AdminCredentials Entity', () => {
  it('should create admin credentials with valid properties', () => {
    // Arrange
    const adminId = 'admin-123';
    const passwordHash = 'hashed-password';
    const mfaSecret = 'mfa-secret';
    const mfaStatus = MfaStatus.ENABLED;
    const lastPasswordChangeAt = new Date();
    
    // Act
    const credentials = new AdminCredentials({
      adminId,
      passwordHash,
      mfaSecret,
      mfaStatus,
      lastPasswordChangeAt
    });
    
    // Assert
    expect(credentials.adminId).toBe(adminId);
    expect(credentials.passwordHash).toBe(passwordHash);
    expect(credentials.mfaSecret).toBe(mfaSecret);
    expect(credentials.mfaStatus).toBe(mfaStatus);
    expect(credentials.lastPasswordChangeAt).toBe(lastPasswordChangeAt);
  });
  
  it('should require an adminId', () => {
    // Arrange & Act & Assert
    expect(() => {
      new AdminCredentials({
        adminId: '',
        passwordHash: 'hashed-password'
      });
    }).toThrow('Admin ID is required');
  });
  
  it('should require a passwordHash', () => {
    // Arrange & Act & Assert
    expect(() => {
      new AdminCredentials({
        adminId: 'admin-123',
        passwordHash: ''
      });
    }).toThrow('Password hash is required');
  });
  
  it('should set MFA status to disabled by default', () => {
    // Arrange & Act
    const credentials = new AdminCredentials({
      adminId: 'admin-123',
      passwordHash: 'hashed-password'
    });
    
    // Assert
    expect(credentials.mfaStatus).toBe(MfaStatus.DISABLED);
  });
  
  it('should check if MFA is enabled', () => {
    // Arrange
    const credentialsWithMfa = new AdminCredentials({
      adminId: 'admin-123',
      passwordHash: 'hashed-password',
      mfaStatus: MfaStatus.ENABLED,
      mfaSecret: 'secret'
    });
    
    const credentialsWithoutMfa = new AdminCredentials({
      adminId: 'admin-456',
      passwordHash: 'hashed-password',
      mfaStatus: MfaStatus.DISABLED
    });
    
    // Act & Assert
    expect(credentialsWithMfa.isMfaEnabled()).toBe(true);
    expect(credentialsWithoutMfa.isMfaEnabled()).toBe(false);
  });
  
  it('should validate MFA secret is required when MFA is enabled', () => {
    // Arrange & Act & Assert
    expect(() => {
      new AdminCredentials({
        adminId: 'admin-123',
        passwordHash: 'hashed-password',
        mfaStatus: MfaStatus.ENABLED,
        mfaSecret: ''
      });
    }).toThrow('MFA secret is required when MFA is enabled');
  });
  
  it('should set lastPasswordChangeAt to current date if not provided', () => {
    // Arrange
    const now = new Date();
    
    // Act
    const credentials = new AdminCredentials({
      adminId: 'admin-123',
      passwordHash: 'hashed-password'
    });
    
    // Assert
    expect(credentials.lastPasswordChangeAt).toBeInstanceOf(Date);
    
    // Should be approximately now (allow 1 second tolerance for test execution time)
    const diffMs = Math.abs(credentials.lastPasswordChangeAt.getTime() - now.getTime());
    expect(diffMs).toBeLessThan(1000);
  });
  
  it('should update password hash and lastPasswordChangeAt', () => {
    // Arrange
    const credentials = new AdminCredentials({
      adminId: 'admin-123',
      passwordHash: 'old-hash'
    });
    
    const oldChangeDate = credentials.lastPasswordChangeAt;
    
    // Wait a small amount of time to ensure the timestamps are different
    jest.advanceTimersByTime(1000);
    
    // Act
    credentials.updatePassword('new-hash');
    
    // Assert
    expect(credentials.passwordHash).toBe('new-hash');
    expect(credentials.lastPasswordChangeAt.getTime()).toBeGreaterThan(oldChangeDate.getTime());
  });
  
  it('should enable MFA with a secret', () => {
    // Arrange
    const credentials = new AdminCredentials({
      adminId: 'admin-123',
      passwordHash: 'hashed-password'
    });
    
    // Act
    credentials.enableMfa('new-secret');
    
    // Assert
    expect(credentials.mfaStatus).toBe(MfaStatus.ENABLED);
    expect(credentials.mfaSecret).toBe('new-secret');
    expect(credentials.isMfaEnabled()).toBe(true);
  });
  
  it('should disable MFA', () => {
    // Arrange
    const credentials = new AdminCredentials({
      adminId: 'admin-123',
      passwordHash: 'hashed-password',
      mfaStatus: MfaStatus.ENABLED,
      mfaSecret: 'secret'
    });
    
    // Act
    credentials.disableMfa();
    
    // Assert
    expect(credentials.mfaStatus).toBe(MfaStatus.DISABLED);
    expect(credentials.mfaSecret).toBeUndefined();
    expect(credentials.isMfaEnabled()).toBe(false);
  });
});