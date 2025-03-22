/**
 * Payment Controller
 * 
 * This controller handles HTTP requests related to payment processing.
 */

import { Request, Response } from 'express';
import { IPaymentService } from '../../../core/domain/services/payment-service';
import { BookingPaymentInfo } from '../../../core/domain/booking/booking-payment-info';
import { PaymentServiceFactory } from '../../../adapters/payment/payment-service-factory';

export class PaymentController {
  private paymentService: IPaymentService;
  
  /**
   * Initialize the payment controller
   * @param paymentService - Optional payment service implementation
   */
  constructor(paymentService?: IPaymentService) {
    this.paymentService = paymentService || PaymentServiceFactory.createDefaultService();
  }
  
  /**
   * Create a payment intent for a booking
   * @param req - Express request
   * @param res - Express response
   */
  async createPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const paymentInfo: BookingPaymentInfo = req.body;
      
      // Validate required fields
      if (!paymentInfo.amount || !paymentInfo.currency || !paymentInfo.metadata?.bookingId) {
        res.status(400).json({
          success: false,
          error: 'Missing required payment information'
        });
        return;
      }
      
      // Add current user ID as customer ID if not provided
      if (!paymentInfo.metadata.customerId && req.user?.uid) {
        paymentInfo.metadata.customerId = req.user.uid;
      }
      
      // Create payment intent
      const paymentIntent = await this.paymentService.createPaymentIntent(paymentInfo);
      
      res.status(200).json({
        success: true,
        paymentIntent
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message || 'Failed to create payment intent'
      });
    }
  }
  
  /**
   * Retrieve a payment intent
   * @param req - Express request
   * @param res - Express response
   */
  async getPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const { paymentIntentId } = req.params;
      
      if (!paymentIntentId) {
        res.status(400).json({
          success: false,
          error: 'Payment intent ID is required'
        });
        return;
      }
      
      // Get payment intent
      const paymentIntent = await this.paymentService.getPaymentIntent(paymentIntentId);
      
      res.status(200).json({
        success: true,
        paymentIntent
      });
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message || 'Failed to retrieve payment intent'
      });
    }
  }
  
  /**
   * Cancel a payment intent
   * @param req - Express request
   * @param res - Express response
   */
  async cancelPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const { paymentIntentId } = req.params;
      
      if (!paymentIntentId) {
        res.status(400).json({
          success: false,
          error: 'Payment intent ID is required'
        });
        return;
      }
      
      // Cancel payment intent
      const result = await this.paymentService.cancelPaymentIntent(paymentIntentId);
      
      res.status(200).json({
        success: true,
        result
      });
    } catch (error) {
      console.error('Error canceling payment intent:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message || 'Failed to cancel payment intent'
      });
    }
  }
  
  /**
   * Handle Stripe webhook events
   * @param req - Express request
   * @param res - Express response
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        res.status(400).json({
          success: false,
          error: 'Missing Stripe signature'
        });
        return;
      }
      
      // Process webhook event
      const result = await this.paymentService.processWebhookEvent(
        req.body,
        signature
      );
      
      // Return 200 even if event isn't relevant for our domain
      res.status(200).json({
        success: true,
        result: result || { processed: false }
      });
    } catch (error) {
      console.error('Error processing webhook:', error);
      // Always return 200 for webhooks, even if there's an error,
      // to prevent Stripe from retrying the webhook
      res.status(200).json({
        success: false,
        error: (error as Error).message || 'Failed to process webhook'
      });
    }
  }
}