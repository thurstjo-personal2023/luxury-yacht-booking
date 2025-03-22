/**
 * Stripe Payment Service
 * 
 * This service implements the payment service interface using Stripe as the payment provider.
 */

import { IPaymentService } from '../../core/domain/services/payment-service';
import { PaymentIntent, PaymentResult } from '../../core/domain/booking/payment-details';
import { BookingPaymentInfo } from '../../core/domain/booking/booking-payment-info';
import { PaymentStatus } from '../../core/domain/booking/payment-status';
import Stripe from 'stripe';

export class StripePaymentService implements IPaymentService {
  private stripe: Stripe;
  private webhookEndpointSecret: string;
  
  /**
   * Initialize the Stripe payment service
   * @param apiKey - Stripe API key
   * @param webhookEndpointSecret - Secret for verifying Stripe webhooks
   */
  constructor(apiKey: string, webhookEndpointSecret?: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16', // Use latest available version
    });
    this.webhookEndpointSecret = webhookEndpointSecret || '';
  }
  
  /**
   * Create a payment intent for a booking
   * @param bookingInfo - Information about the booking and payment
   * @returns Payment intent details
   */
  async createPaymentIntent(bookingInfo: BookingPaymentInfo): Promise<PaymentIntent> {
    try {
      // Convert amount to lowest currency unit (e.g., cents)
      const amount = Math.round(bookingInfo.amount * 100);
      
      // Create payment intent with Stripe
      const intent = await this.stripe.paymentIntents.create({
        amount,
        currency: bookingInfo.currency.toLowerCase(),
        description: bookingInfo.description || 'Etoile Yachts Booking',
        metadata: bookingInfo.metadata,
      });
      
      // Map Stripe status to our domain status
      const status = this.mapStripeStatusToDomain(intent.status);
      
      // Return domain PaymentIntent
      return {
        id: intent.id,
        clientSecret: intent.client_secret as string,
        amount: bookingInfo.amount, // Store original amount, not in cents
        currency: bookingInfo.currency,
        status
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error(`Failed to create payment intent: ${(error as Error).message}`);
    }
  }
  
  /**
   * Retrieve details of a payment intent
   * @param paymentIntentId - Payment intent ID
   * @returns Payment intent details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    try {
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      const status = this.mapStripeStatusToDomain(intent.status);
      
      return {
        id: intent.id,
        clientSecret: intent.client_secret as string,
        amount: intent.amount / 100, // Convert from cents to original currency
        currency: intent.currency.toUpperCase(),
        status
      };
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw new Error(`Failed to retrieve payment intent: ${(error as Error).message}`);
    }
  }
  
  /**
   * Process a webhook event from Stripe
   * @param eventPayload - Raw event payload
   * @param signature - Event signature for verification
   * @param webhookSecret - Secret for verifying the webhook (overrides constructor value if provided)
   * @returns Payment result or null if no action needed
   */
  async processWebhookEvent(
    eventPayload: any,
    signature: string,
    webhookSecret?: string
  ): Promise<PaymentResult | null> {
    try {
      const secret = webhookSecret || this.webhookEndpointSecret;
      
      if (!secret) {
        throw new Error('Webhook secret not provided');
      }
      
      // Verify the webhook signature
      const event = this.stripe.webhooks.constructEvent(
        typeof eventPayload === 'string' ? eventPayload : JSON.stringify(eventPayload),
        signature,
        secret
      );
      
      // Process based on event type
      switch (event.type) {
        case 'payment_intent.succeeded':
          return this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          
        case 'payment_intent.payment_failed':
          return this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          
        case 'payment_intent.canceled':
          return this.handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
          
        default:
          // Not a relevant event for our domain
          return null;
      }
    } catch (error) {
      console.error('Error processing webhook event:', error);
      throw new Error(`Failed to process webhook event: ${(error as Error).message}`);
    }
  }
  
  /**
   * Cancel a payment intent
   * @param paymentIntentId - Payment intent ID
   * @returns Payment result
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentResult> {
    try {
      const intent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      
      return {
        paymentIntentId: intent.id,
        status: PaymentStatus.CANCELLED,
        amount: intent.amount / 100,
        currency: intent.currency.toUpperCase(),
        metadata: intent.metadata as Record<string, string>,
        processedAt: new Date()
      };
    } catch (error) {
      console.error('Error canceling payment intent:', error);
      throw new Error(`Failed to cancel payment intent: ${(error as Error).message}`);
    }
  }
  
  /**
   * Map Stripe payment intent status to domain PaymentStatus
   * @param stripeStatus - Stripe payment intent status
   * @returns Domain payment status
   */
  private mapStripeStatusToDomain(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
      case 'requires_capture':
        return PaymentStatus.PENDING;
        
      case 'processing':
        return PaymentStatus.PROCESSING;
        
      case 'succeeded':
        return PaymentStatus.COMPLETED;
        
      case 'canceled':
        return PaymentStatus.CANCELLED;
        
      default:
        return PaymentStatus.FAILED;
    }
  }
  
  /**
   * Handle payment_intent.succeeded event
   * @param intent - Stripe payment intent
   * @returns Payment result
   */
  private handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent): PaymentResult {
    return {
      paymentIntentId: intent.id,
      status: PaymentStatus.COMPLETED,
      amount: intent.amount / 100,
      currency: intent.currency.toUpperCase(),
      metadata: intent.metadata as Record<string, string>,
      processedAt: new Date()
    };
  }
  
  /**
   * Handle payment_intent.payment_failed event
   * @param intent - Stripe payment intent
   * @returns Payment result
   */
  private handlePaymentIntentFailed(intent: Stripe.PaymentIntent): PaymentResult {
    const error = intent.last_payment_error?.message || 'Payment failed';
    
    return {
      paymentIntentId: intent.id,
      status: PaymentStatus.FAILED,
      amount: intent.amount / 100,
      currency: intent.currency.toUpperCase(),
      metadata: intent.metadata as Record<string, string>,
      processedAt: new Date(),
      error
    };
  }
  
  /**
   * Handle payment_intent.canceled event
   * @param intent - Stripe payment intent
   * @returns Payment result
   */
  private handlePaymentIntentCanceled(intent: Stripe.PaymentIntent): PaymentResult {
    return {
      paymentIntentId: intent.id,
      status: PaymentStatus.CANCELLED,
      amount: intent.amount / 100,
      currency: intent.currency.toUpperCase(),
      metadata: intent.metadata as Record<string, string>,
      processedAt: new Date()
    };
  }
}