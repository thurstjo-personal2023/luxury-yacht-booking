import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { Request, Response, NextFunction } from "express";
import * as fs from 'fs';
import * as path from 'path';

// We are always in development mode
process.env.NODE_ENV = "development";

// Check if emulator environment variables are already set (from environment or local file)
let firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
let authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
let storageEmulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;

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
  firestoreEmulatorHost = "localhost:8080";
  authEmulatorHost = "localhost:9099";
  storageEmulatorHost = "localhost:9199";
  
  // Set environment variables
  process.env.FIRESTORE_EMULATOR_HOST = firestoreEmulatorHost;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = authEmulatorHost;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = storageEmulatorHost;
}

console.log("=== Firebase Admin SDK Emulator Configuration ===");
console.log(`Firestore: ${firestoreEmulatorHost}`);
console.log(`Auth: ${authEmulatorHost}`);
console.log(`Storage: ${storageEmulatorHost}`);

// Initialize Firebase Admin with minimal configuration
// When using emulators, we only need a projectId
const app = initializeApp({
  projectId: "etoile-yachts-emulator"
});

// Get service instances
const adminAuth = getAuth(app);
const adminDb = getFirestore(app);
const adminStorage = getStorage(app);

// Extra settings for Firestore
adminDb.settings({
  ignoreUndefinedProperties: true
});

console.log("Firebase Admin SDK initialized for emulator connection");

// Connection test (runs after 3 seconds)
setTimeout(async () => {
  try {
    console.log("\n======= EMULATOR CONNECTION TEST =======");
    
    // Test creating a document
    try {
      console.log("1. Creating test document...");
      await adminDb.collection('test').doc('test-connection').set({
        timestamp: Date.now(),
        message: 'Testing emulator connection'
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
      }
    } catch (err: any) {
      console.error("❌ Error querying unified_yacht_experiences:", err.message);
    }
    
    console.log("======= END OF CONNECTION TEST =======\n");
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