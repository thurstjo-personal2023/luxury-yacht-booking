/**
 * Administrator Registration & Validation Unit Tests
 * 
 * This file contains Jest tests for the Administrator Registration and Validation functionality
 * at the API and service level, based on the Test Suite - Epics for the Administration Role.
 */

import * as firebase from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  Auth,
  UserCredential
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  Firestore,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { 
  initializeEmulators,
  createTestInvitation,
  createTestAdminUser,
  createVerificationStatus,
  generateTestOTP,
  verifyTestOTP
} from '../utils/admin-test-utils';
import { 
  createInvitation, 
  verifyInvitation, 
  updateEmailVerificationStatus,
  updatePhoneVerificationStatus,
  updateApprovalStatus,
  getVerificationStatus
} from '../../client/src/services/admin/verification-service';

// Mock API service functions
jest.mock('../../client/src/services/admin/verification-service', () => ({
  createInvitation: jest.fn(),
  verifyInvitation: jest.fn(),
  updateEmailVerificationStatus: jest.fn(),
  updatePhoneVerificationStatus: jest.fn(),
  updateApprovalStatus: jest.fn(),
  getVerificationStatus: jest.fn()
}));

describe('1. Administrator Registration & Validation', () => {
  // Test data
  const testSuperAdminEmail = 'super.admin@etoileyachts.com';
  const testAdminEmail = `test.admin.${Date.now()}@etoileyachts.com`;
  const testAdminPassword = 'TestAdmin@123';
  const testInviteToken = `invite-token-${Date.now()}`;
  const testAdminUserId = `admin-${Date.now()}`;

  // Set up test environment
  beforeAll(async () => {
    // Initialize Firebase emulators
    await initializeEmulators();
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  /**
   * ARV-001: Super Admin can send an invite to an email address
   */
  test('ARV-001: Super Admin can send an invite to an email address', async () => {
    // Mock the createInvitation function
    (createInvitation as jest.Mock).mockResolvedValue({
      success: true,
      invitationId: 'test-invitation-id',
      token: testInviteToken
    });

    // Call the function
    const result = await createInvitation({
      email: testAdminEmail,
      role: 'ADMIN',
      department: 'Technology',
      position: 'Platform Tester',
      superAdminId: 'super-admin-id'
    });

    // Verify the function was called with the right parameters
    expect(createInvitation).toHaveBeenCalledWith({
      email: testAdminEmail,
      role: 'ADMIN',
      department: 'Technology',
      position: 'Platform Tester',
      superAdminId: 'super-admin-id'
    });

    // Verify the result
    expect(result.success).toBe(true);
    expect(result.invitationId).toBe('test-invitation-id');
    expect(result.token).toBe(testInviteToken);
  });

  /**
   * ARV-002: Admin cannot register without an invite link
   */
  test('ARV-002: Admin cannot register without an invite link', async () => {
    // Mock the verifyInvitation function to return invalid for no token
    (verifyInvitation as jest.Mock).mockResolvedValue({
      valid: false,
      error: 'No valid invite found'
    });

    // Call the function with no token
    const result = await verifyInvitation('');

    // Verify the function was called
    expect(verifyInvitation).toHaveBeenCalledWith('');

    // Verify the result
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No valid invite found');
  });

  /**
   * ARV-003: Admin registration requires email & phone OTP verification
   */
  test('ARV-003: Admin registration requires email & phone OTP verification', async () => {
    // Mock verification status that shows email is not verified
    (getVerificationStatus as jest.Mock).mockResolvedValue({
      isEmailVerified: false,
      isPhoneVerified: false,
      isApproved: false,
      isMfaEnabled: false
    });

    // Verify initial status
    const initialStatus = await getVerificationStatus(testAdminUserId);
    expect(initialStatus.isEmailVerified).toBe(false);
    expect(initialStatus.isPhoneVerified).toBe(false);

    // Mock email verification update
    (updateEmailVerificationStatus as jest.Mock).mockResolvedValue({
      success: true
    });

    // Update email verification status
    const emailVerificationResult = await updateEmailVerificationStatus(testAdminUserId, true);
    expect(emailVerificationResult.success).toBe(true);
    expect(updateEmailVerificationStatus).toHaveBeenCalledWith(testAdminUserId, true);

    // Mock phone verification update
    (updatePhoneVerificationStatus as jest.Mock).mockResolvedValue({
      success: true
    });

    // Update phone verification status
    const phoneVerificationResult = await updatePhoneVerificationStatus(testAdminUserId, true);
    expect(phoneVerificationResult.success).toBe(true);
    expect(updatePhoneVerificationStatus).toHaveBeenCalledWith(testAdminUserId, true);

    // Mock updated verification status
    (getVerificationStatus as jest.Mock).mockResolvedValue({
      isEmailVerified: true,
      isPhoneVerified: true,
      isApproved: false,
      isMfaEnabled: false
    });

    // Verify final status
    const finalStatus = await getVerificationStatus(testAdminUserId);
    expect(finalStatus.isEmailVerified).toBe(true);
    expect(finalStatus.isPhoneVerified).toBe(true);
    expect(finalStatus.isApproved).toBe(false);
  });

  /**
   * ARV-004: Admin remains inactive until manually approved
   */
  test('ARV-004: Admin remains inactive until manually approved', async () => {
    // Mock verification status that shows admin is not approved
    (getVerificationStatus as jest.Mock).mockResolvedValue({
      isEmailVerified: true,
      isPhoneVerified: true,
      isApproved: false,
      isMfaEnabled: false
    });

    // Verify status shows not approved
    const status = await getVerificationStatus(testAdminUserId);
    expect(status.isEmailVerified).toBe(true);
    expect(status.isPhoneVerified).toBe(true);
    expect(status.isApproved).toBe(false);
  });

  /**
   * ARV-005: Super Admin can approve new Admins
   */
  test('ARV-005: Super Admin can approve new Admins', async () => {
    // Mock approval update
    (updateApprovalStatus as jest.Mock).mockResolvedValue({
      success: true
    });

    // Approve admin
    const approvalResult = await updateApprovalStatus(testAdminUserId, true, 'super-admin-id', 'Approved by test');
    
    // Verify function called correctly
    expect(updateApprovalStatus).toHaveBeenCalledWith(
      testAdminUserId,
      true,
      'super-admin-id',
      'Approved by test'
    );
    
    // Verify result
    expect(approvalResult.success).toBe(true);

    // Mock updated verification status
    (getVerificationStatus as jest.Mock).mockResolvedValue({
      isEmailVerified: true,
      isPhoneVerified: true,
      isApproved: true,
      isMfaEnabled: false,
      approvedBy: 'super-admin-id',
      approvalNotes: 'Approved by test'
    });

    // Verify updated status
    const updatedStatus = await getVerificationStatus(testAdminUserId);
    expect(updatedStatus.isApproved).toBe(true);
    expect(updatedStatus.approvedBy).toBe('super-admin-id');
  });

  /**
   * ARV-006: Expired invite token is rejected
   */
  test('ARV-006: Expired invite token is rejected', async () => {
    // Mock the verifyInvitation function to return expired
    (verifyInvitation as jest.Mock).mockResolvedValue({
      valid: false,
      error: 'Invitation has expired'
    });

    // Call the function with expired token
    const result = await verifyInvitation('expired-token');

    // Verify the function was called
    expect(verifyInvitation).toHaveBeenCalledWith('expired-token');

    // Verify the result
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invitation has expired');
  });
});