import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { Request, Response, NextFunction } from "express";

// Initialize Firebase Admin with service account
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : {
  project_id: "etoile-yachts",
  private_key_id: "",
  private_key: "",
  client_email: "",
  client_id: "",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: ""
};

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount as any),
  projectId: "etoile-yachts",
  storageBucket: "etoile-yachts.appspot.com",
});

// Initialize services
const adminAuth = getAuth(app);
const adminDb = getFirestore(app);
const adminStorage = getStorage(app);

// We are always in development mode and always using emulators
process.env.NODE_ENV = "development"; 

// Use Firebase emulators for development
// Note: In Replit, emulators must be running externally and accessible
const useEmulators = true;
if (useEmulators) {
  // Set environment variables for Firebase emulators
  // Use the user's actual external IP to connect to their local emulators
  const emulatorIP = "[2001:8f8:1163:5b77:39c7:7461:9eac:f645]"; // IPv6 address needs to be enclosed in brackets
  
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorIP}:9099`;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = `${emulatorIP}:9199`;
  process.env.FIRESTORE_EMULATOR_HOST = `${emulatorIP}:8080`;
  
  // Configure Firestore to use emulator with the external IP
  adminDb.settings({
    host: `${emulatorIP}:8080`,
    ssl: false,
    ignoreUndefinedProperties: true
  });
  
  console.log("Firebase Admin configured to connect to external emulators:");
  console.log(` - Firestore: ${emulatorIP}:8080`);
  console.log(` - Auth: ${emulatorIP}:9099`);
  console.log(` - Storage: ${emulatorIP}:9199`);
  console.log("Environment variables set:");
  console.log(" - FIRESTORE_EMULATOR_HOST:", process.env.FIRESTORE_EMULATOR_HOST);
  console.log(" - FIREBASE_AUTH_EMULATOR_HOST:", process.env.FIREBASE_AUTH_EMULATOR_HOST);
  console.log(" - FIREBASE_STORAGE_EMULATOR_HOST:", process.env.FIREBASE_STORAGE_EMULATOR_HOST);
} else {
  // Configure for direct Firestore access without emulators
  adminDb.settings({
    ignoreUndefinedProperties: true
  });
  
  console.log("Firebase Admin configured for direct access (emulators disabled)");
}

// Debug connection to Firebase Emulator
setTimeout(async () => {
  try {
    console.log("Testing connection to Firestore emulator...");
    // Log connection settings
    console.log("Current Firestore emulator connection settings:", {
      host: process.env.FIRESTORE_EMULATOR_HOST,
      ssl: false,
      ignoreUndefinedProperties: true
    });
    
    // Test query to verify emulator connection
    const testDoc = await adminDb.collection('test').doc('test-connection').set({
      timestamp: Date.now(),
      message: 'Testing Firestore emulator connection'
    });
    console.log("✓ Successfully connected to Firestore emulator");
    
    // Try unified_yacht_experiences
    console.log("Testing read from unified_yacht_experiences collection...");
    const yachtSnapshot = await adminDb.collection('unified_yacht_experiences').limit(1).get();
    console.log(`✓ Read from unified_yacht_experiences, found ${yachtSnapshot.size} documents`);
    if (yachtSnapshot.size > 0) {
      const sampleDoc = yachtSnapshot.docs[0];
      console.log("Sample yacht document fields:", Object.keys(sampleDoc.data()));
      console.log("Producer ID field:", sampleDoc.data().producerId || "Not found");
      console.log("Provider ID field:", sampleDoc.data().providerId || "Not found");
    }
    
    // Try harmonized_users collection
    console.log("Testing read from harmonized_users collection...");
    const usersSnapshot = await adminDb.collection('harmonized_users').limit(1).get();
    console.log(`✓ Read from harmonized_users, found ${usersSnapshot.size} documents`);
    
    // Additional diagnostic info
    console.log("\nEnvironment information:");
    console.log("- NODE_ENV:", process.env.NODE_ENV);
    console.log("- FIREBASE_AUTH_EMULATOR_HOST:", process.env.FIREBASE_AUTH_EMULATOR_HOST || "Not set");
    console.log("- FIRESTORE_EMULATOR_HOST:", process.env.FIRESTORE_EMULATOR_HOST || "Not set");
    console.log("- isEmulatorMode():", isEmulatorMode());
  } catch (error: any) {
    console.error("❌ Error during Firebase emulator connection test:", error.message);
    if (error && typeof error === 'object') {
      console.error("Error code:", error.code);
      console.error("Error details:", error.details || "No details available");
    }
  }
}, 3000);

// Export the initialized services
export { adminAuth, adminDb, adminStorage };

// Augment Express Request type to include user property
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
    // Split the token into its parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    // Decode the payload (second part)
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

// Helper to check if we're in development/emulator mode
const isEmulatorMode = () => {
  return process.env.NODE_ENV === 'development' || 
         !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
};

// Middleware to verify Firebase Auth tokens
export const verifyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Check if we're in emulator mode and handle emulator tokens differently
    if (isEmulatorMode() && token) {
      console.log('Emulator mode detected, using special token handling');
      
      try {
        // First try regular verification
        const decodedToken = await adminAuth.verifyIdToken(token);
        
        // Extract properties and proceed as normal
        const { uid, email, role = 'consumer', name, ...otherClaims } = decodedToken;
        req.user = { uid, email, role, name, ...otherClaims };
        return next();
      } catch (error: any) {
        // If verification fails in emulator mode, try manual decoding
        console.log('Standard token verification failed in emulator, trying manual decode:', 
          error?.message || 'Unknown error');
        
        // Manual decode for emulator tokens
        const decodedPayload = decodeJWT(token);
        if (decodedPayload && decodedPayload.user_id) {
          console.log('Successfully decoded emulator token manually');
          
          // Extract user info from manually decoded token
          const { user_id, email, role = 'consumer', name = '', ...otherClaims } = decodedPayload;
          
          // Set user information in the request object
          req.user = {
            uid: user_id,
            email: email || '',
            role,
            name,
            ...otherClaims,
            // Flag that this was verified via emulator mode
            _emulatorVerified: true
          };
          
          return next();
        } else {
          // Manual decode also failed
          console.error('Manual token decode failed for emulator');
          throw new Error('Invalid emulator token');
        }
      }
    } else {
      // Production mode - use standard token verification
      const decodedToken = await adminAuth.verifyIdToken(token);
      
      // Extract properties from the token
      const { uid, email, role = 'consumer', name, ...otherClaims } = decodedToken;
      
      // Set user information in the request object
      req.user = {
        uid,
        email,
        role,
        name,
        ...otherClaims // Include all other token claims
      };
      
      next();
    }
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};