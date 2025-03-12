import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { Request, Response, NextFunction } from "express";

// We are always in development mode
process.env.NODE_ENV = "development";

// Configure ngrok for emulator access
// This is the domain provided by ngrok when you expose your local emulators
const ngrokHost = "e5b9-2001-8f8-1163-5b77-39c7-7461-9eac-f645.ngrok-free.app";

// Don't set env variables since we're using explicit host settings
// Instead, we'll configure the host settings directly

console.log("=== Firebase Admin SDK Emulator Configuration ===");
console.log(`Using ngrok host: ${ngrokHost}`);
console.log(`Firestore: https://${ngrokHost}:8080`);
console.log(`Auth: https://${ngrokHost}:9099`);
console.log(`Storage: https://${ngrokHost}:9199`);

// Initialize Firebase Admin for emulator
// When using emulators, we only need a projectId
const app = initializeApp({
  projectId: "etoile-yachts-emulator"
});

// Get service instances
const adminAuth = getAuth(app);
const adminDb = getFirestore(app);
const adminStorage = getStorage(app);

// Configure Auth service for emulator
// This happens automatically through the FIREBASE_AUTH_EMULATOR_HOST env var
// We'll set this programmatically 
process.env.FIREBASE_AUTH_EMULATOR_HOST = `${ngrokHost}:9099`;
process.env.FIREBASE_STORAGE_EMULATOR_HOST = `${ngrokHost}:9199`;

// Configure Firestore with explicit settings
// Use the ngrok URL with SSL since it's an HTTPS connection
adminDb.settings({
  host: ngrokHost,
  port: 8080,
  ssl: true,
  ignoreUndefinedProperties: true
});

console.log("Firebase Admin configured for ngrok-tunneled emulator connection");

// Connection test (runs after 3 seconds)
setTimeout(async () => {
  try {
    console.log("Testing connection to Firestore emulator...");
    
    // Test query
    const testDoc = await adminDb.collection('test').doc('test-connection').set({
      timestamp: Date.now(),
      message: 'Testing connection'
    });
    console.log("✓ Successfully connected to Firestore");
    
    // Check unified_yacht_experiences collection
    const yachtSnapshot = await adminDb.collection('unified_yacht_experiences').limit(1).get();
    console.log(`Found ${yachtSnapshot.size} yachts`);
    
  } catch (error: any) {
    console.error("❌ Error during connection test:", error.message);
    console.error("Error code:", error.code);
    console.error("Error details:", error.details || "No details");
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
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      // Try to verify with Firebase Auth
      const decodedToken = await adminAuth.verifyIdToken(token);
      
      // Extract user info
      const { uid, email, role = 'consumer', name, ...otherClaims } = decodedToken;
      req.user = { uid, email, role, name, ...otherClaims };
      
      return next();
    } catch (error) {
      // If regular verification fails, try manual decode for emulator tokens
      console.log('Standard token verification failed, trying manual decode');
      
      const decodedPayload = decodeJWT(token);
      if (decodedPayload && decodedPayload.user_id) {
        console.log('Successfully decoded emulator token manually');
        
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
        
        return next();
      }
      
      // Both verification methods failed
      console.error('Auth verification failed');
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};