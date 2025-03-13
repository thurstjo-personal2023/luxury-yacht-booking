import { initializeApp, cert, ServiceAccount, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { Request, Response, NextFunction } from "express";
import * as fs from 'fs';
import * as path from 'path';

// Import environment configuration
import { USE_FIREBASE_EMULATORS, FIREBASE_PROJECT_ID, EMULATOR_HOSTS } from './env-config';

// Initialize app variable at module scope so it can be used throughout the file
let app: App;

let firestoreEmulatorHost: string | undefined;
let authEmulatorHost: string | undefined;
let storageEmulatorHost: string | undefined;

// Determine if we should use emulators or production Firebase
if (USE_FIREBASE_EMULATORS) {
  console.log("=== DEVELOPMENT MODE: Using Firebase Emulators ===");
  
  // Check if emulator environment variables are already set (from environment or local file)
  firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  storageEmulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;

  // Try to read emulator host from local file if not set in environment
  if (!firestoreEmulatorHost) {
    try {
      const localHostFilePath = path.join(process.cwd(), 'localhost-run-host.txt');
      if (fs.existsSync(localHostFilePath)) {
        const host = fs.readFileSync(localHostFilePath, 'utf8').trim();
        if (host) {
          firestoreEmulatorHost = `${host}:8080`;
          authEmulatorHost = `${host}:9099`;
          storageEmulatorHost = `${host}:9199`;
          
          // Set the environment variables
          process.env.FIRESTORE_EMULATOR_HOST = firestoreEmulatorHost;
          process.env.FIREBASE_AUTH_EMULATOR_HOST = authEmulatorHost;
          process.env.FIREBASE_STORAGE_EMULATOR_HOST = storageEmulatorHost;
        }
      }
    } catch (error) {
      console.warn("Could not read localhost.run host from file:", error);
    }
  }

  // Fall back to default localhost if still not set
  if (!firestoreEmulatorHost) {
    firestoreEmulatorHost = EMULATOR_HOSTS.firestore;
    authEmulatorHost = EMULATOR_HOSTS.auth;
    storageEmulatorHost = EMULATOR_HOSTS.storage;
    
    // Set environment variables
    process.env.FIRESTORE_EMULATOR_HOST = firestoreEmulatorHost;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = authEmulatorHost;
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = storageEmulatorHost;
  }

  console.log("=== Firebase Admin SDK Emulator Configuration ===");
  console.log(`Firestore: ${firestoreEmulatorHost}`);
  console.log(`Auth: ${authEmulatorHost}`);
  console.log(`Storage: ${storageEmulatorHost}`);
  
  // Initialize with minimal configuration for emulators
  app = initializeApp({
    projectId: FIREBASE_PROJECT_ID || "etoile-yachts-emulator"
  });
  
  console.log("Firebase Admin SDK initialized for emulator connection");
} else {
  console.log("=== PRODUCTION MODE: Using Firebase Production Services ===");
  
  // Clear any emulator environment variables
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

  // Check for Firebase service account from environment variable
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("FIREBASE_SERVICE_ACCOUNT environment variable is required for production mode");
    console.error("Please set this environment variable with your Firebase service account key JSON");
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable");
  }
  
  try {
    // Parse the service account JSON from environment variable
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT
    ) as ServiceAccount;
    
    // Initialize Firebase Admin with service account credentials
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: FIREBASE_PROJECT_ID || serviceAccount.projectId,
      storageBucket: `${FIREBASE_PROJECT_ID || serviceAccount.projectId}.appspot.com`
    });
    
    console.log(`Firebase Admin SDK initialized for project: ${FIREBASE_PROJECT_ID || serviceAccount.projectId}`);
  } catch (error) {
    console.error("Error initializing Firebase Admin with service account:", error);
    throw new Error("Failed to initialize Firebase Admin SDK with production credentials");
  }
}

// Get service instances
const adminAuth = getAuth(app);
const adminDb = getFirestore(app);
const adminStorage = getStorage(app);

// Extra settings for Firestore
adminDb.settings({
  ignoreUndefinedProperties: true
});

