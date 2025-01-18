import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

// Use the environment variable directly
const stripePromise = loadStripe("pk_test_51QiY7MHld5Z9DroAkruR5iLpe8ypSOMArYmbikoaGZuIg7dikehIKnVhED5PNwQx8qhb6Tp1KdSURMSZH8XlPQmM00ymFCgZwQ");

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("card");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
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
        toast({
          variant: "destructive",
          title: "Payment failed",
          description: error.message,
        });
      }
    } catch (err) {
      console.error("Payment failed:", err);
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
        <label className="text-sm font-medium">Payment Method</label>
        <Select
          value={paymentMethod}
          onValueChange={setPaymentMethod}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="card">Credit Card</SelectItem>
            <SelectItem value="wallet">Digital Wallet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <PaymentElement />

      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? "Processing..." : "Complete Payment"}
      </Button>
    </form>
  );
}

export default function PaymentPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1]);
  const amount = parseInt(searchParams.get('amount') || '0');

  // Convert amount to cents for Stripe
  const amountInCents = amount * 100;

  const options = {
    mode: "payment" as const,
    amount: amountInCents, // Amount in cents
    currency: 'aed',
    appearance: {
      theme: 'stripe' as const,
    },
  };

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
              <p className="text-lg font-semibold">Total Amount: AED {amount.toLocaleString()}</p>
            </div>
            <Elements stripe={stripePromise} options={options}>
              <PaymentForm />
            </Elements>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}