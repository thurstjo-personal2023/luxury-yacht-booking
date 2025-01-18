import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";

// Initialize Stripe with the secret key and explicit test mode configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
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

      // Amount is already in cents from the client
      const amountInCents = Math.round(amount);
      console.log("Creating payment intent for amount (in cents):", amountInCents);

      // Create payment intent with test mode configurations
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "aed",
        payment_method_types: ['card'],
        // Enable test mode specific configurations
        metadata: {
          environment: 'test',
        },
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