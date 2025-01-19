import type { Express } from "express";
import { createServer, type Server } from "http";
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

// Configure Firebase Auth to use emulator in development
const isDevelopment = process.env.NODE_ENV !== 'production';
if (isDevelopment) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  console.log("[Firebase Admin] Using Auth emulator:", process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

// Initialize Firebase Admin SDK
let firebaseAdmin: admin.app.App | null = null;
try {
  if (!admin.apps.length) {
    firebaseAdmin = admin.initializeApp({
      projectId: isDevelopment ? 'demo-project' : process.env.VITE_FIREBASE_PROJECT_ID,
      credential: isDevelopment 
        ? admin.credential.applicationDefault()  // Use application default in development
        : admin.credential.cert({
            projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
    });

    console.log("[Firebase Admin] Successfully initialized with config:", {
      isDevelopment,
      projectId: isDevelopment ? 'demo-project' : process.env.VITE_FIREBASE_PROJECT_ID,
      usingEmulator: !!process.env.FIREBASE_AUTH_EMULATOR_HOST,
    });
  } else {
    firebaseAdmin = admin.apps[0]!;
  }
} catch (error) {
  console.error("[Firebase Admin] Initialization error:", error);
  firebaseAdmin = null;
}

export function registerRoutes(app: Express): Server {
  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      if (!firebaseAdmin) {
        return res.status(503).json({
          error: "Authentication service is temporarily unavailable"
        });
      }

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          error: "Email and password are required" 
        });
      }

      const signInUrl = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.VITE_FIREBASE_API_KEY}`;

      console.log("[Auth API] Attempting login with emulator:", isDevelopment);
      console.log("[Auth API] Using auth endpoint:", signInUrl);

      const signInResponse = await fetch(signInUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      });

      const data = await signInResponse.json();
      console.log("[Auth API] Sign in response:", data);

      if (!signInResponse.ok) {
        if (isDevelopment) {
          // In development, provide more detailed error information
          return res.status(401).json({
            error: `Authentication failed: ${data.error?.message || 'Unknown error'}`,
            details: data.error
          });
        }

        // In production, keep error messages generic
        return res.status(401).json({
          error: "Invalid email or password"
        });
      }

      // Get user details from Firebase Admin
      const auth = getAuth(firebaseAdmin);
      const userRecord = await auth.getUser(data.localId);

      res.json({
        message: "Login successful",
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          role: 'consumer',
          displayName: userRecord.displayName || email.split('@')[0],
        }
      });

    } catch (error) {
      console.error("[Auth API] Login error:", error);

      if (isDevelopment) {
        // In development, provide more error details
        return res.status(500).json({
          error: "Authentication failed",
          details: error instanceof Error ? error.message : String(error)
        });
      }

      res.status(500).json({ 
        error: "Authentication service error"
      });
    }
  });

  // Create payment intent endpoint
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;

      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ 
          error: "Invalid amount" 
        });
      }

      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "aed",
        automatic_payment_methods: {
          enabled: true,
        }
      });

      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (err) {
      console.error("[Payment API] Error:", err);
      res.status(500).json({ 
        error: err instanceof Error ? err.message : "Payment processing failed"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}