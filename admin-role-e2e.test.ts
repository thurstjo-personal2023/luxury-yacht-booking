/**
 * Administrator Role Management End-to-End Tests
 * 
 * This file contains end-to-end tests for the complete administrator
 * role management workflow, from invitation to role modification.
 * 
 * These tests verify that:
 * 1. The complete invitation → registration → approval → role management flow works
 * 2. Permission checks are enforced throughout the process
 * 3. Audit logging captures all administrative actions properly
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { initializeTestEnvironment, cleanupTestEnvironment } from './setup-emulator';

// Test data
const testUsers = {
  superAdmin: {
    email: 'super-admin-e2e@example.com',
    password: 'SuperSecure123!',
    role: 'SUPER_ADMIN',
    department: 'Technology',
    position: 'CTO'
  },
  admin: {
    email: 'admin-e2e@example.com',
    password: 'AdminSecure123!',
    role: 'ADMIN',
    department: 'Operations',
    position: 'Operations Manager'
  },
  moderator: {
    email: 'moderator-e2e@example.com',
    password: 'ModeratorSecure123!',
    role: 'MODERATOR',
    department: 'Customer Support',
    position: 'Support Specialist'
  },
  newInvitee: {
    email: 'new-invitee-e2e@example.com',
    password: 'InviteeSecure123!',
    role: 'MODERATOR',
    department: 'Marketing',
    position: 'Marketing Specialist'
  }
};

describe('Administrator Role Management End-to-End Tests', () => {
  let auth: Auth;
  let db: Firestore;
  let apiBaseUrl: string;
  let cleanupFn: () => Promise<void>;
  let superAdminUid: string;
  let adminUid: string;
  let moderatorUid: string;
  let invitationToken: string;

  // Setup test environment before all tests
  beforeAll(async () => {
    // Initialize emulator environment
    const testEnv = initializeTestEnvironment({
      projectId: 'etoile-yachts-test'
    });
    
    auth = testEnv.auth!;
    db = testEnv.firestore!;
    cleanupFn = testEnv.cleanup;
    
    // For local testing, use localhost; for CI/CD, use the appropriate URL
    apiBaseUrl = 'http://localhost:3000/api';
    
    // Create the initial super admin user for tests
    const superAdminCred = await createUserWithEmailAndPassword(
      auth, 
      testUsers.superAdmin.email, 
      testUsers.superAdmin.password
    );
    superAdminUid = superAdminCred.user.uid;
    
    // Set up the super admin in Firestore
    await doc(db, 'administrators', superAdminUid).set({
      uid: superAdminUid,
      email: testUsers.superAdmin.email,
      role: testUsers.superAdmin.role,
      department: testUsers.superAdmin.department,
      position: testUsers.superAdmin.position,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Create Firebase Auth user for admin (will be set up in test)
    const adminCred = await createUserWithEmailAndPassword(
      auth,
      testUsers.admin.email,
      testUsers.admin.password
    );
    adminUid = adminCred.user.uid;
    
    // Create Firebase Auth user for moderator (will be set up in test)
    const moderatorCred = await createUserWithEmailAndPassword(
      auth,
      testUsers.moderator.email,
      testUsers.moderator.password
    );
    moderatorUid = moderatorCred.user.uid;
  });
  
  // Clean up after all tests
  afterAll(async () => {
    await cleanupFn();
  });
  
  // Reset authentication state before each test
  beforeEach(async () => {
    // Sign out any existing user
    await auth.signOut();
  });
  
  /**
   * WORKFLOW-001: Complete Administrator Lifecycle
   * 
   * This test verifies the complete administrator lifecycle:
   * 1. Super Admin creates an invitation
   * 2. Invitee completes registration
   * 3. Super Admin approves the registration
   * 4. Super Admin modifies the user's role
   * 5. Super Admin disables the account
   * 6. Super Admin re-enables the account
   * 7. The audit log captures all of these actions
   */
  describe('WORKFLOW-001: Complete Administrator Lifecycle', () => {
    test('Super Admin sends invitation to new administrator', async () => {
      // Sign in as super admin
      await signInWithEmailAndPassword(auth, testUsers.superAdmin.email, testUsers.superAdmin.password);
      const idToken = await auth.currentUser!.getIdToken();
      
      // Send invitation
      const inviteResponse = await fetch(`${apiBaseUrl}/admin/create-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          email: testUsers.newInvitee.email,
          role: testUsers.newInvitee.role,
          department: testUsers.newInvitee.department,
          position: testUsers.newInvitee.position
        })
      });
      
      // Assert invitation was created successfully
      expect(inviteResponse.status).toBe(200);
      const inviteData = await inviteResponse.json();
      expect(inviteData.success).toBe(true);
      expect(inviteData.token).toBeTruthy();
      
      // Save token for next test
      invitationToken = inviteData.token;
      
      // Verify invitation exists in Firestore
      const inviteDoc = await getDoc(doc(db, 'admin_invitations', invitationToken));
      expect(inviteDoc.exists()).toBe(true);
      expect(inviteDoc.data()?.email).toBe(testUsers.newInvitee.email);
      
      // Verify activity was logged
      const activityQuery = query(
        collection(db, 'admin_activity_log'),
        where('type', '==', 'send_invitation'),
        where('actorId', '==', superAdminUid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const activitySnapshot = await getDocs(activityQuery);
      expect(activitySnapshot.empty).toBe(false);
      const activityDoc = activitySnapshot.docs[0];
      expect(activityDoc.data().details).toContain(testUsers.newInvitee.email);
    });
    
    test('Invitee completes registration with valid token', async () => {
      // Verify invitation token
      const verifyResponse = await fetch(`${apiBaseUrl}/admin/verify-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: invitationToken
        })
      });
      
      expect(verifyResponse.status).toBe(200);
      const verifyData = await verifyResponse.json();
      expect(verifyData.valid).toBe(true);
      expect(verifyData.email).toBe(testUsers.newInvitee.email);
      
      // Register with Firebase Auth
      const userCred = await createUserWithEmailAndPassword(
        auth,
        testUsers.newInvitee.email,
        testUsers.newInvitee.password
      );
      const newUid = userCred.user.uid;
      const idToken = await userCred.user.getIdToken();
      
      // Complete registration with profile details
      const registerResponse = await fetch(`${apiBaseUrl}/admin/create-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          uid: newUid,
          email: testUsers.newInvitee.email,
          role: testUsers.newInvitee.role,
          department: testUsers.newInvitee.department,
          position: testUsers.newInvitee.position,
          invitationToken: invitationToken
        })
      });
      
      expect(registerResponse.status).toBe(200);
      const registerData = await registerResponse.json();
      expect(registerData.success).toBe(true);
      
      // Verify admin profile was created in pending state
      const adminDoc = await getDoc(doc(db, 'administrators', newUid));
      expect(adminDoc.exists()).toBe(true);
      expect(adminDoc.data()?.status).toBe('PENDING');
      
      // Save the UID for later tests
      testUsers.newInvitee.uid = newUid;
    });
    
    test('Super Admin approves the registration', async () => {
      // Sign in as super admin
      await signInWithEmailAndPassword(auth, testUsers.superAdmin.email, testUsers.superAdmin.password);
      const idToken = await auth.currentUser!.getIdToken();
      
      // Approve the registration
      const approvalResponse = await fetch(`${apiBaseUrl}/admin/process-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          adminId: testUsers.newInvitee.uid,
          approved: true,
          notes: 'Approved by e2e test'
        })
      });
      
      expect(approvalResponse.status).toBe(200);
      const approvalData = await approvalResponse.json();
      expect(approvalData.success).toBe(true);
      
      // Verify admin profile was updated to active
      const adminDoc = await getDoc(doc(db, 'administrators', testUsers.newInvitee.uid));
      expect(adminDoc.exists()).toBe(true);
      expect(adminDoc.data()?.status).toBe('ACTIVE');
      
      // Verify activity was logged
      const activityQuery = query(
        collection(db, 'admin_activity_log'),
        where('type', '==', 'approve_admin'),
        where('actorId', '==', superAdminUid),
        where('targetId', '==', testUsers.newInvitee.uid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const activitySnapshot = await getDocs(activityQuery);
      expect(activitySnapshot.empty).toBe(false);
    });
    
    test('Super Admin modifies the user role', async () => {
      // Sign in as super admin
      await signInWithEmailAndPassword(auth, testUsers.superAdmin.email, testUsers.superAdmin.password);
      const idToken = await auth.currentUser!.getIdToken();
      
      // Update role to ADMIN
      const updateResponse = await fetch(`${apiBaseUrl}/admin/update-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          adminId: testUsers.newInvitee.uid,
          newRole: 'ADMIN'
        })
      });
      
      expect(updateResponse.status).toBe(200);
      const updateData = await updateResponse.json();
      expect(updateData.success).toBe(true);
      
      // Verify admin role was updated
      const adminDoc = await getDoc(doc(db, 'administrators', testUsers.newInvitee.uid));
      expect(adminDoc.exists()).toBe(true);
      expect(adminDoc.data()?.role).toBe('ADMIN');
      
      // Verify activity was logged
      const activityQuery = query(
        collection(db, 'admin_activity_log'),
        where('type', '==', 'update_admin'),
        where('actorId', '==', superAdminUid),
        where('targetId', '==', testUsers.newInvitee.uid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const activitySnapshot = await getDocs(activityQuery);
      expect(activitySnapshot.empty).toBe(false);
      const activityDoc = activitySnapshot.docs[0];
      expect(activityDoc.data().details).toContain('role');
    });
    
    test('Super Admin disables the account', async () => {
      // Sign in as super admin
      await signInWithEmailAndPassword(auth, testUsers.superAdmin.email, testUsers.superAdmin.password);
      const idToken = await auth.currentUser!.getIdToken();
      
      // Disable the account
      const disableResponse = await fetch(`${apiBaseUrl}/admin/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          adminId: testUsers.newInvitee.uid,
          status: 'DISABLED',
          notes: 'Disabled by e2e test'
        })
      });
      
      expect(disableResponse.status).toBe(200);
      const disableData = await disableResponse.json();
      expect(disableData.success).toBe(true);
      
      // Verify admin was disabled
      const adminDoc = await getDoc(doc(db, 'administrators', testUsers.newInvitee.uid));
      expect(adminDoc.exists()).toBe(true);
      expect(adminDoc.data()?.status).toBe('DISABLED');
      
      // Verify activity was logged
      const activityQuery = query(
        collection(db, 'admin_activity_log'),
        where('type', '==', 'disable_admin'),
        where('actorId', '==', superAdminUid),
        where('targetId', '==', testUsers.newInvitee.uid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const activitySnapshot = await getDocs(activityQuery);
      expect(activitySnapshot.empty).toBe(false);
    });
    
    test('Super Admin re-enables the account', async () => {
      // Sign in as super admin
      await signInWithEmailAndPassword(auth, testUsers.superAdmin.email, testUsers.superAdmin.password);
      const idToken = await auth.currentUser!.getIdToken();
      
      // Re-enable the account
      const enableResponse = await fetch(`${apiBaseUrl}/admin/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          adminId: testUsers.newInvitee.uid,
          status: 'ACTIVE',
          notes: 'Re-enabled by e2e test'
        })
      });
      
      expect(enableResponse.status).toBe(200);
      const enableData = await enableResponse.json();
      expect(enableData.success).toBe(true);
      
      // Verify admin was re-enabled
      const adminDoc = await getDoc(doc(db, 'administrators', testUsers.newInvitee.uid));
      expect(adminDoc.exists()).toBe(true);
      expect(adminDoc.data()?.status).toBe('ACTIVE');
      
      // Verify activity was logged
      const activityQuery = query(
        collection(db, 'admin_activity_log'),
        where('type', '==', 'enable_admin'),
        where('actorId', '==', superAdminUid),
        where('targetId', '==', testUsers.newInvitee.uid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const activitySnapshot = await getDocs(activityQuery);
      expect(activitySnapshot.empty).toBe(false);
    });
    
    test('Verify complete audit trail exists', async () => {
      // Get all activities for the test user
      const activityQuery = query(
        collection(db, 'admin_activity_log'),
        where('targetId', '==', testUsers.newInvitee.uid),
        orderBy('timestamp', 'asc')
      );
      const activitySnapshot = await getDocs(activityQuery);
      
      // Should be at least 5 activities:
      // 1. send_invitation
      // 2. approve_admin
      // 3. update_admin (role change)
      // 4. disable_admin
      // 5. enable_admin
      expect(activitySnapshot.size).toBeGreaterThanOrEqual(5);
      
      // Map activities to array for easier verification
      const activities = activitySnapshot.docs.map(doc => doc.data());
      
      // Verify we have activities of each expected type
      const activityTypes = activities.map(a => a.type);
      expect(activityTypes).toContain('send_invitation');
      expect(activityTypes).toContain('approve_admin');
      expect(activityTypes).toContain('update_admin');
      expect(activityTypes).toContain('disable_admin');
      expect(activityTypes).toContain('enable_admin');
      
      // Verify chronological order of key events
      const createIdx = activityTypes.indexOf('send_invitation');
      const approveIdx = activityTypes.indexOf('approve_admin');
      const updateIdx = activityTypes.indexOf('update_admin');
      const disableIdx = activityTypes.indexOf('disable_admin');
      const enableIdx = activityTypes.indexOf('enable_admin');
      
      // Check that key events happened in the expected order
      expect(createIdx).toBeLessThan(approveIdx);
      expect(approveIdx).toBeLessThan(updateIdx);
      expect(updateIdx).toBeLessThan(disableIdx);
      expect(disableIdx).toBeLessThan(enableIdx);
    });
  });
  
  /**
   * WORKFLOW-002: Role-Based Permission Enforcement
   * 
   * This test verifies that the role hierarchy is properly enforced:
   * 1. Regular admin cannot create super admin
   * 2. Regular admin cannot modify super admin
   * 3. Moderator cannot perform admin-level actions
   * 4. Actions blocked by permissions are properly logged
   */
  describe('WORKFLOW-002: Role-Based Permission Enforcement', () => {
    // Set up regular admin and moderator first
    beforeAll(async () => {
      // Set up admin user in Firestore
      await doc(db, 'administrators', adminUid).set({
        uid: adminUid,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
        department: testUsers.admin.department,
        position: testUsers.admin.position,
        status: 'ACTIVE',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Set up moderator user in Firestore
      await doc(db, 'administrators', moderatorUid).set({
        uid: moderatorUid,
        email: testUsers.moderator.email,
        role: testUsers.moderator.role,
        department: testUsers.moderator.department,
        position: testUsers.moderator.position,
        status: 'ACTIVE',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    test('Regular Admin cannot create Super Admin invitation', async () => {
      // Sign in as regular admin
      await signInWithEmailAndPassword(auth, testUsers.admin.email, testUsers.admin.password);
      const idToken = await auth.currentUser!.getIdToken();
      
      // Try to create a Super Admin invitation
      const inviteResponse = await fetch(`${apiBaseUrl}/admin/create-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          email: 'attempted-super-admin@example.com',
          role: 'SUPER_ADMIN',
          department: 'Technology',
          position: 'CTO'
        })
      });
      
      // Should be forbidden
      expect(inviteResponse.status).toBe(403);
      const inviteData = await inviteResponse.json();
      expect(inviteData.error).toBeTruthy();
      
      // Verify attempt was logged
      const activityQuery = query(
        collection(db, 'admin_activity_log'),
        where('type', '==', 'access_denied'),
        where('actorId', '==', adminUid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const activitySnapshot = await getDocs(activityQuery);
      expect(activitySnapshot.empty).toBe(false);
      const activityDoc = activitySnapshot.docs[0];
      expect(activityDoc.data().details).toContain('SUPER_ADMIN');
    });
    
    test('Regular Admin cannot modify Super Admin role', async () => {
      // Sign in as regular admin
      await signInWithEmailAndPassword(auth, testUsers.admin.email, testUsers.admin.password);
      const idToken = await auth.currentUser!.getIdToken();
      
      // Try to modify Super Admin's role
      const updateResponse = await fetch(`${apiBaseUrl}/admin/update-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          adminId: superAdminUid,
          newRole: 'ADMIN'
        })
      });
      
      // Should be forbidden
      expect(updateResponse.status).toBe(403);
      const updateData = await updateResponse.json();
      expect(updateData.error).toBeTruthy();
      
      // Verify Super Admin's role was not changed
      const adminDoc = await getDoc(doc(db, 'administrators', superAdminUid));
      expect(adminDoc.exists()).toBe(true);
      expect(adminDoc.data()?.role).toBe('SUPER_ADMIN');
      
      // Verify attempt was logged
      const activityQuery = query(
        collection(db, 'admin_activity_log'),
        where('type', '==', 'access_denied'),
        where('actorId', '==', adminUid),
        where('targetId', '==', superAdminUid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const activitySnapshot = await getDocs(activityQuery);
      expect(activitySnapshot.empty).toBe(false);
    });
    
    test('Moderator cannot approve pending admin registrations', async () => {
      // Sign in as moderator
      await signInWithEmailAndPassword(auth, testUsers.moderator.email, testUsers.moderator.password);
      const idToken = await auth.currentUser!.getIdToken();
      
      // Try to approve the registration
      const approvalResponse = await fetch(`${apiBaseUrl}/admin/process-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          adminId: testUsers.newInvitee.uid,
          approved: true,
          notes: 'Attempted approval by moderator'
        })
      });
      
      // Should be forbidden
      expect(approvalResponse.status).toBe(403);
      const approvalData = await approvalResponse.json();
      expect(approvalData.error).toBeTruthy();
      
      // Verify attempt was logged
      const activityQuery = query(
        collection(db, 'admin_activity_log'),
        where('type', '==', 'access_denied'),
        where('actorId', '==', moderatorUid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const activitySnapshot = await getDocs(activityQuery);
      expect(activitySnapshot.empty).toBe(false);
    });
    
    test('Moderator cannot invite new administrators', async () => {
      // Sign in as moderator
      await signInWithEmailAndPassword(auth, testUsers.moderator.email, testUsers.moderator.password);
      const idToken = await auth.currentUser!.getIdToken();
      
      // Try to send invitation
      const inviteResponse = await fetch(`${apiBaseUrl}/admin/create-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          email: 'attempted-invitation@example.com',
          role: 'MODERATOR',
          department: 'Marketing',
          position: 'Marketing Specialist'
        })
      });
      
      // Should be forbidden
      expect(inviteResponse.status).toBe(403);
      const inviteData = await inviteResponse.json();
      expect(inviteData.error).toBeTruthy();
      
      // Verify attempt was logged
      const activityQuery = query(
        collection(db, 'admin_activity_log'),
        where('type', '==', 'access_denied'),
        where('actorId', '==', moderatorUid),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const activitySnapshot = await getDocs(activityQuery);
      expect(activitySnapshot.empty).toBe(false);
    });
  });
});