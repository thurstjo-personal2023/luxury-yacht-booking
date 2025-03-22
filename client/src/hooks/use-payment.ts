/**
 * Payment Hook
 * 
 * This hook provides functions and state for interacting with the payment service.
 */

import { useState } from 'react';
import { PaymentService, CreatePaymentIntentRequest, PaymentIntent, PaymentStatus } from '../lib/payment-service';

interface UsePaymentOptions {
  onSuccess?: (paymentIntent: PaymentIntent) => void;
  onError?: (error: string) => void;
}

interface UsePaymentReturn {
  // State
  paymentIntent: PaymentIntent | null;
  isLoading: boolean;
  error: string | null;
  
  // Functions
  createPaymentIntent: (data: CreatePaymentIntentRequest) => Promise<PaymentIntent | null>;
  getPaymentIntent: (paymentIntentId: string) => Promise<PaymentIntent | null>;
  cancelPaymentIntent: (paymentIntentId: string) => Promise<boolean>;
  
  // Utility functions
  isPaymentCompleted: () => boolean;
  isPending: () => boolean;
  isProcessing: () => boolean;
  isFailed: () => boolean;
  isCancelled: () => boolean;
}

/**
 * Hook for interacting with the payment service
 */
export function usePayment(options?: UsePaymentOptions): UsePaymentReturn {
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const { onSuccess, onError } = options || {};
  
  /**
   * Create a payment intent
   */
  const createPaymentIntent = async (data: CreatePaymentIntentRequest): Promise<PaymentIntent | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await PaymentService.createPaymentIntent(data);
      
      if (response.success && response.paymentIntent) {
        setPaymentIntent(response.paymentIntent);
        onSuccess?.(response.paymentIntent);
        return response.paymentIntent;
      }
      
      if (response.error) {
        setError(response.error);
        onError?.(response.error);
      } else {
        setError('Failed to create payment intent');
        onError?.('Failed to create payment intent');
      }
      
      return null;
    } catch (err) {
      const errorMessage = (err as Error).message || 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Get a payment intent
   */
  const getPaymentIntent = async (paymentIntentId: string): Promise<PaymentIntent | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await PaymentService.getPaymentIntent(paymentIntentId);
      
      if (response.success && response.paymentIntent) {
        setPaymentIntent(response.paymentIntent);
        return response.paymentIntent;
      }
      
      if (response.error) {
        setError(response.error);
        onError?.(response.error);
      } else {
        setError('Failed to retrieve payment intent');
        onError?.('Failed to retrieve payment intent');
      }
      
      return null;
    } catch (err) {
      const errorMessage = (err as Error).message || 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Cancel a payment intent
   */
  const cancelPaymentIntent = async (paymentIntentId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await PaymentService.cancelPaymentIntent(paymentIntentId);
      
      if (response.success) {
        // If we have the current payment intent and it matches the cancelled one,
        // update its status
        if (paymentIntent && paymentIntent.id === paymentIntentId) {
          setPaymentIntent({
            ...paymentIntent,
            status: PaymentStatus.CANCELLED
          });
        }
        
        return true;
      }
      
      if (response.error) {
        setError(response.error);
        onError?.(response.error);
      } else {
        setError('Failed to cancel payment intent');
        onError?.('Failed to cancel payment intent');
      }
      
      return false;
    } catch (err) {
      const errorMessage = (err as Error).message || 'An unexpected error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Check if the payment is completed
   */
  const isPaymentCompleted = (): boolean => {
    return !!paymentIntent && paymentIntent.status === PaymentStatus.COMPLETED;
  };
  
  /**
   * Check if the payment is pending
   */
  const isPending = (): boolean => {
    return !!paymentIntent && paymentIntent.status === PaymentStatus.PENDING;
  };
  
  /**
   * Check if the payment is processing
   */
  const isProcessing = (): boolean => {
    return !!paymentIntent && paymentIntent.status === PaymentStatus.PROCESSING;
  };
  
  /**
   * Check if the payment has failed
   */
  const isFailed = (): boolean => {
    return !!paymentIntent && paymentIntent.status === PaymentStatus.FAILED;
  };
  
  /**
   * Check if the payment has been cancelled
   */
  const isCancelled = (): boolean => {
    return !!paymentIntent && paymentIntent.status === PaymentStatus.CANCELLED;
  };
  
  return {
    paymentIntent,
    isLoading,
    error,
    createPaymentIntent,
    getPaymentIntent,
    cancelPaymentIntent,
    isPaymentCompleted,
    isPending,
    isProcessing,
    isFailed,
    isCancelled
  };
}