/**
 * Payment Card Component
 * 
 * A reusable component for collecting and processing payments using Stripe.
 * Presents a card form and handles the payment submission process.
 */

import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, CreditCard } from 'lucide-react';
import { usePayment } from '@/hooks/use-payment';

// Card element styling
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

// Props interface for PaymentCard component
interface PaymentCardProps {
  amount: number;
  currency: string;
  bookingId: string;
  customerId?: string;
  yachtId?: string;
  description?: string;
  onPaymentSuccess?: (paymentIntentId: string) => void;
  onPaymentError?: (error: string) => void;
  onPaymentCancel?: () => void;
}

/**
 * Payment Card Component
 * 
 * Renders a card form for collecting payment information and processing payments.
 */
export function PaymentCard({
  amount,
  currency,
  bookingId,
  customerId,
  yachtId,
  description,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel
}: PaymentCardProps) {
  // Stripe hooks
  const stripe = useStripe();
  const elements = useElements();
  
  // Payment hook
  const { createPaymentIntent, processPayment, loading, error } = usePayment();
  
  // Component state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'succeeded' | 'error'>('idle');
  const [cardholderName, setCardholderName] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);
  
  // Create a payment intent on component mount
  useEffect(() => {
    const createIntent = async () => {
      if (!stripe || !elements) return;
      
      try {
        const paymentIntent = await createPaymentIntent({
          amount,
          currency,
          metadata: {
            bookingId,
            customerId,
            yachtId
          },
          description
        });
        
        if (paymentIntent) {
          setClientSecret(paymentIntent.clientSecret);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
        setCardError(errorMessage);
        if (onPaymentError) {
          onPaymentError(errorMessage);
        }
      }
    };
    
    createIntent();
  }, [stripe, elements, amount, currency, bookingId, customerId, yachtId, description, createPaymentIntent, onPaymentError]);

  /**
   * Handle payment form submission
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      return;
    }
    
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setCardError('Card element not found');
      return;
    }
    
    setPaymentProcessing(true);
    setPaymentStatus('processing');
    
    try {
      // Create payment method
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: cardholderName
        }
      });
      
      if (stripeError) {
        throw new Error(stripeError.message || 'Failed to process payment');
      }
      
      if (!paymentMethod) {
        throw new Error('Failed to generate payment method');
      }
      
      // Process the payment
      const result = await processPayment({
        paymentIntentId: clientSecret.split('_secret')[0],
        paymentMethodId: paymentMethod.id
      });
      
      if (result && result.success) {
        setPaymentStatus('succeeded');
        if (onPaymentSuccess) {
          onPaymentSuccess(result.paymentIntentId);
        }
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (err) {
      setPaymentStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setCardError(errorMessage);
      if (onPaymentError) {
        onPaymentError(errorMessage);
      }
    } finally {
      setPaymentProcessing(false);
    }
  };

  /**
   * Handle payment cancellation
   */
  const handleCancel = () => {
    if (onPaymentCancel) {
      onPaymentCancel();
    }
  };

  // Show messages based on payment status
  const renderStatusMessage = () => {
    if (paymentStatus === 'succeeded') {
      return (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-700">Payment Successful</AlertTitle>
          <AlertDescription className="text-green-600">
            Your payment has been processed successfully.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (paymentStatus === 'error' || cardError) {
      return (
        <Alert className="mb-4 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertTitle className="text-red-700">Payment Error</AlertTitle>
          <AlertDescription className="text-red-600">
            {cardError || 'There was an error processing your payment. Please try again.'}
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Payment Details
        </CardTitle>
        <CardDescription>
          Please enter your card information to complete your payment of {amount} {currency.toUpperCase()}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderStatusMessage()}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardholderName">Cardholder Name</Label>
              <Input
                id="cardholderName"
                placeholder="Name on card"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                required
                disabled={paymentProcessing || paymentStatus === 'succeeded'}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="card-element">Card Information</Label>
              <div className="p-3 border rounded-md bg-white">
                <CardElement 
                  id="card-element" 
                  options={cardElementOptions}
                  disabled={paymentProcessing || paymentStatus === 'succeeded'}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                All card information is securely processed by Stripe.
              </p>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleCancel}
          disabled={paymentProcessing || paymentStatus === 'succeeded'}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!stripe || !elements || paymentProcessing || paymentStatus === 'succeeded' || !clientSecret}
        >
          {paymentProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing
            </>
          ) : (
            paymentStatus === 'succeeded' ? 'Paid' : `Pay ${amount} ${currency.toUpperCase()}`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}