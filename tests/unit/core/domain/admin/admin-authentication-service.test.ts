/**
 * Unit tests for AdminAuthenticationService
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { AdminAuthenticationService } from '../../../../../core/domain/admin/admin-authentication-service';
import { IAuthProvider } from '../../../../../core/application/interfaces/auth/auth-provider';
import { AdminUser } from '../../../../../core/domain/admin/admin-user';
import { AdminRole } from '../../../../../core/domain/admin/admin-role';
import { MfaStatus } from '../../../../../core/domain/admin/mfa-status';

describe('AdminAuthenticationService', () => {
  let authProvider: IAuthProvider;
  let authService: AdminAuthenticationService;
  
  beforeEach(() => {
    // Create a mock auth provider
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
    
    // Create the authentication service with the mock auth provider
    authService = new AdminAuthenticationService(authProvider);
  });
  
  it('should authenticate with email and password', async () => {
    // Arrange
    const email = 'admin@example.com';
    const password = 'password123';
    const mockAuthResult = {
      userId: 'admin-123',
      token: 'auth-token-123'
    };
    
    (authProvider.authenticateWithEmailPassword as jest.Mock).mockResolvedValue(mockAuthResult);
    
    // Act
    const result = await authService.authenticateWithEmailPassword(email, password);
    
    // Assert
    expect(authProvider.authenticateWithEmailPassword).toHaveBeenCalledWith(email, password);
    expect(result).toEqual(mockAuthResult);
  });
  
  it('should verify MFA code', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mfaCode = '123456';
    const mfaSecret = 'mfa-secret';
    const mockVerifyResult = true;
    
    (authProvider.verifyMfaCode as jest.Mock).mockResolvedValue(mockVerifyResult);
    
    // Act
    const result = await authService.verifyMfaCode(adminId, mfaCode, mfaSecret);
    
    // Assert
    expect(authProvider.verifyMfaCode).toHaveBeenCalledWith(adminId, mfaCode, mfaSecret);
    expect(result).toBe(mockVerifyResult);
  });
  
  it('should generate MFA secret', async () => {
    // Arrange
    const mockSecret = 'generated-secret';
    (authProvider.generateMfaSecret as jest.Mock).mockResolvedValue(mockSecret);
    
    // Act
    const result = await authService.generateMfaSecret();
    
    // Assert
    expect(authProvider.generateMfaSecret).toHaveBeenCalled();
    expect(result).toBe(mockSecret);
  });
  
  it('should validate password', async () => {
    // Arrange
    const password = 'StrongP@ssw0rd';
    (authProvider.validatePassword as jest.Mock).mockResolvedValue(true);
    
    // Act
    const result = await authService.validatePassword(password);
    
    // Assert
    expect(authProvider.validatePassword).toHaveBeenCalledWith(password);
    expect(result).toBe(true);
  });
  
  it('should create a user with email and password', async () => {
    // Arrange
    const email = 'newadmin@example.com';
    const password = 'StrongP@ssw0rd';
    const mockUserId = 'new-admin-123';
    
    (authProvider.createUserWithEmailPassword as jest.Mock).mockResolvedValue({ userId: mockUserId });
    
    // Act
    const result = await authService.createUserWithEmailPassword(email, password);
    
    // Assert
    expect(authProvider.createUserWithEmailPassword).toHaveBeenCalledWith(email, password);
    expect(result.userId).toBe(mockUserId);
  });
  
  it('should get a user by ID', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mockUser = {
      id: adminId,
      email: 'admin@example.com',
      displayName: 'Test Admin'
    };
    
    (authProvider.getUserById as jest.Mock).mockResolvedValue(mockUser);
    
    // Act
    const result = await authService.getUserById(adminId);
    
    // Assert
    expect(authProvider.getUserById).toHaveBeenCalledWith(adminId);
    expect(result).toEqual(mockUser);
  });
  
  it('should determine if MFA verification is required', () => {
    // Arrange
    const adminWithMfa = new AdminUser({
      id: 'admin-123',
      email: 'admin@example.com',
      name: 'Admin With MFA',
      role: AdminRole.ADMIN,
      mfaStatus: MfaStatus.ENABLED
    });
    
    const adminWithoutMfa = new AdminUser({
      id: 'admin-456',
      email: 'admin2@example.com',
      name: 'Admin Without MFA',
      role: AdminRole.ADMIN,
      mfaStatus: MfaStatus.DISABLED
    });
    
    // Act & Assert
    expect(authService.requiresMfaVerification(adminWithMfa)).toBe(true);
    expect(authService.requiresMfaVerification(adminWithoutMfa)).toBe(false);
  });
  
  it('should generate a password hash', async () => {
    // Arrange
    const password = 'StrongP@ssw0rd';
    const mockHash = 'hashed-password';
    
    (authProvider.generatePasswordHash as jest.Mock).mockResolvedValue(mockHash);
    
    // Act
    const result = await authService.generatePasswordHash(password);
    
    // Assert
    expect(authProvider.generatePasswordHash).toHaveBeenCalledWith(password);
    expect(result).toBe(mockHash);
  });
});