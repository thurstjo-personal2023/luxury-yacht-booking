import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getFirestore } from "firebase-admin/firestore";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY must be set');
}

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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

  // AI Chat endpoint
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, userId, context } = req.body;

      if (!message || !userId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      // Generate response from AI
      const prompt = `
        You are a helpful AI assistant for a luxury yacht booking platform.
        Context: ${context}
        User message: ${message}

        Please provide a helpful, professional response regarding yacht bookings,
        focusing on package details, availability, and booking modifications.
        Keep responses concise and relevant to yacht rentals and luxury experiences.
      `;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Store chat history in Firestore
      const db = getFirestore();
      await db.collection('chat_history').add({
        userId,
        message,
        response,
        context,
        timestamp: new Date(),
      });

      res.json({ response });
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