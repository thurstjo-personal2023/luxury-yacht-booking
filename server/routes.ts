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
      console.log("Received payment intent request:", req.body);
      const { amount } = req.body;

      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        console.log("Invalid amount received:", amount);
        return res.status(400).json({ error: "Invalid amount provided" });
      }

      // Convert to cents for Stripe
      const amountInCents = Math.round(amount * 100);
      console.log("Creating payment intent for amount (in cents):", amountInCents);

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "aed",
      });

      console.log("Payment intent created successfully");
      res.json({
        clientSecret: paymentIntent.client_secret
      });
    } catch (err) {
      console.error("Error creating payment intent:", err);
      res.status(500).json({ 
        error: "Failed to create payment intent",
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}