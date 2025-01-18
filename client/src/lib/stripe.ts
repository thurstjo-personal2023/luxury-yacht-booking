import { loadStripe } from "@stripe/stripe-js";

// Get the publishable key directly from the environment
// This ensures we're accessing it in the correct scope for Vite
const publishableKey = (window as any).ENV?.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!publishableKey) {
  console.error("Stripe publishable key is missing. Check environment variables and server configuration.");
  throw new Error(
    "Missing Stripe publishable key. Make sure VITE_STRIPE_PUBLISHABLE_KEY is set and exposed correctly."
  );
}

// Initialize Stripe instance
export const stripePromise = loadStripe(publishableKey);