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
try {
  if (!admin.apps.length) {
    admin.initializeApp();
    console.log("[Firebase Admin] Successfully initialized");
  }
} catch (error) {
  console.error("[Firebase Admin] Initialization error:", error);
  throw error;
}

export function registerRoutes(app: Express): Server {
  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          error: "Email and password are required" 
        });
      }

      // Sign in with Firebase Auth REST API
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

      const data = await signInResponse.json();

      if (!signInResponse.ok) {
        console.error("[Auth API] Login failed:", data.error);
        return res.status(401).json({ 
          error: "Invalid email or password" 
        });
      }

      // Get user details from Firebase Admin
      const userRecord = await getAuth().getUser(data.localId);

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
      res.status(500).json({ 
        error: "Authentication failed" 
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