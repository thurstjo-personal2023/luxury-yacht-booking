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

// Set up emulators in development
if (process.env.NODE_ENV === "development") {
  // Auth emulator
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

  // Firestore emulator
  const FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  adminDb.settings({
    host: FIRESTORE_EMULATOR_HOST,
    ssl: false,
  });

  // Storage emulator
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";

  // Functions emulator
  process.env.FUNCTIONS_EMULATOR_HOST = "127.0.0.1:5001";

  // Database emulator
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9001";

  console.log("Connected to Firebase Admin emulators");
}

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

// Middleware to verify Firebase Auth tokens
export const verifyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
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
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};