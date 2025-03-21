/**
 * Firebase Admin Authentication Service Implementation
 * 
 * This module implements the IAdminAuthService interface using Firebase Authentication.
 */

import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  UserCredential,
  signInWithCustomToken,
  getIdTokenResult,
  User as FirebaseUser,
  deleteUser,
  RecaptchaVerifier,
  PhoneAuthProvider,
  linkWithCredential,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { 
  Firestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  query,
  collection,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
// Import for OTP generation
import * as otplib from 'otplib';
import * as qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

import { 
  IAdminAuthService, 
  AuthResult, 
  TokenVerificationResult, 
  EmailVerificationOptions, 
  PasswordResetOptions,
  MfaSetupResult,
  MfaVerificationResult,
  AdminInvitationResult,
  AdminInvitationVerificationResult,
  AdminLoginAudit
} from '../../core/application/interfaces/admin-auth-service';
import { Administrator } from '../../core/domain/user/administrator';
import { EmailAddress } from '../../core/domain/value-objects/email-address';
import { Password } from '../../core/domain/value-objects/password';
import { PhoneNumber } from '../../core/domain/value-objects/phone-number';
import { UserRole } from '../../core/domain/user/user-role';
import { IAdministratorRepository, AdministratorInvitation } from '../repositories/interfaces/administrator-repository';

/**
 * Firebase admin auth service configuration
 */
export interface FirebaseAdminAuthServiceConfig {
  adminsCollection: string;
  invitationsCollection: string;
  mfaSecretCollection: string;
  auditLogCollection: string;
  invitationExpiryDays: number;
  tokenExpirationMinutes: number;
  sessionTimeoutMinutes: number;
  otpIssuer: string;
  recoveryCodesCount: number;
}

/**
 * Firebase admin auth service implementation
 */
export class FirebaseAdminAuthService implements IAdminAuthService {
  constructor(
    private readonly auth: Auth,
    private readonly firestore: Firestore,
    private readonly adminRepository: IAdministratorRepository,
    private readonly config: FirebaseAdminAuthServiceConfig
  ) {}
  
  /**
   * Register a new user (not used for admin registration)
   */
  async register(
    email: EmailAddress,
    password: Password,
    firstName: string,
    lastName: string,
    role: UserRole,
    phone?: PhoneNumber
  ): Promise<AuthResult> {
    // Admin registration should only happen through invitations
    return {
      success: false,
      error: 'Admin registration must be done through invitation'
    };
  }
  
  /**
   * Admin login with email and password (first step)
   */
  async adminLogin(email: EmailAddress | string, password: string): Promise<AuthResult> {
    try {
      const emailStr = email instanceof EmailAddress ? email.value : email;
      
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        this.auth, 
        emailStr, 
        password
      );
      
      const firebaseUser = userCredential.user;
      
      // Get admin from repository
      const admin = await this.adminRepository.findById(firebaseUser.uid);
      
      if (!admin) {
        // This is a regular user, not an admin
        await this.logout('');
        
        return {
          success: false,
          error: 'User is not an administrator'
        };
      }
      
      // Check if admin is approved
      if (!admin.isApproved()) {
        await this.logout('');
        
        return {
          success: false,
          error: `Administrator account is ${admin.approvalStatus.toLowerCase()}`
        };
      }
      
      // Check if MFA is required and set up
      if (admin.mfaEnabled) {
        // Return success but indicate MFA is required
        const tokenResult = await firebaseUser.getIdTokenResult();
        
        return {
          success: true,
          user: admin,
          token: tokenResult.token,
          refreshToken: firebaseUser.refreshToken,
          expiresAt: new Date(tokenResult.expirationTime)
        };
      }
      
      // If MFA is not set up, admin needs to set it up first
      if (!admin.mfaEnabled) {
        return {
          success: false,
          user: admin,
          error: 'MFA setup required'
        };
      }
      
      // Update login timestamp
      const updatedAdmin = admin.updateActivity();
      await this.adminRepository.save(updatedAdmin);
      
      // Log the login
      await this.logAdminLoginAttempt({
        adminId: admin.id,
        ipAddress: 'unknown', // In a real app, this would come from the request
        userAgent: 'unknown', // In a real app, this would come from the request
        timestamp: new Date(),
        success: true
      });
      
      // Get token information
      const tokenResult = await firebaseUser.getIdTokenResult();
      
      return {
        success: true,
        user: updatedAdmin,
        token: tokenResult.token,
        refreshToken: firebaseUser.refreshToken,
        expiresAt: new Date(tokenResult.expirationTime)
      };
    } catch (error) {
      console.error('Admin login error:', error);
      
      // Log the failed login attempt
      try {
        // Try to extract email from the error or use the provided email
        const emailStr = email instanceof EmailAddress ? email.value : String(email);
        
        await this.logAdminLoginAttempt({
          adminId: 'unknown', // We don't know the admin ID for failed logins
          ipAddress: 'unknown',
          userAgent: 'unknown',
          timestamp: new Date(),
          success: false,
          failureReason: error instanceof Error ? error.message : String(error)
        });
      } catch (logError) {
        console.error('Error logging failed login:', logError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Normal login (for comparison with adminLogin)
   */
  async login(email: EmailAddress | string, password: string): Promise<AuthResult> {
    // Redirect to adminLogin for consistency
    return this.adminLogin(email, password);
  }
  
  /**
   * Logout a user
   */
  async logout(token: string): Promise<boolean> {
    try {
      await signOut(this.auth);
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }
  
  /**
   * Refresh an authentication token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Firebase Web SDK doesn't have a direct way to refresh a token
      // The token is refreshed automatically when needed
      
      const currentUser = this.auth.currentUser;
      
      if (!currentUser) {
        return {
          success: false,
          error: 'No user is currently logged in'
        };
      }
      
      // Force token refresh
      await this.auth.updateCurrentUser(currentUser);
      
      // Get the fresh token
      const tokenResult = await currentUser.getIdTokenResult(true);
      
      // Get admin from repository
      const admin = await this.adminRepository.findById(currentUser.uid);
      
      if (!admin) {
        return {
          success: false,
          error: 'Administrator not found in repository'
        };
      }
      
      // Update activity timestamp
      const updatedAdmin = admin.updateActivity();
      await this.adminRepository.save(updatedAdmin);
      
      return {
        success: true,
        user: updatedAdmin,
        token: tokenResult.token,
        refreshToken: currentUser.refreshToken,
        expiresAt: new Date(tokenResult.expirationTime)
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Verify an authentication token
   */
  async verifyToken(token: string): Promise<TokenVerificationResult> {
    try {
      // For client-side applications, Firebase handles token verification internally
      
      const currentUser = this.auth.currentUser;
      
      if (!currentUser) {
        return {
          isValid: false,
          error: 'No user is currently logged in'
        };
      }
      
      // Check if the token matches the current user's token
      const idTokenResult = await currentUser.getIdTokenResult();
      
      if (idTokenResult.token !== token) {
        return {
          isValid: false,
          error: 'Token does not match current user'
        };
      }
      
      // Check if token is expired
      const expirationTime = new Date(idTokenResult.expirationTime).getTime();
      const currentTime = Date.now();
      
      if (expirationTime < currentTime) {
        return {
          isValid: false,
          error: 'Token is expired'
        };
      }
      
      // Get admin from repository to verify role and other information
      const admin = await this.adminRepository.findById(currentUser.uid);
      
      if (!admin) {
        return {
          isValid: false,
          error: 'Administrator not found in repository'
        };
      }
      
      // Check if admin is approved
      if (!admin.isApproved()) {
        return {
          isValid: false,
          error: `Administrator account is ${admin.approvalStatus.toLowerCase()}`
        };
      }
      
      // Check if session is active
      if (!admin.isSessionActive(this.config.sessionTimeoutMinutes)) {
        return {
          isValid: false,
          error: 'Session has expired due to inactivity'
        };
      }
      
      return {
        isValid: true,
        userId: currentUser.uid,
        email: currentUser.email || undefined,
        role: admin.role
      };
    } catch (error) {
      console.error('Token verification error:', error);
      
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Complete admin login with MFA verification
   */
  async verifyMfa(userId: string, mfaCode: string): Promise<MfaVerificationResult> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser || currentUser.uid !== userId) {
        return {
          success: false,
          error: 'No matching user is currently logged in'
        };
      }
      
      // Get admin from repository
      const admin = await this.adminRepository.findById(userId);
      
      if (!admin) {
        return {
          success: false,
          error: 'Administrator not found'
        };
      }
      
      // Check if MFA is enabled for this admin
      if (!admin.mfaEnabled || !admin.mfaSecret) {
        return {
          success: false,
          error: 'MFA is not enabled for this administrator'
        };
      }
      
      // Get MFA secret from database
      const mfaSecretRef = doc(this.firestore, this.config.mfaSecretCollection, userId);
      const mfaSecretDoc = await getDoc(mfaSecretRef);
      
      if (!mfaSecretDoc.exists()) {
        return {
          success: false,
          error: 'MFA secret not found'
        };
      }
      
      const secretData = mfaSecretDoc.data();
      const secret = secretData.secret;
      
      // Verify the MFA code
      otplib.authenticator.options = { 
        window: 1, // Allow codes from 30 seconds ago
        digits: 6
      };
      
      const isValid = otplib.authenticator.verify({
        token: mfaCode,
        secret
      });
      
      if (!isValid) {
        // Log the failed MFA attempt
        await this.logAdminLoginAttempt({
          adminId: userId,
          ipAddress: 'unknown',
          userAgent: 'unknown',
          timestamp: new Date(),
          success: false,
          failureReason: 'Invalid MFA code'
        });
        
        return {
          success: false,
          error: 'Invalid MFA code'
        };
      }
      
      // Update activity timestamp
      const updatedAdmin = admin.updateActivity();
      await this.adminRepository.save(updatedAdmin);
      
      // Log the successful MFA verification
      await this.logAdminLoginAttempt({
        adminId: userId,
        ipAddress: 'unknown',
        userAgent: 'unknown',
        timestamp: new Date(),
        success: true
      });
      
      // Get token information
      const tokenResult = await currentUser.getIdTokenResult(true);
      
      return {
        success: true,
        token: tokenResult.token,
        refreshToken: currentUser.refreshToken,
        expiresAt: new Date(tokenResult.expirationTime)
      };
    } catch (error) {
      console.error('MFA verification error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Verify admin login with a recovery code
   */
  async verifyWithRecoveryCode(userId: string, recoveryCode: string): Promise<MfaVerificationResult> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser || currentUser.uid !== userId) {
        return {
          success: false,
          error: 'No matching user is currently logged in'
        };
      }
      
      // Get admin from repository
      const admin = await this.adminRepository.findById(userId);
      
      if (!admin) {
        return {
          success: false,
          error: 'Administrator not found'
        };
      }
      
      // Check if MFA is enabled for this admin
      if (!admin.mfaEnabled || !admin.mfaSecret) {
        return {
          success: false,
          error: 'MFA is not enabled for this administrator'
        };
      }
      
      // Get MFA secret and recovery codes from database
      const mfaSecretRef = doc(this.firestore, this.config.mfaSecretCollection, userId);
      const mfaSecretDoc = await getDoc(mfaSecretRef);
      
      if (!mfaSecretDoc.exists()) {
        return {
          success: false,
          error: 'MFA secret not found'
        };
      }
      
      const secretData = mfaSecretDoc.data();
      const recoveryCodes = secretData.recoveryCodes || [];
      
      // Check if the recovery code is valid
      const trimmedCode = recoveryCode.trim();
      const codeIndex = recoveryCodes.indexOf(trimmedCode);
      
      if (codeIndex === -1) {
        // Log the failed recovery attempt
        await this.logAdminLoginAttempt({
          adminId: userId,
          ipAddress: 'unknown',
          userAgent: 'unknown',
          timestamp: new Date(),
          success: false,
          failureReason: 'Invalid recovery code'
        });
        
        return {
          success: false,
          error: 'Invalid recovery code'
        };
      }
      
      // Remove the used recovery code
      recoveryCodes.splice(codeIndex, 1);
      
      // Update the recovery codes in the database
      await updateDoc(mfaSecretRef, {
        recoveryCodes
      });
      
      // Update activity timestamp
      const updatedAdmin = admin.updateActivity();
      await this.adminRepository.save(updatedAdmin);
      
      // Log the successful recovery
      await this.logAdminLoginAttempt({
        adminId: userId,
        ipAddress: 'unknown',
        userAgent: 'unknown',
        timestamp: new Date(),
        success: true
      });
      
      // Get token information
      const tokenResult = await currentUser.getIdTokenResult(true);
      
      return {
        success: true,
        token: tokenResult.token,
        refreshToken: currentUser.refreshToken,
        expiresAt: new Date(tokenResult.expirationTime)
      };
    } catch (error) {
      console.error('Recovery code verification error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Setup MFA for an admin
   */
  async setupMfa(adminId: string): Promise<MfaSetupResult> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser || currentUser.uid !== adminId) {
        return {
          success: false,
          error: 'No matching user is currently logged in'
        };
      }
      
      // Get admin from repository
      const admin = await this.adminRepository.findById(adminId);
      
      if (!admin) {
        return {
          success: false,
          error: 'Administrator not found'
        };
      }
      
      // Generate a new secret
      const secret = otplib.authenticator.generateSecret();
      
      // Generate recovery codes
      const recoveryCodes = this.generateRecoveryCodesArray(this.config.recoveryCodesCount);
      
      // Create QR code
      const userEmail = admin.email.value;
      const otpauth = otplib.authenticator.keyuri(userEmail, this.config.otpIssuer, secret);
      const qrCodeUrl = await qrcode.toDataURL(otpauth);
      
      // Store the secret and recovery codes in Firestore
      const mfaSecretRef = doc(this.firestore, this.config.mfaSecretCollection, adminId);
      await setDoc(mfaSecretRef, {
        secret,
        recoveryCodes,
        createdAt: serverTimestamp()
      });
      
      return {
        success: true,
        secretKey: secret,
        qrCodeUrl,
        recoveryCodes
      };
    } catch (error) {
      console.error('MFA setup error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Enable MFA after setup
   */
  async enableMfa(adminId: string, mfaCode: string): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser || currentUser.uid !== adminId) {
        return false;
      }
      
      // Get admin from repository
      const admin = await this.adminRepository.findById(adminId);
      
      if (!admin) {
        return false;
      }
      
      // Get MFA secret from database
      const mfaSecretRef = doc(this.firestore, this.config.mfaSecretCollection, adminId);
      const mfaSecretDoc = await getDoc(mfaSecretRef);
      
      if (!mfaSecretDoc.exists()) {
        return false;
      }
      
      const secretData = mfaSecretDoc.data();
      const secret = secretData.secret;
      
      // Verify the MFA code
      otplib.authenticator.options = { 
        window: 1, // Allow codes from 30 seconds ago
        digits: 6
      };
      
      const isValid = otplib.authenticator.verify({
        token: mfaCode,
        secret
      });
      
      if (!isValid) {
        return false;
      }
      
      // Update admin record to enable MFA
      const updatedAdmin = admin.enableMfa(secret);
      await this.adminRepository.save(updatedAdmin);
      
      return true;
    } catch (error) {
      console.error('Enable MFA error:', error);
      return false;
    }
  }
  
  /**
   * Disable MFA for an admin
   */
  async disableMfa(adminId: string, password: string): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser || currentUser.uid !== adminId) {
        return false;
      }
      
      // Re-authenticate the user first
      if (!currentUser.email) {
        return false;
      }
      
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Get admin from repository
      const admin = await this.adminRepository.findById(adminId);
      
      if (!admin) {
        return false;
      }
      
      // Update admin record to disable MFA
      const updatedAdmin = admin.disableMfa();
      await this.adminRepository.save(updatedAdmin);
      
      // Remove MFA secret from database
      const mfaSecretRef = doc(this.firestore, this.config.mfaSecretCollection, adminId);
      await deleteDoc(mfaSecretRef);
      
      return true;
    } catch (error) {
      console.error('Disable MFA error:', error);
      return false;
    }
  }
  
  /**
   * Generate new recovery codes
   */
  async generateRecoveryCodes(adminId: string, password: string): Promise<string[]> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser || currentUser.uid !== adminId) {
        return [];
      }
      
      // Re-authenticate the user first
      if (!currentUser.email) {
        return [];
      }
      
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Get admin from repository
      const admin = await this.adminRepository.findById(adminId);
      
      if (!admin || !admin.mfaEnabled) {
        return [];
      }
      
      // Generate new recovery codes
      const recoveryCodes = this.generateRecoveryCodesArray(this.config.recoveryCodesCount);
      
      // Get MFA secret from database
      const mfaSecretRef = doc(this.firestore, this.config.mfaSecretCollection, adminId);
      const mfaSecretDoc = await getDoc(mfaSecretRef);
      
      if (!mfaSecretDoc.exists()) {
        return [];
      }
      
      // Update recovery codes in database
      await updateDoc(mfaSecretRef, {
        recoveryCodes,
        updatedAt: serverTimestamp()
      });
      
      return recoveryCodes;
    } catch (error) {
      console.error('Generate recovery codes error:', error);
      return [];
    }
  }
  
  /**
   * Create an invitation for a new admin
   */
  async createAdminInvitation(
    email: EmailAddress | string,
    role: UserRole,
    invitedBy: string
  ): Promise<AdminInvitationResult> {
    try {
      const emailStr = email instanceof EmailAddress ? email.value : email;
      
      // Check if a user with this email already exists
      const signInMethods = await fetchSignInMethodsForEmail(this.auth, emailStr);
      
      if (signInMethods.length > 0) {
        return {
          success: false,
          error: 'A user with this email already exists'
        };
      }
      
      // Check if there's already an invitation for this email
      const existingInvitations = await this.adminRepository.findInvitationsByEmail(emailStr);
      
      if (existingInvitations.length > 0) {
        // Filter only valid (non-expired) invitations
        const validInvitations = existingInvitations.filter(invite => 
          invite.expiresAt.getTime() > Date.now() && !invite.isAccepted
        );
        
        if (validInvitations.length > 0) {
          return {
            success: false,
            error: 'An invitation for this email already exists'
          };
        }
      }
      
      // Generate invitation token
      const token = this.generateInvitationToken();
      
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.config.invitationExpiryDays);
      
      // Create invitation
      const invitation: Omit<AdministratorInvitation, 'id'> = {
        email: emailStr,
        token,
        role,
        invitedBy,
        invitedAt: new Date(),
        expiresAt,
        isAccepted: false
      };
      
      // Save invitation to repository
      const savedInvitation = await this.adminRepository.createInvitation(invitation);
      
      // Generate invitation link (in a real app, this would be a URL to the registration page)
      const invitationLink = `/admin/register?token=${token}`;
      
      return {
        success: true,
        invitationId: savedInvitation.id,
        invitationToken: token,
        invitationLink,
        email: emailStr,
        expiresAt
      };
    } catch (error) {
      console.error('Create admin invitation error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Verify an admin invitation token
   */
  async verifyAdminInvitation(token: string): Promise<AdminInvitationVerificationResult> {
    try {
      // Find invitation by token
      const invitation = await this.adminRepository.findInvitationByToken(token);
      
      if (!invitation) {
        return {
          isValid: false,
          error: 'Invalid invitation token'
        };
      }
      
      // Check if invitation is expired
      if (invitation.expiresAt.getTime() < Date.now()) {
        return {
          isValid: false,
          error: 'Invitation has expired'
        };
      }
      
      // Check if invitation is already accepted
      if (invitation.isAccepted) {
        return {
          isValid: false,
          error: 'Invitation has already been accepted'
        };
      }
      
      return {
        isValid: true,
        invitationId: invitation.id,
        email: invitation.email,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        expiresAt: invitation.expiresAt
      };
    } catch (error) {
      console.error('Verify admin invitation error:', error);
      
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Register a new admin using an invitation
   */
  async registerAdminWithInvitation(
    invitationToken: string,
    password: Password,
    firstName: string,
    lastName: string,
    phone: string,
    employeeId: string,
    department: string,
    position: string
  ): Promise<AuthResult> {
    try {
      // Verify invitation token
      const verification = await this.verifyAdminInvitation(invitationToken);
      
      if (!verification.isValid) {
        return {
          success: false,
          error: verification.error
        };
      }
      
      // Get the invitation
      const invitation = await this.adminRepository.findInvitationByToken(invitationToken);
      
      if (!invitation) {
        return {
          success: false,
          error: 'Invitation not found'
        };
      }
      
      // Create Firebase auth user
      const { email, role } = invitation;
      const userCredential = await createUserWithEmailAndPassword(
        this.auth, 
        email, 
        password.value
      );
      
      const firebaseUser = userCredential.user;
      
      // Create admin entity
      const admin = new Administrator({
        id: firebaseUser.uid,
        firstName,
        lastName,
        email: new EmailAddress(email),
        phone: new PhoneNumber(phone),
        role,
        isEmailVerified: firebaseUser.emailVerified,
        employeeId,
        department,
        position,
        approvalStatus: 'PENDING',
        mfaEnabled: false,
        createdAt: new Date(),
        invitationId: invitation.id,
        invitedBy: invitation.invitedBy
      });
      
      // Save admin to repository
      await this.adminRepository.save(admin);
      
      // Mark invitation as accepted
      await this.adminRepository.markInvitationAsAccepted(invitation.id);
      
      // Log the registration
      await this.logAdminLoginAttempt({
        adminId: admin.id,
        ipAddress: 'unknown',
        userAgent: 'unknown',
        timestamp: new Date(),
        success: true
      });
      
      // Send email verification
      await sendEmailVerification(firebaseUser);
      
      // Get token information
      const tokenResult = await firebaseUser.getIdTokenResult();
      
      return {
        success: true,
        user: admin,
        token: tokenResult.token,
        refreshToken: firebaseUser.refreshToken,
        expiresAt: new Date(tokenResult.expirationTime)
      };
    } catch (error) {
      console.error('Register admin with invitation error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Log an admin login attempt
   */
  async logAdminLoginAttempt(audit: Omit<AdminLoginAudit, 'id'>): Promise<AdminLoginAudit> {
    try {
      const id = uuidv4();
      const auditRef = doc(this.firestore, this.config.auditLogCollection, id);
      
      const auditData = {
        ...audit,
        id,
        timestamp: audit.timestamp instanceof Date ? Timestamp.fromDate(audit.timestamp) : Timestamp.now()
      };
      
      await setDoc(auditRef, auditData);
      
      return { ...auditData, timestamp: audit.timestamp };
    } catch (error) {
      console.error('Log admin login attempt error:', error);
      
      const id = uuidv4();
      return { 
        id,
        ...audit,
        failureReason: `Failed to log audit: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Update admin last activity timestamp
   */
  async updateAdminActivity(adminId: string): Promise<boolean> {
    try {
      const admin = await this.adminRepository.findById(adminId);
      
      if (!admin) {
        return false;
      }
      
      const updatedAdmin = admin.updateActivity();
      await this.adminRepository.save(updatedAdmin);
      
      return true;
    } catch (error) {
      console.error('Update admin activity error:', error);
      return false;
    }
  }
  
  /**
   * Check if an admin's session is active
   */
  async isAdminSessionActive(adminId: string, timeoutMinutes?: number): Promise<boolean> {
    try {
      const admin = await this.adminRepository.findById(adminId);
      
      if (!admin) {
        return false;
      }
      
      return admin.isSessionActive(timeoutMinutes || this.config.sessionTimeoutMinutes);
    } catch (error) {
      console.error('Check admin session error:', error);
      return false;
    }
  }
  
  /**
   * Update admin IP whitelist
   */
  async updateIpWhitelist(adminId: string, ipAddresses: string[]): Promise<boolean> {
    try {
      const admin = await this.adminRepository.findById(adminId);
      
      if (!admin) {
        return false;
      }
      
      const updatedAdmin = admin.updateIpWhitelist(ipAddresses);
      await this.adminRepository.save(updatedAdmin);
      
      return true;
    } catch (error) {
      console.error('Update IP whitelist error:', error);
      return false;
    }
  }
  
  /**
   * Check if an IP is whitelisted for an admin
   */
  async isIpWhitelisted(adminId: string, ipAddress: string): Promise<boolean> {
    try {
      const admin = await this.adminRepository.findById(adminId);
      
      if (!admin) {
        return false;
      }
      
      return admin.isIpWhitelisted(ipAddress);
    } catch (error) {
      console.error('Check IP whitelist error:', error);
      return false;
    }
  }
  
  /**
   * Get the currently authenticated admin
   */
  async getCurrentAdmin(token: string): Promise<Administrator | null> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser) {
        return null;
      }
      
      // Verify that the provided token matches the current user's token
      const idTokenResult = await currentUser.getIdTokenResult();
      
      if (idTokenResult.token !== token) {
        return null;
      }
      
      // Get admin from repository
      return this.adminRepository.findById(currentUser.uid);
    } catch (error) {
      console.error('Get current admin error:', error);
      return null;
    }
  }
  
  /**
   * Check if admin has super admin role
   */
  async isSuperAdmin(token: string): Promise<boolean> {
    try {
      const result = await this.verifyToken(token);
      
      if (!result.isValid || !result.userId) {
        return false;
      }
      
      const admin = await this.adminRepository.findById(result.userId);
      
      if (!admin) {
        return false;
      }
      
      return admin.role === UserRole.SUPER_ADMINISTRATOR;
    } catch (error) {
      console.error('Super admin check error:', error);
      return false;
    }
  }
  
  /**
   * Approve a pending admin account
   */
  async approveAdmin(adminId: string, approvedById: string): Promise<boolean> {
    try {
      // Get the admin to be approved
      const admin = await this.adminRepository.findById(adminId);
      
      if (!admin) {
        return false;
      }
      
      // Check if admin is already approved
      if (admin.isApproved()) {
        return true; // Already approved, consider it a success
      }
      
      // Get the approver admin
      const approver = await this.adminRepository.findById(approvedById);
      
      if (!approver) {
        return false;
      }
      
      // Check if approver is a super admin
      if (approver.role !== UserRole.SUPER_ADMINISTRATOR) {
        return false;
      }
      
      // Approve the admin
      const updatedAdmin = admin.approve(approvedById);
      await this.adminRepository.save(updatedAdmin);
      
      return true;
    } catch (error) {
      console.error('Approve admin error:', error);
      return false;
    }
  }
  
  /**
   * Reject a pending admin account
   */
  async rejectAdmin(adminId: string, rejectedById: string, reason: string): Promise<boolean> {
    try {
      // Get the admin to be rejected
      const admin = await this.adminRepository.findById(adminId);
      
      if (!admin) {
        return false;
      }
      
      // Check if admin is already rejected
      if (admin.isRejected()) {
        return true; // Already rejected, consider it a success
      }
      
      // Get the rejector admin
      const rejector = await this.adminRepository.findById(rejectedById);
      
      if (!rejector) {
        return false;
      }
      
      // Check if rejector is a super admin
      if (rejector.role !== UserRole.SUPER_ADMINISTRATOR) {
        return false;
      }
      
      // Reject the admin
      const updatedAdmin = admin.reject(rejectedById, reason);
      await this.adminRepository.save(updatedAdmin);
      
      return true;
    } catch (error) {
      console.error('Reject admin error:', error);
      return false;
    }
  }
  
  /**
   * Send an email verification link
   */
  async sendEmailVerification(
    userId: string,
    options?: EmailVerificationOptions
  ): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser || currentUser.uid !== userId) {
        return false;
      }
      
      const actionCodeSettings = options?.redirectUrl ? {
        url: options.redirectUrl
      } : undefined;
      
      await sendEmailVerification(currentUser, actionCodeSettings);
      
      return true;
    } catch (error) {
      console.error('Email verification error:', error);
      return false;
    }
  }
  
  /**
   * Verify an email verification token
   */
  async verifyEmail(token: string): Promise<boolean> {
    // Firebase handles email verification automatically
    // This implementation is the same as in FirebaseAuthService
    
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser) {
        return false;
      }
      
      // Reload user to get the latest email verification status
      await currentUser.reload();
      
      if (currentUser.emailVerified) {
        // Update our repository to reflect the verified email
        const admin = await this.adminRepository.findById(currentUser.uid);
        
        if (admin) {
          const updatedAdmin = new Administrator({
            ...admin,
            isEmailVerified: true,
            updatedAt: new Date()
          });
          
          await this.adminRepository.save(updatedAdmin);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Email verification check error:', error);
      return false;
    }
  }
  
  /**
   * Send a password reset email
   */
  async sendPasswordReset(
    email: EmailAddress | string,
    options?: PasswordResetOptions
  ): Promise<boolean> {
    try {
      const emailStr = email instanceof EmailAddress ? email.value : email;
      
      // Check if the email belongs to an admin
      const adminsRef = collection(this.firestore, this.config.adminsCollection);
      const q = query(adminsRef, where('email', '==', emailStr));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return false; // Not an admin
      }
      
      const actionCodeSettings = options?.redirectUrl ? {
        url: options.redirectUrl
      } : undefined;
      
      await sendPasswordResetEmail(this.auth, emailStr, actionCodeSettings);
      
      return true;
    } catch (error) {
      console.error('Password reset email error:', error);
      return false;
    }
  }
  
  /**
   * Reset a password using a reset token
   */
  async resetPassword(token: string, newPassword: Password): Promise<boolean> {
    try {
      // Verify the password reset code
      await verifyPasswordResetCode(this.auth, token);
      
      // Confirm the password reset
      await confirmPasswordReset(this.auth, token, newPassword.value);
      
      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      return false;
    }
  }
  
  /**
   * Change a user's password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: Password
  ): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser || currentUser.uid !== userId) {
        return false;
      }
      
      // Re-authenticate the user first
      if (!currentUser.email) {
        return false;
      }
      
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update the password
      await updatePassword(currentUser, newPassword.value);
      
      return true;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  }
  
  /**
   * Update a user's email
   */
  async updateEmail(userId: string, newEmail: EmailAddress): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser || currentUser.uid !== userId) {
        return false;
      }
      
      // Update email in Firebase Auth
      await updateEmail(currentUser, newEmail.value);
      
      // Update email in our repository
      const admin = await this.adminRepository.findById(userId);
      
      if (admin) {
        const updatedAdmin = new Administrator({
          ...admin,
          email: newEmail,
          isEmailVerified: false, // Email verification status is reset
          updatedAt: new Date()
        });
        
        await this.adminRepository.save(updatedAdmin);
      }
      
      return true;
    } catch (error) {
      console.error('Update email error:', error);
      return false;
    }
  }
  
  /**
   * Check if a user is authenticated
   */
  async isAuthenticated(token: string): Promise<boolean> {
    try {
      const result = await this.verifyToken(token);
      return result.isValid;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }
  
  /**
   * Check if a user has a specific role
   */
  async hasRole(token: string, role: UserRole): Promise<boolean> {
    try {
      const result = await this.verifyToken(token);
      
      if (!result.isValid || !result.userId) {
        return false;
      }
      
      const admin = await this.adminRepository.findById(result.userId);
      
      if (!admin) {
        return false;
      }
      
      return admin.role === role;
    } catch (error) {
      console.error('Role check error:', error);
      return false;
    }
  }
  
  /**
   * Check if a user has a specific permission
   */
  async hasPermission(token: string, permission: string): Promise<boolean> {
    try {
      const result = await this.verifyToken(token);
      
      if (!result.isValid || !result.userId || !result.role) {
        return false;
      }
      
      // Get the admin to determine their role
      const admin = await this.adminRepository.findById(result.userId);
      
      if (!admin) {
        return false;
      }
      
      // Check if the role has the required permission
      return admin.hasPermission(permission);
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }
  
  /**
   * Generate a random invitation token
   */
  private generateInvitationToken(): string {
    return uuidv4();
  }
  
  /**
   * Generate an array of recovery codes
   */
  private generateRecoveryCodesArray(count: number): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      codes.push(this.generateRecoveryCode());
    }
    
    return codes;
  }
  
  /**
   * Generate a single recovery code
   */
  private generateRecoveryCode(): string {
    // Format: XXXX-XXXX-XXXX
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      if (j < 2) {
        code += '-';
      }
    }
    
    return code;
  }
}