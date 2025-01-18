import { loadStripe } from "@stripe/stripe-js";

// Function to fetch the Stripe publishable key from the server
async function getStripePublishableKey(): Promise<string> {
  const response = await fetch('/api/config');
  if (!response.ok) {
    throw new Error('Failed to load Stripe configuration');
  }
  const config = await response.json();
  return config.stripePublishableKey;
}

// Initialize Stripe with async configuration
export const stripePromise = getStripePublishableKey().then(key => {
  if (!key) {
    console.error("Stripe publishable key is missing. Check server configuration.");
    throw new Error(
      "Missing Stripe publishable key. Make sure STRIPE_PUBLISHABLE_KEY is set on the server."
    );
  }
  return loadStripe(key);
});