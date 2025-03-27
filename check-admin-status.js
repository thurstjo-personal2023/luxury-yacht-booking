/**
 * Check Admin Status Script
 * 
 * This script checks the isActive status of admin accounts in Firestore.
 * It can also update the status if needed.
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin SDK
try {
  // Check if we have a service account file
  try {
    const serviceAccount = JSON.parse(readFileSync('./etoile-yachts-9322f3c69d91.json'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    // Fall back to application default credentials
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
} catch (e) {
  console.log('Firebase Admin SDK already initialized');
}

const db = admin.firestore();

/**
 * Get all admin profiles
 */
async function getAdminProfiles() {
  try {
    const snapshot = await db.collection('admin_profiles').get();
    
    if (snapshot.empty) {
      console.log('No admin profiles found');
      return [];
    }
    
    const profiles = [];
    snapshot.forEach(doc => {
      profiles.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return profiles;
  } catch (error) {
    console.error('Error getting admin profiles:', error);
    return [];
  }
}

/**
 * Update admin profile isActive status
 */
async function updateAdminStatus(uid, isActive) {
  try {
    await db.collection('admin_profiles').doc(uid).update({
      isActive: isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Admin status updated for ${uid}. isActive: ${isActive}`);
    return true;
  } catch (error) {
    console.error('Error updating admin status:', error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  // Get the admin UID from command line arguments
  const targetUid = process.argv[2];
  const setActive = process.argv[3] === 'activate';
  
  // If no UID provided, list all admin profiles
  if (!targetUid) {
    console.log('Listing all admin profiles:');
    const profiles = await getAdminProfiles();
    
    profiles.forEach(profile => {
      console.log(`UID: ${profile.id}`);
      console.log(`Name: ${profile.firstName} ${profile.lastName}`);
      console.log(`Email: ${profile.email}`);
      console.log(`Role: ${profile.role}`);
      console.log(`Department: ${profile.department}`);
      console.log(`isActive: ${profile.isActive}`);
      console.log('-----------------------------------');
    });
    
    return;
  }
  
  // Check specific admin profile
  console.log(`Checking admin profile for UID: ${targetUid}`);
  const adminRef = db.collection('admin_profiles').doc(targetUid);
  const doc = await adminRef.get();
  
  if (!doc.exists) {
    console.log(`No admin profile found for UID: ${targetUid}`);
    return;
  }
  
  const profile = doc.data();
  console.log(`Admin Profile Details:`);
  console.log(`Name: ${profile.firstName} ${profile.lastName}`);
  console.log(`Email: ${profile.email}`);
  console.log(`Role: ${profile.role}`);
  console.log(`Department: ${profile.department}`);
  console.log(`isActive: ${profile.isActive}`);
  
  // Update status if requested
  if (setActive) {
    console.log(`Activating admin account for ${targetUid}...`);
    await updateAdminStatus(targetUid, true);
  } else if (setActive === false) {
    console.log(`Deactivating admin account for ${targetUid}...`);
    await updateAdminStatus(targetUid, false);
  }
}

// Run the main function
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });