import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set');
}

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// Initialize Firebase Admin SDK
let firebaseInitialized = false;
try {
  if (!admin.apps.length) {
    admin.initializeApp();
    firebaseInitialized = true;
    console.log("[Firebase Admin] Successfully initialized");
  }
} catch (error) {
  console.error("[Firebase Admin] Initialization error:", error);
}

export function registerRoutes(app: Express): Server {
  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    console.log("[Auth API] Login attempt received");

    if (!firebaseInitialized) {
      console.error("[Auth API] Firebase not initialized");
      return res.status(503).json({ 
        error: "Authentication service is not available" 
      });
    }

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        console.log("[Auth API] Missing email or password");
        return res.status(400).json({ 
          error: "Email and password are required" 
        });
      }

      console.log("[Auth API] Attempting to sign in user:", email);

      // Get Firebase Auth instance
      const auth = getAuth();

      // First verify the user exists
      const userRecord = await auth.getUserByEmail(email);
      console.log("[Auth API] User found:", userRecord.uid);

      // Sign in with Firebase Auth using the Firebase Auth REST API
      const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`;
      const signInResponse = await fetch(signInUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      });

      if (!signInResponse.ok) {
        const errorData = await signInResponse.json();
        throw new Error(errorData.error.message);
      }

      console.log("[Auth API] Sign in successful");

      // For now, we'll assume all users are consumers
      // In the future, we can fetch the role from Firestore
      const userData = {
        uid: userRecord.uid,
        email: userRecord.email,
        role: 'consumer',
        displayName: userRecord.displayName || email.split('@')[0],
      };

      console.log("[Auth API] Login successful for user:", userData.email);

      res.json({
        message: "Login successful",
        user: userData
      });
    } catch (error) {
      console.error("[Auth API] Login error:", error);

      // Provide more specific error messages
      let errorMessage = "Invalid email or password";
      if (error instanceof Error) {
        if (error.message.includes("user-not-found")) {
          errorMessage = "No account found with this email";
        } else if (error.message.includes("wrong-password")) {
          errorMessage = "Incorrect password";
        } else if (error.message.includes("auth/invalid-email")) {
          errorMessage = "Invalid email format";
        }
      }

      res.status(401).json({ 
        error: errorMessage
      });
    }
  });

  // Create payment intent endpoint
  app.post("/api/create-payment-intent", async (req, res) => {
    console.log("[Payment Intent API] Received request with body:", req.body);

    try {
      const { amount } = req.body;
      console.log("[Payment Intent API] Processing amount:", amount);

      // Validate amount
      if (!amount) {
        console.error("[Payment Intent API] No amount provided");
        return res.status(400).json({ 
          error: "No amount provided" 
        });
      }

      if (isNaN(amount)) {
        console.error("[Payment Intent API] Invalid amount format:", amount);
        return res.status(400).json({ 
          error: "Amount must be a valid number" 
        });
      }

      if (amount <= 0) {
        console.error("[Payment Intent API] Amount must be greater than 0:", amount);
        return res.status(400).json({ 
          error: "Amount must be greater than 0" 
        });
      }

      // Convert amount to cents for Stripe
      const amountInCents = Math.round(amount * 100);
      console.log("[Payment Intent API] Amount in cents:", amountInCents);

      // Create payment intent with proper configuration
      console.log("[Payment Intent API] Creating payment intent");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "aed",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          integration_check: 'accept_a_payment'
        }
      });

      console.log("[Payment Intent API] Payment intent created successfully:", paymentIntent.id);

      // Return only the client secret
      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (err) {
      console.error("[Payment Intent API] Error creating payment intent:", err);
      res.status(500).json({ 
        error: err instanceof Error ? err.message : "Failed to create payment intent"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}