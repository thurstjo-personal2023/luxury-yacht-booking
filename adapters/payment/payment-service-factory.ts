/**
 * Payment Service Factory
 * 
 * This factory creates and configures payment service instances
 * based on the application's configuration.
 */

import { IPaymentService } from '../../core/domain/services/payment-service';
import { StripePaymentService } from './stripe-payment-service';

/**
 * Factory for creating payment service instances
 */
export class PaymentServiceFactory {
  /**
   * Create a Stripe payment service
   * @param config - Optional configuration overrides
   * @returns Configured Stripe payment service
   */
  static createStripeService(config?: {
    apiKey?: string;
    webhookSecret?: string;
  }): IPaymentService {
    // Get API key from environment or config
    const apiKey = config?.apiKey || process.env.STRIPE_SECRET_KEY || '';
    
    if (!apiKey) {
      throw new Error('Stripe API key is required. Set STRIPE_SECRET_KEY environment variable or provide apiKey in config.');
    }
    
    // Get webhook secret from environment or config
    const webhookSecret = config?.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';
    
    return new StripePaymentService(apiKey, webhookSecret);
  }
  
  /**
   * Create the default payment service based on environment configuration
   * @returns Default payment service implementation
   */
  static createDefaultService(): IPaymentService {
    // For now, we only support Stripe, but this could be expanded
    // to support other payment providers based on configuration
    return this.createStripeService();
  }
}