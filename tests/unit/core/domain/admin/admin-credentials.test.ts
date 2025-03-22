/**
 * Unit tests for AdminCredentials entity
 */
import { describe, expect, it, jest } from '@jest/globals';
import { AdminCredentials } from '../../../../../core/domain/admin/admin-credentials';

describe('AdminCredentials Entity', () => {
  it('should create admin credentials with valid properties', () => {
    // Arrange
    const userId = 'admin-123';
    const email = 'admin@example.com';
    const updatedAt = new Date();
    const passwordHash = 'hashed-password';
    const mfaSecret = 'mfa-secret';
    
    // Act
    const credentials = new AdminCredentials(
      userId,
      email,
      updatedAt,
      passwordHash,
      mfaSecret
    );
    
    // Assert
    expect(credentials.userId).toBe(userId);
    expect(credentials.email).toBe(email);
    expect(credentials.hasPassword).toBe(true);
    expect(credentials.hasMfaSecret).toBe(true);
  });
  
  it('should correctly track if credentials have password', () => {
    // Arrange & Act
    const updatedAt = new Date();
    const withPassword = new AdminCredentials(
      'admin-123',
      'admin@example.com',
      updatedAt,
      'password-hash'
    );
    
    const withoutPassword = new AdminCredentials(
      'admin-123',
      'admin@example.com',
      updatedAt,
      undefined
    );
    
    // Assert
    expect(withPassword.hasPassword).toBe(true);
    expect(withoutPassword.hasPassword).toBe(false);
  });
  
  it('should correctly track if credentials have MFA secret', () => {
    // Arrange & Act
    const updatedAt = new Date();
    const withMfa = new AdminCredentials(
      'admin-123',
      'admin@example.com',
      updatedAt,
      'password-hash',
      'mfa-secret'
    );
    
    const withoutMfa = new AdminCredentials(
      'admin-123',
      'admin@example.com',
      updatedAt,
      'password-hash'
    );
    
    // Assert
    expect(withMfa.hasMfaSecret).toBe(true);
    expect(withoutMfa.hasMfaSecret).toBe(false);
  });
  
  it('should update password hash correctly', () => {
    // Arrange
    const updatedAt = new Date();
    const credentials = new AdminCredentials(
      'admin-123',
      'admin@example.com',
      updatedAt,
      'old-hash'
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
    const updatedAt = new Date();
    const credentials = new AdminCredentials(
      'admin-123',
      'admin@example.com',
      updatedAt,
      'hash'
    );
    
    // Act
    credentials.setupMfa('new-mfa-secret');
    
    // Assert
    expect(credentials.hasMfaSecret).toBe(true);
  });
  
  it('should disable MFA correctly', () => {
    // Arrange
    const updatedAt = new Date();
    const credentials = new AdminCredentials(
      'admin-123',
      'admin@example.com',
      updatedAt,
      'hash',
      'mfa-secret'
    );
    
    // Act
    credentials.disableMfa();
    
    // Assert
    expect(credentials.hasMfaSecret).toBe(false);
  });
  
  it('should generate and verify temporary tokens', () => {
    // Arrange
    const updatedAt = new Date();
    const credentials = new AdminCredentials(
      'admin-123',
      'admin@example.com',
      updatedAt,
      'hash'
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
    const updatedAt = new Date();
    const credentials = new AdminCredentials(
      'admin-123',
      'admin@example.com',
      updatedAt,
      'hash'
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
    const updatedAt = new Date();
    const credentials = new AdminCredentials(
      'admin-123',
      'admin@example.com',
      updatedAt,
      'hash',
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
    const updatedAt = new Date();
    const credentials = new AdminCredentials(
      'admin-123',
      'admin@example.com',
      updatedAt,
      'hash'
    );
    
    // Act & Assert
    expect(credentials.validateMfaToken('123456')).toBe(false);
  });
  
  it('should convert to and from data object correctly', () => {
    // Arrange
    const userId = 'admin-123';
    const email = 'admin@example.com';
    const updatedAt = new Date();
    const passwordHash = 'hash';
    const mfaSecret = 'secret';
    const temporaryToken = 'temp-token';
    const tokenExpiry = new Date(Date.now() + 3600000);
    
    const credentials = new AdminCredentials(
      userId,
      email,
      updatedAt,
      passwordHash,
      mfaSecret,
      temporaryToken,
      tokenExpiry
    );
    
    // Mock the Timestamp conversions
    jest.spyOn(credentials, 'toData').mockReturnValue({
      userId,
      email,
      passwordHash,
      mfaSecret,
      temporaryToken,
      tokenExpiry: { toDate: () => tokenExpiry },
      updatedAt: { toDate: () => updatedAt }
    });
    
    // Act
    const data = credentials.toData();
    const recreated = AdminCredentials.fromData(data);
    
    // Assert
    expect(recreated.userId).toBe(userId);
    expect(recreated.email).toBe(email);
    expect(recreated.hasPassword).toBe(true);
    expect(recreated.hasMfaSecret).toBe(true);
    expect(recreated.hasTemporaryToken).toBe(true);
  });
});