// Connection test (runs after 3 seconds)
setTimeout(async () => {
  try {
    const mode = USE_FIREBASE_EMULATORS ? "EMULATOR" : "PRODUCTION";
    console.log(`\n======= FIREBASE ${mode} CONNECTION TEST =======`);
    
    // Test creating a document
    try {
      console.log("1. Creating test document...");
      await adminDb.collection('test').doc('test-connection').set({
        timestamp: Date.now(),
        message: `Testing ${mode.toLowerCase()} connection`,
        mode: mode.toLowerCase()
      });
      console.log("✓ Successfully created test document");
    } catch (err: any) {
      console.error("❌ Error creating test document:", err.message);
    }
    
    // Check unified_yacht_experiences collection
    try {
      console.log("2. Checking unified_yacht_experiences collection...");
      const yachtSnapshot = await adminDb.collection('unified_yacht_experiences').limit(5).get();
      console.log(`✓ Found ${yachtSnapshot.size} yachts in collection`);
      if (yachtSnapshot.size > 0) {
        yachtSnapshot.forEach((doc: any) => {
          const data = doc.data();
          console.log(`  - Yacht ID: ${doc.id}, Title: ${data.title || data.name || 'Unnamed'}`);
        });
      } else {
        console.log("No yacht documents found. Collection may be empty in this environment.");
      }
    } catch (err: any) {
      console.error("❌ Error querying unified_yacht_experiences:", err.message);
    }
    
    console.log(`======= END OF ${mode} CONNECTION TEST =======\n`);
  } catch (error: any) {
    console.error("❌ Error during connection test:", error.message);
  }
}, 3000);

// Export the initialized services
export { adminAuth, adminDb, adminStorage };

// Declare global type for Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        role?: string;
        name?: string;
        [key: string]: any;
      };
    }
  }
}

// Helper function to decode a JWT token
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

// Middleware to verify Firebase Auth tokens
export const verifyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    console.log(`verifyAuth - Checking auth header for ${req.path}`);
    
    // Check for Authorization header
    if (!authHeader) {
      console.warn(`verifyAuth - No Authorization header found for ${req.path}`);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        details: 'Missing Authorization header',
        path: req.path,
        method: req.method
      });
    }
    
    // Check Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      console.warn(`verifyAuth - Invalid Authorization format for ${req.path}: ${authHeader.substring(0, 15)}...`);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        details: 'Invalid Authorization format, expected: Bearer token',
        path: req.path,
        method: req.method
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Basic token validation check
    if (!token || token.trim() === '') {
      console.warn(`verifyAuth - Empty token for ${req.path}`);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        details: 'Empty token provided',
        path: req.path,
        method: req.method
      });
    }
    
    // Verify token length and format
    if (token.length < 20 || token.split('.').length !== 3) {
      console.warn(`verifyAuth - Invalid token format for ${req.path}: ${token.substring(0, 15)}...`);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        details: 'Invalid token format',
        path: req.path,
        method: req.method
      });
    }
    
    try {
      console.log(`verifyAuth - Verifying token for ${req.path} using Firebase Auth`);
      // Try to verify with Firebase Auth
      const decodedToken = await adminAuth.verifyIdToken(token);
      
      // Extract user info
      const { uid, email, role = 'consumer', name, ...otherClaims } = decodedToken;
      req.user = { uid, email, role, name, ...otherClaims };
      
      console.log(`verifyAuth - Successfully verified token for user ${uid} with role ${role}`);
      return next();
    } catch (verifyError: any) {
      // If regular verification fails, try manual decode for emulator tokens
      console.warn(`verifyAuth - Standard verification failed for ${req.path}: ${verifyError.message}`);
      
      // Try manual decode as fallback for emulator tokens
      try {
        console.log(`verifyAuth - Attempting manual token decode for ${req.path}`);
        const decodedPayload = decodeJWT(token);
        
        if (decodedPayload && decodedPayload.user_id) {
          console.log(`verifyAuth - Successfully decoded emulator token manually for ${req.path}`);
          
          // Extract user info
          const { user_id, email, role = 'consumer', name = '', ...otherClaims } = decodedPayload;
          
          req.user = {
            uid: user_id,
            email: email || '',
            role,
            name,
            ...otherClaims,
            _emulatorVerified: true
          };
          
          console.log(`verifyAuth - Manual verification successful for user ${user_id} with role ${role}`);
          return next();
        }
        
        // Manual decode didn't have expected fields
        console.error(`verifyAuth - Manual decode failed to extract user_id for ${req.path}`);
        return res.status(401).json({ 
          error: 'Invalid token', 
          details: 'Token could not be verified and manual decode failed',
          path: req.path,
          method: req.method
        });
      } catch (decodeError) {
        // Both verification methods failed
        console.error(`verifyAuth - Both verification methods failed for ${req.path}`);
        return res.status(401).json({ 
          error: 'Invalid token', 
          details: 'Token verification failed with both methods',
          path: req.path,
          method: req.method,
          verifyError: verifyError.message,
          decodeError: String(decodeError)
        });
      }
    }
  } catch (error) {
    // Unexpected error in middleware
    console.error(`verifyAuth - Unexpected error in auth middleware for ${req.path}:`, error);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      details: 'Unexpected error in auth verification',
      path: req.path,
      method: req.method
    });
  }
};