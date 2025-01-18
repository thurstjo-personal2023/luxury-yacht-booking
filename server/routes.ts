import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required STRIPE_SECRET_KEY");
}

// Initialize Stripe with the secret key and test mode configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export function registerRoutes(app: Express): Server {
  // Create payment intent endpoint
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      console.log("Received payment intent request:", req.body);
      const { amount } = req.body;

      // Validate amount
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        console.log("Invalid amount received:", amount);
        return res.status(400).json({ 
          error: "Invalid amount provided",
          details: "Amount must be a positive number"
        });
      }

      // Amount should already be in cents from the client
      const amountInCents = Math.round(Number(amount));
      console.log("Creating payment intent for amount (in cents):", amountInCents);

      // Create payment intent with test mode specific configuration
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "aed",
        payment_method_types: ['card'],
        metadata: {
          environment: 'test',
        },
      });

      console.log("Payment intent created successfully:", paymentIntent.id);
      res.json({
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id
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