/**
 * Create Super Admin Account Script
 * 
 * This script creates the initial Super Admin account for the Etoile Yachts platform.
 * IMPORTANT: This should only be run once to set up the root Super Admin account.
 */

import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the service account file
const serviceAccountPath = path.join(__dirname, '..', 'etoile-yachts-9322f3c69d91.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Access Firestore and Auth
const db = admin.firestore();
const auth = getAuth();

/**
 * Creates the initial Super Admin account
 */
async function createSuperAdmin() {
  const email = 'thurstjo@gmail.com';
  const firstName = 'John';
  const lastName = 'Boyd';
  const password = 'R1chard!959';
  const role = 'SUPER_ADMIN';
  const department = 'Executive';
  const position = 'CEO / Founder';

  try {
    console.log(`Creating Super Admin account for ${email}...`);
    
    // Check if user already exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`User already exists in Auth with UID: ${userRecord.uid}`);
    } catch (error) {
      // User doesn't exist, create the user
      userRecord = await auth.createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
        emailVerified: true // Auto-verify email for Super Admin
      });
      console.log(`Created new user in Auth with UID: ${userRecord.uid}`);
    }
    
    // Update custom claims to mark as SUPER_ADMIN
    await auth.setCustomUserClaims(userRecord.uid, { 
      role,
      department,
      position,
      isAdmin: true
    });
    console.log('Set custom claims for SUPER_ADMIN role');
    
    // Check if admin profile exists in Firestore
    const adminRef = db.collection('admin_profiles').doc(userRecord.uid);
    const adminDoc = await adminRef.get();
    
    if (adminDoc.exists) {
      // Update existing profile
      await adminRef.update({
        firstName,
        lastName,
        email,
        role,
        department,
        position,
        status: 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('Updated existing admin profile in Firestore');
    } else {
      // Create new admin profile
      await adminRef.set({
        firstName,
        lastName,
        email,
        role, 
        department,
        position,
        status: 'active',
        approved: true,
        approvedBy: 'system',
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        mfaRequired: true,
        mfaSetup: false, // Will need to set up MFA on first login
      });
      console.log('Created new admin profile in Firestore');
    }
    
    // Create verification document
    const verificationRef = db.collection('admin_verifications').doc(userRecord.uid);
    const verificationDoc = await verificationRef.get();
    
    if (!verificationDoc.exists) {
      await verificationRef.set({
        userId: userRecord.uid,
        emailVerified: true, 
        phoneVerified: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('Created verification document');
    }
    
    console.log('==================================================');
    console.log('🔐 Super Admin Account Created Successfully');
    console.log('==================================================');
    console.log(`Email: ${email}`);
    console.log(`Password: [As provided]`);
    console.log(`Role: ${role}`);
    console.log(`Status: Active`);
    console.log('==================================================');
    console.log('NOTE: You will need to set up MFA on first login');
    console.log('==================================================');
    
  } catch (error) {
    console.error('Error creating Super Admin account:', error);
    process.exit(1);
  }
}

// Run the function
createSuperAdmin()
  .then(() => {
    console.log('Super Admin creation process completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });