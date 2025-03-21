/**
 * Admin Authentication Usage Example
 * 
 * This file demonstrates how to use the admin authentication system
 * with proper separation of concerns and clean architecture principles.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { getApp } from 'firebase-admin/app';
import { createAdminAuthModules } from '../../core/application/factories/admin-auth-factory';
import { AdminRole } from '../../core/domain/admin/admin-role';

/**
 * Example showing how to authenticate an admin
 */
async function authenticateAdminExample(email: string, password: string) {
  // Initialize the admin auth modules
  const firebaseApp = getApp();
  const firestore = getFirestore(firebaseApp);
  
  const adminAuth = createAdminAuthModules({
    firestore,
    firebaseApp
  });
  
  // Authenticate the admin
  const result = await adminAuth.authenticateAdminUseCase.execute(email, password);
  
  if (result.success) {
    console.log('Authentication successful');
    console.log('Admin:', result.admin);
    console.log('Token:', result.token);
    
    if (result.requiresMfa) {
      console.log('MFA verification required');
      // In a real application, you would redirect to the MFA verification page
    }
  } else {
    console.error('Authentication failed:', result.error);
  }
}

/**
 * Example showing how to verify MFA for an admin
 */
async function verifyMfaExample(adminId: string, mfaCode: string) {
  // Initialize the admin auth modules
  const firebaseApp = getApp();
  const firestore = getFirestore(firebaseApp);
  
  const adminAuth = createAdminAuthModules({
    firestore,
    firebaseApp
  });
  
  // Verify MFA
  const result = await adminAuth.verifyAdminMfaUseCase.execute(adminId, mfaCode);
  
  if (result.success) {
    console.log('MFA verification successful');
    console.log('Admin:', result.admin);
    console.log('Token:', result.token);
  } else {
    console.error('MFA verification failed:', result.error);
  }
}

/**
 * Example showing how to create an admin invitation
 */
async function createInvitationExample(
  email: string,
  name: string,
  role: AdminRole,
  invitedByAdminId: string
) {
  // Initialize the admin auth modules
  const firebaseApp = getApp();
  const firestore = getFirestore(firebaseApp);
  
  const adminAuth = createAdminAuthModules({
    firestore,
    firebaseApp
  });
  
  // Create invitation
  const result = await adminAuth.createAdminInvitationUseCase.execute({
    email,
    name,
    role,
    invitedByAdminId
  });
  
  if (result.success) {
    console.log('Invitation created successfully');
    console.log('Invitation:', result.invitation);
    console.log('Invitation Code:', result.invitationCode);
    
    // In a real application, you would send an email with the invitation code
  } else {
    console.error('Failed to create invitation:', result.error);
  }
}

/**
 * Example showing how to verify an admin invitation
 */
async function verifyInvitationExample(email: string, code: string) {
  // Initialize the admin auth modules
  const firebaseApp = getApp();
  const firestore = getFirestore(firebaseApp);
  
  const adminAuth = createAdminAuthModules({
    firestore,
    firebaseApp
  });
  
  // Verify invitation
  const result = await adminAuth.verifyAdminInvitationUseCase.execute(email, code);
  
  if (result.valid) {
    console.log('Invitation is valid');
    console.log('Invitation:', result.invitation);
    
    // In a real application, you would proceed to the registration form
  } else {
    console.error('Invalid invitation:', result.error);
  }
}

/**
 * Example showing how to register a new admin using an invitation
 */
async function registerAdminExample(
  email: string,
  password: string,
  name: string,
  phoneNumber: string,
  invitationCode: string
) {
  // Initialize the admin auth modules
  const firebaseApp = getApp();
  const firestore = getFirestore(firebaseApp);
  
  const adminAuth = createAdminAuthModules({
    firestore,
    firebaseApp
  });
  
  // Register admin
  const result = await adminAuth.registerAdminUseCase.execute({
    email,
    password,
    name,
    phoneNumber,
    invitationCode
  });
  
  if (result.success) {
    console.log('Admin registered successfully');
    console.log('Admin:', result.admin);
    
    if (result.requiresApproval) {
      console.log('Admin account requires approval by a Super Admin');
      // In a real application, you would notify the Super Admin
    }
  } else {
    console.error('Registration failed:', result.error);
  }
}

// Example usage (these would typically be called from API routes)
async function runExamples() {
  // These are example calls and won't actually run with these placeholder values
  
  // 1. Create an invitation for a new admin
  await createInvitationExample(
    'new.admin@example.com',
    'New Admin',
    AdminRole.ADMIN,
    'super-admin-id-123'
  );
  
  // 2. Verify the invitation
  await verifyInvitationExample(
    'new.admin@example.com',
    'invitation-code-123'
  );
  
  // 3. Register the admin
  await registerAdminExample(
    'new.admin@example.com',
    'SecureP@ssw0rd',
    'New Admin',
    '+1234567890',
    'invitation-code-123'
  );
  
  // 4. Authenticate the admin
  await authenticateAdminExample(
    'new.admin@example.com',
    'SecureP@ssw0rd'
  );
  
  // 5. Verify MFA
  await verifyMfaExample(
    'admin-id-123',
    '123456'
  );
}

// This would be called from an appropriate place in your application
// runExamples().catch(console.error);