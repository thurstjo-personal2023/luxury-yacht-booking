/**
 * Admin Payout Routes Registration
 * 
 * This file contains the function to register admin payout routes with the Express app.
 */
import { Express } from 'express';
import { adminPayoutRoutes } from './admin-payout-routes';

/**
 * Register admin payout management routes with the Express app
 * 
 * @param app Express application instance
 */
export function registerAdminPayoutRoutes(app: Express): void {
  app.use('/api/admin/payouts', adminPayoutRoutes);
}