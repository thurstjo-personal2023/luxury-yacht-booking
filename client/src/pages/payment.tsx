import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { stripePromise } from "@/lib/stripe";

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error("Stripe.js hasn't loaded yet");
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-confirmation`,
        },
      });

      if (error) {
        console.error("Payment confirmation error:", error);
        toast({
          variant: "destructive",
          title: "Payment failed",
          description: error.message || "An error occurred during payment",
        });
      }
    } catch (err) {
      console.error("Payment error:", err);
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
      <div className="space-y-4">
        <PaymentElement />
        <div className="text-sm text-muted-foreground">
          <p>Test Mode Instructions:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Use card number: 4242 4242 4242 4242</li>
            <li>Any future date for expiry (MM/YY)</li>
            <li>Any 3 digits for CVC</li>
            <li>Any 5 digits for postal code</li>
          </ul>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </span>
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
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const amount = parseFloat(searchParams.get('amount') || '0');

  useEffect(() => {
    async function createPaymentIntent() {
      try {
        console.log("Creating payment intent for amount:", amount);
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.details || 'Failed to create payment intent');
        }

        const data = await response.json();
        console.log("Payment intent created successfully");
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize payment. Please try again.');
      }
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      setError('Invalid payment amount. Please try again.');
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
                Total Amount: AED {(amount / 100).toLocaleString()}
              </p>
            </div>
            <Elements stripe={stripePromise} options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#000000',
                },
              },
            }}>
              <PaymentForm />
            </Elements>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}