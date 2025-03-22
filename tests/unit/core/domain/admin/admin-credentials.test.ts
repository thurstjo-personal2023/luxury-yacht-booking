/**
 * Unit tests for AdminCredentials entity
 */
import { describe, expect, it, jest } from '@jest/globals';
import { AdminCredentials } from '../../../../../core/domain/admin/admin-credentials';

describe('AdminCredentials Entity', () => {
  it('should create admin credentials with valid properties', () => {
    // Arrange
    const userId = 'admin-123';
    const passwordHash = 'hashed-password';
    const hasMfaEnabled = true;
    const mfaSecret = 'mfa-secret';
    
    // Act
    const credentials = new AdminCredentials(
      userId,
      passwordHash,
      hasMfaEnabled,
      mfaSecret
    );
    
    // Assert
    expect(credentials.userId).toBe(userId);
    expect(credentials.hasPassword).toBe(true);
    expect(credentials.hasMfaSecret).toBe(true);
  });
  
  it('should correctly track if credentials have password', () => {
    // Arrange & Act
    const withPassword = new AdminCredentials(
      'admin-123',
      'password-hash',
      false
    );
    
    const withoutPassword = new AdminCredentials(
      'admin-123',
      undefined,
      false
    );
    
    // Assert
    expect(withPassword.hasPassword).toBe(true);
    expect(withoutPassword.hasPassword).toBe(false);
  });
  
  it('should correctly track if credentials have MFA secret', () => {
    // Arrange & Act
    const withMfa = new AdminCredentials(
      'admin-123',
      'password-hash',
      true,
      'mfa-secret'
    );
    
    const withoutMfa = new AdminCredentials(
      'admin-123',
      'password-hash',
      false
    );
    
    // Assert
    expect(withMfa.hasMfaSecret).toBe(true);
    expect(withoutMfa.hasMfaSecret).toBe(false);
  });
  
  it('should update password hash correctly', () => {
    // Arrange
    const credentials = new AdminCredentials(
      'admin-123',
      'old-hash',
      false
    );
    
    const oldUpdateTime = credentials.updatedAt;
    
    // Wait a small amount of time to ensure the timestamps are different
    jest.advanceTimersByTime(1000);
    
    // Act
    credentials.updatePasswordHash('new-hash');
    
    // Assert
    // We can't directly access the private _passwordHash field,
    // but we can verify that hasPassword is still true
    expect(credentials.hasPassword).toBe(true);
    expect(credentials.updatedAt.getTime()).toBeGreaterThan(oldUpdateTime.getTime());
  });
  
  it('should setup MFA correctly', () => {
    // Arrange
    const credentials = new AdminCredentials(
      'admin-123',
      'hash',
      false
    );
    
    // Act
    credentials.setupMfa('new-mfa-secret');
    
    // Assert
    expect(credentials.hasMfaSecret).toBe(true);
  });
  
  it('should disable MFA correctly', () => {
    // Arrange
    const credentials = new AdminCredentials(
      'admin-123',
      'hash',
      true,
      'mfa-secret'
    );
    
    // Act
    credentials.disableMfa();
    
    // Assert
    expect(credentials.hasMfaSecret).toBe(false);
  });
  
  it('should generate and verify temporary tokens', () => {
    // Arrange
    const credentials = new AdminCredentials(
      'admin-123',
      'hash',
      false
    );
    
    // Act
    const token = credentials.generateTemporaryToken(60); // 60 minutes expiry
    
    // Assert
    expect(token).toBeTruthy();
    expect(credentials.hasTemporaryToken).toBe(true);
    expect(credentials.verifyTemporaryToken(token)).toBe(true);
    expect(credentials.verifyTemporaryToken('invalid-token')).toBe(false);
  });
  
  it('should clear temporary tokens', () => {
    // Arrange
    const credentials = new AdminCredentials(
      'admin-123',
      'hash',
      false
    );
    
    const token = credentials.generateTemporaryToken();
    expect(credentials.hasTemporaryToken).toBe(true);
    
    // Act
    credentials.clearTemporaryToken();
    
    // Assert
    expect(credentials.hasTemporaryToken).toBe(false);
    expect(credentials.verifyTemporaryToken(token)).toBe(false);
  });
  
  it('should validate MFA tokens correctly', () => {
    // Arrange
    const credentials = new AdminCredentials(
      'admin-123',
      'hash',
      true,
      'mfa-secret'
    );
    
    // Act & Assert
    // Per implementation, in test mode a valid token is a 6-digit number
    expect(credentials.validateMfaToken('123456')).toBe(true);
    expect(credentials.validateMfaToken('12345')).toBe(false); // too short
    expect(credentials.validateMfaToken('1234567')).toBe(false); // too long
    expect(credentials.validateMfaToken('abcdef')).toBe(false); // not numeric
  });
  
  it('should not validate MFA tokens if no MFA secret is set', () => {
    // Arrange
    const credentials = new AdminCredentials(
      'admin-123',
      'hash',
      false
    );
    
    // Act & Assert
    expect(credentials.validateMfaToken('123456')).toBe(false);
  });
  
  it('should convert to and from data object correctly', () => {
    // Arrange
    const userId = 'admin-123';
    const passwordHash = 'hash';
    const hasMfaEnabled = true;
    const mfaSecret = 'secret';
    const tokenExpiry = new Date(Date.now() + 3600000);
    const temporaryToken = 'temp-token';
    
    const credentials = new AdminCredentials(
      userId,
      passwordHash,
      hasMfaEnabled,
      mfaSecret,
      temporaryToken,
      tokenExpiry
    );
    
    // Act
    const data = credentials.toData();
    const recreated = AdminCredentials.fromData(data);
    
    // Assert
    expect(recreated.userId).toBe(userId);
    expect(recreated.hasPassword).toBe(true);
    expect(recreated.hasMfaSecret).toBe(true);
    expect(recreated.hasTemporaryToken).toBe(true);
  });
});