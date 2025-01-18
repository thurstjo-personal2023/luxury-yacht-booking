import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2 } from "lucide-react";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Payment Form] Starting payment submission");

    if (!stripe || !elements) {
      console.error("[Payment Form] Stripe or Elements not initialized");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(undefined);

    try {
      console.log("[Payment Form] Confirming payment with Stripe");
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-confirmation`,
        },
      });

      if (error) {
        console.error("[Payment Form] Payment confirmation error:", error);
        setErrorMessage(error.message);
        toast({
          variant: "destructive",
          title: "Payment failed",
          description: error.message,
        });
      } else {
        console.log("[Payment Form] Payment confirmed successfully");
      }
    } catch (err) {
      console.error("[Payment Form] Unexpected payment error:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {errorMessage && (
        <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-md">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </div>
        ) : (
          "Complete Payment"
        )}
      </Button>
    </form>
  );
}

export default function PaymentPage() {
  const [location] = useLocation();
  const [clientSecret, setClientSecret] = useState<string>();
  const [error, setError] = useState<string>();

  // Parse and validate amount from URL
  const parseAmount = () => {
    console.log("[Payment Page] Parsing URL parameters:", location);
    // Get the full search string including the ? character
    const searchString = window.location.search;
    const searchParams = new URLSearchParams(searchString);
    const amountParam = searchParams.get('amount');
    console.log("[Payment Page] Amount parameter from URL:", amountParam);

    if (!amountParam) {
      console.error("[Payment Page] No amount parameter found in URL");
      return 0;
    }

    const parsedAmount = parseInt(amountParam, 10);
    console.log("[Payment Page] Parsed amount:", parsedAmount);
    return parsedAmount;
  };

  const amount = parseAmount();

  useEffect(() => {
    async function createPaymentIntent() {
      console.log("[Payment Page] Creating payment intent with amount:", amount);
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount }),
        });

        console.log("[Payment Page] Payment intent response status:", response.status);

        if (!response.ok) {
          const data = await response.json();
          console.error("[Payment Page] Payment intent creation failed:", data);
          throw new Error(data.error || 'Failed to create payment intent');
        }

        const data = await response.json();
        console.log("[Payment Page] Payment intent created successfully");
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error("[Payment Page] Error creating payment intent:", err);
        setError(err instanceof Error ? err.message : 'Failed to initialize payment');
      }
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      console.error("[Payment Page] Invalid amount:", amount);
      setError('Invalid payment amount. Please ensure the amount is a valid number greater than 0.');
      return;
    }

    createPaymentIntent();
  }, [amount]);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto border-destructive">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <h1 className="text-2xl font-bold">Complete Payment</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="text-lg font-semibold">
                Total Amount: AED {amount.toLocaleString()}
              </p>
            </div>
            <Elements 
              stripe={stripePromise} 
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                },
              }}
            >
              <PaymentForm />
            </Elements>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}