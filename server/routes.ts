import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

export function registerRoutes(app: Express): Server {
  // Create payment intent endpoint
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;

      // Validate amount
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "aed",
      });

      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (err) {
      console.error("Error creating payment intent:", err);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}