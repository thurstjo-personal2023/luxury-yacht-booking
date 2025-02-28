import React, { useState, useEffect } from 'react';
import { 
  Elements, 
  CardElement, 
  useStripe, 
  useElements,
  PaymentRequestButtonElement
} from '@stripe/react-stripe-js';
import { PaymentRequest, StripeCardElementOptions } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getStripe, formatAmountForDisplay, formatAmountForStripe } from '@/lib/stripe';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Card element styles
const cardStyle: StripeCardElementOptions = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
};

interface CheckoutFormProps {
  amount: number;
  onPaymentComplete: (paymentIntentId: string) => void;
  onPaymentCancel: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ 
  amount, 
  onPaymentComplete,
  onPaymentCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'succeeded' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet'>('card');

  // Set up payment request for digital wallets (Apple Pay, Google Pay)
  useEffect(() => {
    if (stripe) {
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: 'Yacht Booking',
          amount: formatAmountForStripe(amount),
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      pr.canMakePayment().then(result => {
        if (result) {
          setPaymentRequest(pr);
        }
      });

      pr.on('paymentmethod', async (e) => {
        setPaymentStatus('processing');
        
        // In a real implementation, you would call your backend API here
        // to create a payment intent with the customer's details
        
        // Simulate a successful payment
        setTimeout(() => {
          e.complete('success');
          setPaymentStatus('succeeded');
          
          // Use a mock payment intent ID
          const mockPaymentIntentId = `pi_${Math.random().toString(36).substr(2, 9)}`;
          onPaymentComplete(mockPaymentIntentId);
          
          toast({
            title: "Payment successful!",
            description: "Your booking has been confirmed.",
          });
        }, 1500);
      });
    }
  }, [stripe, amount, onPaymentComplete, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet. Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    setPaymentStatus('processing');

    // In a real implementation, you would create a payment intent on your server
    // and return the client secret to complete the payment on the client side
    
    // For demo purposes, we'll simulate a successful payment
    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setPaymentStatus('error');
      setErrorMessage('Card element not found');
      return;
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate a successful payment
    setPaymentStatus('succeeded');
    
    // Use a mock payment intent ID
    const mockPaymentIntentId = `pi_${Math.random().toString(36).substr(2, 9)}`;
    onPaymentComplete(mockPaymentIntentId);
    
    toast({
      title: "Payment successful!",
      description: "Your booking has been confirmed.",
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {paymentRequest && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Express Checkout</label>
          <PaymentRequestButtonElement
            options={{
              paymentRequest,
              style: {
                paymentRequestButton: {
                  theme: 'dark',
                  height: '48px',
                }
              }
            }}
            onClick={() => setPaymentMethod('wallet')}
          />
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or pay with card
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Card Details</label>
        <div className="p-3 border rounded-md">
          <CardElement 
            options={cardStyle} 
            onChange={() => {
              if (errorMessage) setErrorMessage(null);
              if (paymentMethod !== 'card') setPaymentMethod('card');
            }}
          />
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {paymentStatus === 'succeeded' && (
        <Alert className="my-4 bg-green-50 text-green-800 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Payment successful! Redirecting to confirmation...
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between mt-6">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPaymentCancel}
          disabled={paymentStatus === 'processing' || paymentStatus === 'succeeded'}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={
            !stripe || 
            paymentStatus === 'processing' || 
            paymentStatus === 'succeeded'
          }
        >
          {paymentStatus === 'processing' && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {paymentStatus === 'processing' 
            ? 'Processing...' 
            : `Pay ${formatAmountForDisplay(amount)}`
          }
        </Button>
      </div>
    </form>
  );
};

interface StripePaymentProps {
  amount: number;
  onPaymentComplete: (paymentIntentId: string) => void;
  onPaymentCancel: () => void;
}

export function StripePayment({ 
  amount, 
  onPaymentComplete, 
  onPaymentCancel 
}: StripePaymentProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Complete Your Payment</CardTitle>
        <CardDescription>
          All transactions are secure and encrypted
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={getStripe()}>
          <CheckoutForm 
            amount={amount} 
            onPaymentComplete={onPaymentComplete}
            onPaymentCancel={onPaymentCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
}