/**
 * Payment Hook
 * 
 * Custom React hook for integrating with the payment service.
 * Provides methods for creating and managing payment intents.
 */

import { useState } from 'react';
import { PaymentService } from '@/lib/payment-service';
import { useToast } from '@/hooks/use-toast';

// Payment creation parameters
export interface CreatePaymentParams {
  amount: number;
  currency: string;
  metadata: {
    bookingId: string;
    customerId?: string;
    yachtId?: string;
    packageId?: string;
  };
  description?: string;
}

// Payment intent data
export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

// Payment processing parameters
export interface ProcessPaymentParams {
  paymentIntentId: string;
  paymentMethodId: string;
}

// Payment result 
export interface PaymentResult {
  paymentIntentId: string;
  status: string;
  success: boolean;
  amount: number;
  currency: string;
  processingDate: Date;
}

// Payment service instance
const paymentService = new PaymentService();

/**
 * Payment hook for managing payment operations
 */
export function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * Create a payment intent
   * @param params Payment creation parameters
   * @returns Payment intent data or null if error
   */
  const createPaymentIntent = async (params: CreatePaymentParams): Promise<PaymentIntent | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const paymentIntent = await paymentService.createPaymentIntent({
        amount: params.amount,
        currency: params.currency,
        metadata: params.metadata,
        description: params.description
      });
      
      return paymentIntent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment intent';
      setError(errorMessage);
      toast({
        title: 'Payment Error',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Process a payment using the payment method
   * @param params Payment processing parameters
   * @returns Payment result or null if error
   */
  const processPayment = async (params: ProcessPaymentParams): Promise<PaymentResult | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await paymentService.processPayment(
        params.paymentIntentId,
        params.paymentMethodId
      );
      
      if (result.success) {
        toast({
          title: 'Payment Successful',
          description: `Your payment of ${result.amount} ${result.currency} was successful.`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Payment Failed',
          description: `Payment could not be processed: ${result.status}`,
          variant: 'destructive'
        });
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process payment';
      setError(errorMessage);
      toast({
        title: 'Payment Error',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel an existing payment intent
   * @param paymentIntentId ID of the payment intent to cancel
   * @returns Success status
   */
  const cancelPaymentIntent = async (paymentIntentId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      await paymentService.cancelPaymentIntent(paymentIntentId);
      
      toast({
        title: 'Payment Cancelled',
        description: 'The payment has been cancelled.',
        variant: 'default'
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel payment';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Retrieve payment intent details
   * @param paymentIntentId ID of the payment intent
   * @returns Payment intent data or null if error
   */
  const getPaymentIntent = async (paymentIntentId: string): Promise<PaymentIntent | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const paymentIntent = await paymentService.getPaymentIntent(paymentIntentId);
      return paymentIntent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retrieve payment intent';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPaymentIntent,
    processPayment,
    cancelPaymentIntent,
    getPaymentIntent,
    loading,
    error
  };
}