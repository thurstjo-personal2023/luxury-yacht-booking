/**
 * Unit tests for AdminAuthenticationService
 */
import { describe, expect, it, beforeEach } from '@jest/globals';
import { AdminAuthenticationService, AuthenticationResult } from '../../../../../core/domain/admin/admin-authentication-service';
import { AdminCredentials } from '../../../../../core/domain/admin/admin-credentials';

describe('AdminAuthenticationService', () => {
  let authService: AdminAuthenticationService;
  
  beforeEach(() => {
    // Create service
    authService = new AdminAuthenticationService();
  });
  
  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      // Arrange
      const password = 'StrongP@ssw0rd';
      
      // Act
      const result = authService.validatePassword(password);
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    it('should reject a password that is too short', () => {
      // Arrange
      const password = 'Short1!';
      
      // Act
      const result = authService.validatePassword(password);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('at least 10 characters');
    });
    
    it('should reject a password without uppercase letters', () => {
      // Arrange
      const password = 'nouppercase123!';
      
      // Act
      const result = authService.validatePassword(password);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
    });
    
    it('should reject a password without lowercase letters', () => {
      // Arrange
      const password = 'NOLOWERCASE123!';
      
      // Act
      const result = authService.validatePassword(password);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
    });
    
    it('should reject a password without numbers', () => {
      // Arrange
      const password = 'NoNumbersHere!';
      
      // Act
      const result = authService.validatePassword(password);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('number'))).toBe(true);
    });
    
    it('should reject a password without special characters', () => {
      // Arrange
      const password = 'NoSpecialChars123';
      
      // Act
      const result = authService.validatePassword(password);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('special character'))).toBe(true);
    });
  });
  
  describe('hashPassword and verifyPassword', () => {
    it('should hash a password and verify it successfully', () => {
      // Arrange
      const password = 'SecureP@ssw0rd123';
      
      // Act
      const hash = authService.hashPassword(password);
      const isValid = authService.verifyPassword(password, hash);
      
      // Assert
      expect(hash).toContain(':'); // Basic format check
      expect(isValid).toBe(true);
    });
    
    it('should not verify an incorrect password', () => {
      // Arrange
      const password = 'SecureP@ssw0rd123';
      const wrongPassword = 'WrongP@ssw0rd456';
      
      // Act
      const hash = authService.hashPassword(password);
      const isValid = authService.verifyPassword(wrongPassword, hash);
      
      // Assert
      expect(isValid).toBe(false);
    });
  });
  
  describe('generateMfaSecret', () => {
    it('should generate a valid MFA secret', () => {
      // Act
      const secret = authService.generateMfaSecret();
      
      // Assert
      expect(secret).toBeTruthy();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(20); // Basic length check
    });
  });
  
  describe('validateMfaToken', () => {
    it('should validate a correct format MFA token', () => {
      // Arrange
      const token = '123456';
      const secret = authService.generateMfaSecret();
      
      // Act
      const isValid = authService.validateMfaToken(token, secret);
      
      // Assert
      expect(isValid).toBe(true);
    });
    
    it('should reject an invalid format MFA token', () => {
      // Arrange
      const token = '12345'; // Too short
      const secret = authService.generateMfaSecret();
      
      // Act
      const isValid = authService.validateMfaToken(token, secret);
      
      // Assert
      expect(isValid).toBe(false);
    });
    
    it('should reject a non-numeric MFA token', () => {
      // Arrange
      const token = 'ABCDEF'; // Not numbers
      const secret = authService.generateMfaSecret();
      
      // Act
      const isValid = authService.validateMfaToken(token, secret);
      
      // Assert
      expect(isValid).toBe(false);
    });
  });
  
  describe('generateSecureToken', () => {
    it('should generate a token with the expected format', () => {
      // Arrange
      const payload = { userId: 'admin-123', email: 'admin@example.com' };
      
      // Act
      const token = authService.generateSecureToken(payload);
      
      // Assert
      expect(token).toBeTruthy();
      expect(token.split('.').length).toBe(3); // Check JWT-like format
    });
    
    it('should generate different tokens for different payloads', () => {
      // Arrange
      const payload1 = { userId: 'admin-1', email: 'admin1@example.com' };
      const payload2 = { userId: 'admin-2', email: 'admin2@example.com' };
      
      // Act
      const token1 = authService.generateSecureToken(payload1);
      const token2 = authService.generateSecureToken(payload2);
      
      // Assert
      expect(token1).not.toBe(token2);
    });
  });
  
  describe('authenticate', () => {
    it('should successfully authenticate with correct credentials and no MFA', () => {
      // Arrange
      const password = 'SecureP@ssw0rd';
      const hash = authService.hashPassword(password);
      
      // Create admin credentials mock with no MFA
      const credentials = new AdminCredentials(
        'admin-123',
        'admin@example.com',
        new Date(),
        hash
      );
      
      // Act
      const result = authService.authenticate(credentials, password);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.requiresMfa).toBe(false);
    });
    
    it('should require MFA verification when MFA is set up', () => {
      // Arrange
      const password = 'SecureP@ssw0rd';
      const hash = authService.hashPassword(password);
      const mfaSecret = authService.generateMfaSecret();
      
      // Create admin credentials mock with MFA
      const credentials = new AdminCredentials(
        'admin-123',
        'admin@example.com',
        new Date(),
        hash,
        mfaSecret
      );
      
      // Act
      const result = authService.authenticate(credentials, password);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.requiresMfa).toBe(true);
      expect(result.temporaryToken).toBeTruthy();
    });
    
    it('should fail authentication with incorrect password', () => {
      // Arrange
      const password = 'SecureP@ssw0rd';
      const wrongPassword = 'WrongP@ssw0rd';
      const hash = authService.hashPassword(password);
      
      // Create admin credentials mock
      const credentials = new AdminCredentials(
        'admin-123',
        'admin@example.com',
        new Date(),
        hash
      );
      
      // Act
      const result = authService.authenticate(credentials, wrongPassword);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid password');
    });
    
    it('should fail authentication when credentials are null', () => {
      // Arrange
      const password = 'SecureP@ssw0rd';
      
      // Act
      const result = authService.authenticate(null, password);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
    
    it('should fail authentication when password is not set', () => {
      // Arrange
      const password = 'SecureP@ssw0rd';
      
      // Create admin credentials mock without password
      const credentials = new AdminCredentials(
        'admin-123',
        'admin@example.com',
        new Date()
      );
      
      // Act
      const result = authService.authenticate(credentials, password);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Password not set');
    });
  });
  
  describe('verifyMfa', () => {
    it('should successfully verify a valid MFA token', () => {
      // Arrange
      const password = 'SecureP@ssw0rd';
      const hash = authService.hashPassword(password);
      const mfaSecret = authService.generateMfaSecret();
      const mfaToken = '123456'; // Valid format based on our mock validation
      
      // Create admin credentials with MFA
      const credentials = new AdminCredentials(
        'admin-123',
        'admin@example.com',
        new Date(),
        hash,
        mfaSecret
      );
      
      // First authenticate to get temporary token
      const authResult = authService.authenticate(credentials, password);
      const temporaryToken = authResult.temporaryToken!;
      
      // Act
      const result = authService.verifyMfa(credentials, mfaToken, temporaryToken);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.requiresMfa).toBe(false);
    });
    
    it('should fail verification with invalid MFA token', () => {
      // Arrange
      const password = 'SecureP@ssw0rd';
      const hash = authService.hashPassword(password);
      const mfaSecret = authService.generateMfaSecret();
      const invalidMfaToken = 'ABCDEF'; // Invalid format (not numeric)
      
      // Create admin credentials with MFA
      const credentials = new AdminCredentials(
        'admin-123',
        'admin@example.com',
        new Date(),
        hash,
        mfaSecret
      );
      
      // First authenticate to get temporary token
      const authResult = authService.authenticate(credentials, password);
      const temporaryToken = authResult.temporaryToken!;
      
      // Act
      const result = authService.verifyMfa(credentials, invalidMfaToken, temporaryToken);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.requiresMfa).toBe(true);
      expect(result.error).toBe('Invalid MFA token');
    });
    
    it('should fail verification with invalid temporary token', () => {
      // Arrange
      const password = 'SecureP@ssw0rd';
      const hash = authService.hashPassword(password);
      const mfaSecret = authService.generateMfaSecret();
      const mfaToken = '123456';
      const invalidTempToken = 'invalid-token';
      
      // Create admin credentials with MFA
      const credentials = new AdminCredentials(
        'admin-123',
        'admin@example.com',
        new Date(),
        hash,
        mfaSecret
      );
      
      // Act
      const result = authService.verifyMfa(credentials, mfaToken, invalidTempToken);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.requiresMfa).toBe(true);
      expect(result.error).toBe('Invalid or expired temporary token');
    });
    
    it('should fail verification when MFA is not set up', () => {
      // Arrange
      const password = 'SecureP@ssw0rd';
      const hash = authService.hashPassword(password);
      const mfaToken = '123456';
      
      // Create admin credentials without MFA
      const credentials = new AdminCredentials(
        'admin-123',
        'admin@example.com',
        new Date(),
        hash
      );
      
      // Act
      const result = authService.verifyMfa(credentials, mfaToken, 'temp-token');
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('MFA not set up');
    });
    
    it('should fail verification when credentials are null', () => {
      // Act
      const result = authService.verifyMfa(null, '123456', 'temp-token');
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
  });
});