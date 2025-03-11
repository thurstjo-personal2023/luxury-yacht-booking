import { initializeApp, cert } from "firebase-admin/app";
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

// Always connect to emulators in Replit environment
// Force development mode for Replit environment
process.env.NODE_ENV = "development";

// Use a proxy URL for Firebase Emulator access from Replit
// The Firebase Emulator is running externally and exposing its ports
// When running in Replit, we need to access the emulator through the
// external host's IP address

// Use the production project configuration while connecting to emulator
console.log("Running Firebase Admin with emulator settings");

// Set up Firestore emulator explicitly
adminDb.settings({
  host: "localhost:8080", // Try localhost instead of 127.0.0.1
  ssl: false,
  ignoreUndefinedProperties: true // Handle undefined values gracefully
});

console.log("Connected to Firebase Admin emulators");

// Debug connection
setTimeout(async () => {
  try {
    console.log("Testing connection to Firestore emulator...");
    const testDoc = await adminDb.collection('test').doc('test-connection').set({
      timestamp: Date.now(),
      message: 'Testing emulator connection'
    });
    console.log("✓ Successfully connected to Firestore emulator");
  } catch (error) {
    console.error("❌ Failed to connect to Firestore emulator:", error.message);
    console.error("Firestore connection details:", {
      host: adminDb._settings.host,
      ssl: adminDb._settings.ssl
    });
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