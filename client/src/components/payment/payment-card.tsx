/**
 * Payment Card Component
 * 
 * This component integrates with Stripe Elements to provide a secure payment form.
 */

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePayment } from '@/hooks/use-payment';
import { cn } from '@/lib/utils';

// Initialize Stripe with the public key
const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLIC_KEY || '');

interface PaymentFormProps {
  amount: number;
  currency?: string;
  bookingId: string;
  customerId?: string;
  yachtId?: string;
  packageId?: string;
  description?: string;
  onPaymentSuccess?: (paymentIntentId: string) => void;
  onPaymentError?: (error: string) => void;
  onPaymentCancel?: () => void;
}

/**
 * Credit Card Form Component (internal)
 */
const CreditCardForm: React.FC<PaymentFormProps> = ({
  amount,
  currency = 'AED',
  bookingId,
  customerId,
  yachtId,
  packageId,
  description,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  
  const { 
    createPaymentIntent, 
    paymentIntent,
    isLoading: isPaymentLoading,
    error: paymentError
  } = usePayment({
    onSuccess: (intent) => {
      console.log('Payment intent created successfully:', intent);
    },
    onError: (error) => {
      console.error('Error creating payment intent:', error);
      onPaymentError?.(error);
    }
  });
  
  // Handle errors from the payment service
  useEffect(() => {
    if (paymentError) {
      toast({
        title: 'Payment Error',
        description: paymentError,
        variant: 'destructive'
      });
    }
  }, [paymentError, toast]);
  
  // Handle card element changes
  const handleCardChange = (event: any) => {
    setIsCardComplete(event.complete);
    setCardError(event.error ? event.error.message : null);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      // Stripe.js has not yet loaded
      return;
    }
    
    // Disable the form and show processing state
    setIsProcessing(true);
    
    try {
      // Create a payment intent if one doesn't exist
      if (!paymentIntent) {
        const intent = await createPaymentIntent({
          amount,
          currency,
          metadata: {
            bookingId,
            customerId,
            yachtId,
            packageId
          },
          description
        });
        
        if (!intent) {
          throw new Error('Failed to create payment intent');
        }
      }
      
      // Get the card element
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Could not find card element');
      }
      
      // Confirm the payment with Stripe
      const { error, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(
        paymentIntent!.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: 'Customer'
            }
          }
        }
      );
      
      if (error) {
        throw new Error(error.message || 'Payment failed');
      }
      
      if (confirmedIntent?.status === 'succeeded') {
        toast({
          title: 'Payment Successful',
          description: `Your payment of ${amount} ${currency} was processed successfully.`,
          variant: 'default'
        });
        
        onPaymentSuccess?.(confirmedIntent.id);
      } else {
        toast({
          title: 'Payment Status',
          description: `Payment status: ${confirmedIntent?.status || 'unknown'}`,
          variant: 'default'
        });
      }
    } catch (error) {
      const errorMessage = (error as Error).message || 'Payment processing failed';
      setCardError(errorMessage);
      toast({
        title: 'Payment Failed',
        description: errorMessage,
        variant: 'destructive'
      });
      onPaymentError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="grid gap-2">
          <CardElement
            options={{
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
            }}
            onChange={handleCardChange}
          />
        </div>
        
        {cardError && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{cardError}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            disabled={isProcessing || isPaymentLoading} 
            onClick={onPaymentCancel}
          >
            Cancel
          </Button>
          
          <Button 
            type="submit" 
            disabled={!stripe || !isCardComplete || isProcessing || isPaymentLoading}
            className={cn(
              isProcessing && 'opacity-80'
            )}
          >
            {isProcessing || isPaymentLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${amount} ${currency}`
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

/**
 * Payment Card Component
 */
export const PaymentCard: React.FC<PaymentFormProps> = (props) => {
  // Handle errors if Stripe key isn't available
  if (!process.env.VITE_STRIPE_PUBLIC_KEY) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Payment Error</CardTitle>
          <CardDescription>Stripe API key is missing. Please contact support.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              The payment system is not properly configured. Please try again later or contact support.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={props.onPaymentCancel} variant="outline" className="w-full">
            Go Back
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>Enter your card details to complete the booking.</CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise}>
          <CreditCardForm {...props} />
        </Elements>
      </CardContent>
    </Card>
  );
};