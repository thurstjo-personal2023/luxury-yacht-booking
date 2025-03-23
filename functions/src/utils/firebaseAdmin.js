/**
 * Firebase Admin SDK Singleton
 * 
 * This module ensures that Firebase Admin is initialized only once.
 * It provides access to admin services like Firestore, Auth, and Storage.
 */
const admin = require('firebase-admin');

// Check if we're already initialized
let initialized = false;
let app;

/**
 * Initialize Firebase Admin SDK if not already initialized
 */
function initializeFirebaseAdmin() {
  if (!initialized) {
    // Check if we're running in Cloud Functions environment
    if (process.env.FUNCTION_TARGET) {
      // Initialize with application default credentials
      app = admin.initializeApp();
      console.log('Firebase Admin initialized with default application credentials');
    } else {
      // For local development, try to use service account
      try {
        // Try to load service account from environment variable
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          console.log('Firebase Admin initialized with service account from environment variable');
        } 
        // Try to load from file
        else {
          const serviceAccount = require('../../etoile-yachts-9322f3c69d91.json');
          app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          console.log('Firebase Admin initialized with service account from file');
        }
      } catch (error) {
        // Fallback to application default credentials
        app = admin.initializeApp();
        console.warn('Firebase Admin initialized with default credentials (service account not found)');
        console.warn('Error when loading service account:', error.message);
      }
    }
    
    initialized = true;
  }
  
  return admin;
}

// Initialize on import
initializeFirebaseAdmin();

// Export initialized admin
module.exports = admin;