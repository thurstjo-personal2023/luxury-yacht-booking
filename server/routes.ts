import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";

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

  const httpServer = createServer(app);
  return httpServer;
}