import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getFunctions } from "firebase-admin/functions";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set');
}

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

export function registerRoutes(app: Express): Server {
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

  // AI Chat endpoint using Firebase GenKit
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, userId, context } = req.body;

      if (!message || !userId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      // Get Firebase Functions instance
      const functions = getFunctions();

      // Call the GenKit AI function
      const aiResponse = await functions.httpsCallable('genAiChat')({
        message,
        context,
        userId
      });

      // Store chat history in Firestore
      const db = getFirestore();
      await db.collection('chat_history').add({
        userId,
        message,
        response: aiResponse.data.response,
        context,
        timestamp: new Date(),
      });

      res.json({ response: aiResponse.data.response });
    } catch (error) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ 
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}