/**
 * Payment Page
 * 
 * Example page showing how to use the payment components in a real application.
 */

import React, { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { PaymentCard } from '@/components/payment/payment-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';

enum PaymentStatus {
  NOT_STARTED = 'not_started',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export default function PaymentPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/payment/:bookingId');
  const bookingId = params?.bookingId || 'demo-booking';
  const { user } = useAuth();
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.NOT_STARTED);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Example booking data - in a real app, this would come from the backend
  const bookingData = {
    id: bookingId,
    totalPrice: 5000,
    currency: 'AED',
    yachtId: 'demo-yacht',
    description: 'Luxury yacht booking for demo'
  };
  
  // Handle successful payment
  const handlePaymentSuccess = (paymentIntentId: string) => {
    console.log('Payment succeeded with intent ID:', paymentIntentId);
    
    // In a real application, you would update the booking status in the backend
    // through a dedicated API endpoint
    
    setPaymentStatus(PaymentStatus.COMPLETED);
  };
  
  // Handle payment error
  const handlePaymentError = (error: string) => {
    console.error('Payment failed:', error);
    setPaymentStatus(PaymentStatus.FAILED);
    setPaymentError(error);
  };
  
  // Handle payment cancellation
  const handlePaymentCancel = () => {
    console.log('Payment cancelled by user');
    setPaymentStatus(PaymentStatus.CANCELLED);
    
    // Navigate back to booking page
    setLocation(`/bookings/${bookingId}`);
  };
  
  // Render based on payment status
  if (paymentStatus === PaymentStatus.COMPLETED) {
    return (
      <div className="container max-w-4xl mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-6 w-6 text-green-500" />
              Payment Successful
            </CardTitle>
            <CardDescription>Your payment has been processed successfully.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Thank you for your payment of {bookingData.totalPrice} {bookingData.currency}. Your booking has been confirmed.
            </p>
            <p>
              A confirmation email has been sent to your email address. You can also view your booking details in your account dashboard.
            </p>
          </CardContent>
          <CardFooter>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setLocation('/bookings')}>
                View My Bookings
              </Button>
              <Button onClick={() => setLocation('/')}>
                Back to Home
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (paymentStatus === PaymentStatus.FAILED) {
    return (
      <div className="container max-w-4xl mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-6 w-6 text-red-500" />
              Payment Failed
            </CardTitle>
            <CardDescription>There was a problem processing your payment.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              {paymentError || 'An unexpected error occurred during payment processing.'}
            </p>
            <p>
              Please try again or use a different payment method. If the problem persists, contact customer support.
            </p>
          </CardContent>
          <CardFooter>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setLocation(`/bookings/${bookingId}`)}>
                Back to Booking
              </Button>
              <Button onClick={() => setPaymentStatus(PaymentStatus.NOT_STARTED)}>
                Try Again
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl mx-auto py-10">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
            <CardDescription>Review your booking details before payment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Booking ID</span>
              <span>{bookingData.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Amount</span>
              <span>{bookingData.totalPrice} {bookingData.currency}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Description</span>
              <span>{bookingData.description}</span>
            </div>
          </CardContent>
        </Card>
        
        <PaymentCard
          amount={bookingData.totalPrice}
          currency={bookingData.currency}
          bookingId={bookingData.id}
          customerId={user?.uid}
          yachtId={bookingData.yachtId}
          description={bookingData.description}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          onPaymentCancel={handlePaymentCancel}
        />
      </div>
    </div>
  );
}