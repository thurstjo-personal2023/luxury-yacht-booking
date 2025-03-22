/**
 * Payment Service Interface
 * 
 * This interface defines the contract for payment processing services.
 * Implementations will handle integration with specific payment gateways.
 */

import { PaymentIntent, PaymentResult } from '../booking/payment-details';
import { BookingPaymentInfo } from '../booking/booking-payment-info';

export interface IPaymentService {
  /**
   * Create a payment intent for a booking
   * @param bookingInfo - Information about the booking and payment
   * @returns Payment intent details
   */
  createPaymentIntent(bookingInfo: BookingPaymentInfo): Promise<PaymentIntent>;
  
  /**
   * Retrieve details of a payment intent
   * @param paymentIntentId - Payment intent ID
   * @returns Payment intent details
   */
  getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;
  
  /**
   * Process a webhook event from the payment provider
   * @param eventPayload - Raw event payload
   * @param signature - Event signature for verification
   * @param webhookSecret - Secret for verifying the webhook
   * @returns Payment result or null if no action needed
   */
  processWebhookEvent(
    eventPayload: any, 
    signature: string, 
    webhookSecret: string
  ): Promise<PaymentResult | null>;
  
  /**
   * Cancel a payment intent
   * @param paymentIntentId - Payment intent ID
   * @returns Payment result
   */
  cancelPaymentIntent(paymentIntentId: string): Promise<PaymentResult>;
}