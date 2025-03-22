/**
 * Payment Routes
 * 
 * This module registers payment-related routes for the Express server.
 */

import express, { Express } from 'express';
import { PaymentController } from '../controllers/payment-controller';
import { verifyAuth } from '../../../server/firebase-admin';

/**
 * Register payment-related routes
 * @param app - Express application
 * @param paymentController - Optional payment controller instance
 */
export function registerPaymentRoutes(app: Express, paymentController?: PaymentController): void {
  const controller = paymentController || new PaymentController();
  
  /**
   * Create a payment intent
   * Requires authentication
   */
  app.post('/api/payments/create-intent', verifyAuth, (req, res) => {
    controller.createPaymentIntent(req, res);
  });
  
  /**
   * Get payment intent details
   * Requires authentication
   */
  app.get('/api/payments/intent/:paymentIntentId', verifyAuth, (req, res) => {
    controller.getPaymentIntent(req, res);
  });
  
  /**
   * Cancel a payment intent
   * Requires authentication
   */
  app.post('/api/payments/cancel/:paymentIntentId', verifyAuth, (req, res) => {
    controller.cancelPaymentIntent(req, res);
  });
  
  /**
   * Webhook endpoint for Stripe events
   * Does not require authentication as it's called by Stripe
   */
  app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    controller.handleWebhook(req, res);
  });
}