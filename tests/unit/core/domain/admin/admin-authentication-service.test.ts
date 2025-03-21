/**
 * Unit tests for AdminAuthenticationService
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { AdminAuthenticationService } from '../../../../../core/domain/admin/admin-authentication-service';
import { IAuthProvider } from '../../../../../core/application/interfaces/auth/auth-provider';

describe('AdminAuthenticationService', () => {
  let authProvider: IAuthProvider;
  let authService: AdminAuthenticationService;
  
  beforeEach(() => {
    // Mock auth provider
    authProvider = {
      authenticateWithEmailPassword: jest.fn(),
      createUserWithEmailPassword: jest.fn(),
      verifyMfaCode: jest.fn(),
      generateMfaSecret: jest.fn(),
      validatePassword: jest.fn(),
      getUserById: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      generatePasswordHash: jest.fn()
    };
    
    // Create service
    authService = new AdminAuthenticationService(authProvider);
  });
  
  describe('authenticateAdmin', () => {
    it('should authenticate admin with valid credentials', async () => {
      // Arrange
      const email = 'admin@example.com';
      const password = 'valid-password';
      const userId = 'admin-123';
      const token = 'valid-token';
      
      (authProvider.authenticateWithEmailPassword as jest.Mock).mockResolvedValue({
        userId,
        token
      });
      
      // Act
      const result = await authService.authenticateAdmin(email, password);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.token).toBe(token);
      expect(authProvider.authenticateWithEmailPassword).toHaveBeenCalledWith(email, password);
    });
    
    it('should return failure for invalid credentials', async () => {
      // Arrange
      const email = 'admin@example.com';
      const password = 'invalid-password';
      
      (authProvider.authenticateWithEmailPassword as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      );
      
      // Act
      const result = await authService.authenticateAdmin(email, password);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.userId).toBeUndefined();
      expect(result.token).toBeUndefined();
    });
  });
  
  describe('verifyMfaCode', () => {
    it('should verify valid MFA code', async () => {
      // Arrange
      const userId = 'admin-123';
      const mfaCode = '123456';
      const mfaSecret = 'mfa-secret';
      
      (authProvider.getUserById as jest.Mock).mockResolvedValue({
        mfaSecret
      });
      
      (authProvider.verifyMfaCode as jest.Mock).mockResolvedValue(true);
      
      // Act
      const result = await authService.verifyMfaCode(userId, mfaCode);
      
      // Assert
      expect(result.success).toBe(true);
      expect(authProvider.getUserById).toHaveBeenCalledWith(userId);
      expect(authProvider.verifyMfaCode).toHaveBeenCalledWith(userId, mfaCode, mfaSecret);
    });
    
    it('should return failure for invalid MFA code', async () => {
      // Arrange
      const userId = 'admin-123';
      const mfaCode = 'invalid-code';
      const mfaSecret = 'mfa-secret';
      
      (authProvider.getUserById as jest.Mock).mockResolvedValue({
        mfaSecret
      });
      
      (authProvider.verifyMfaCode as jest.Mock).mockResolvedValue(false);
      
      // Act
      const result = await authService.verifyMfaCode(userId, mfaCode);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid MFA code');
    });
    
    it('should return failure when MFA secret is missing', async () => {
      // Arrange
      const userId = 'admin-123';
      const mfaCode = '123456';
      
      (authProvider.getUserById as jest.Mock).mockResolvedValue({
        // No mfaSecret
      });
      
      // Act
      const result = await authService.verifyMfaCode(userId, mfaCode);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('MFA is not properly configured for this account');
    });
    
    it('should handle auth provider errors', async () => {
      // Arrange
      const userId = 'admin-123';
      const mfaCode = '123456';
      
      (authProvider.getUserById as jest.Mock).mockRejectedValue(
        new Error('User not found')
      );
      
      // Act
      const result = await authService.verifyMfaCode(userId, mfaCode);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });
  
  describe('generateMfaSecret', () => {
    it('should generate MFA secret and update user', async () => {
      // Arrange
      const userId = 'admin-123';
      const mfaSecret = 'generated-mfa-secret';
      const qrCodeUrl = 'qr-code-url';
      
      (authProvider.generateMfaSecret as jest.Mock).mockResolvedValue({
        mfaSecret,
        qrCodeUrl
      });
      
      (authProvider.updateUser as jest.Mock).mockResolvedValue({
        success: true
      });
      
      // Act
      const result = await authService.generateMfaSecret(userId, 'admin@example.com');
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.secret).toBe(mfaSecret);
      expect(result.qrCodeUrl).toBe(qrCodeUrl);
      expect(authProvider.generateMfaSecret).toHaveBeenCalled();
      expect(authProvider.updateUser).toHaveBeenCalledWith(userId, { mfaSecret });
    });
    
    it('should handle errors during MFA secret generation', async () => {
      // Arrange
      const userId = 'admin-123';
      
      (authProvider.generateMfaSecret as jest.Mock).mockRejectedValue(
        new Error('Failed to generate MFA secret')
      );
      
      // Act
      const result = await authService.generateMfaSecret(userId, 'admin@example.com');
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate MFA secret');
    });
  });
  
  describe('validatePassword', () => {
    it('should validate a strong password', async () => {
      // Arrange
      const password = 'StrongP@ssw0rd';
      
      (authProvider.validatePassword as jest.Mock).mockResolvedValue(true);
      
      // Act
      const result = await authService.validatePassword(password);
      
      // Assert
      expect(result).toBe(true);
      expect(authProvider.validatePassword).toHaveBeenCalledWith(password);
    });
    
    it('should reject a weak password', async () => {
      // Arrange
      const password = 'weak';
      
      (authProvider.validatePassword as jest.Mock).mockResolvedValue(false);
      
      // Act
      const result = await authService.validatePassword(password);
      
      // Assert
      expect(result).toBe(false);
    });
  });
  
  describe('createAdmin', () => {
    it('should create admin account with valid data', async () => {
      // Arrange
      const email = 'newadmin@example.com';
      const password = 'SecureP@ssw0rd';
      const userId = 'new-admin-123';
      
      (authProvider.validatePassword as jest.Mock).mockResolvedValue(true);
      
      (authProvider.createUserWithEmailPassword as jest.Mock).mockResolvedValue({
        userId,
        success: true
      });
      
      // Act
      const result = await authService.createAdmin(email, password);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.userId).toBe(userId);
      expect(authProvider.validatePassword).toHaveBeenCalledWith(password);
      expect(authProvider.createUserWithEmailPassword).toHaveBeenCalledWith(email, password);
    });
    
    it('should fail when password is weak', async () => {
      // Arrange
      const email = 'newadmin@example.com';
      const password = 'weak';
      
      (authProvider.validatePassword as jest.Mock).mockResolvedValue(false);
      
      // Act
      const result = await authService.createAdmin(email, password);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Password does not meet security requirements');
      expect(result.userId).toBeUndefined();
    });
    
    it('should handle auth provider errors', async () => {
      // Arrange
      const email = 'newadmin@example.com';
      const password = 'SecureP@ssw0rd';
      
      (authProvider.validatePassword as jest.Mock).mockResolvedValue(true);
      
      (authProvider.createUserWithEmailPassword as jest.Mock).mockRejectedValue(
        new Error('Email already in use')
      );
      
      // Act
      const result = await authService.createAdmin(email, password);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already in use');
      expect(result.userId).toBeUndefined();
    });
  });
});