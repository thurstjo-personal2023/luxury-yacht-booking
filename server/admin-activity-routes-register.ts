/**
 * Register Admin Activity Routes
 * 
 * This module registers the admin activity log routes with Express.
 */
import { Express } from 'express';
import adminActivityRoutes from './admin-activity-routes';

export function registerAdminActivityRoutes(app: Express): void {
  app.use('/api/admin', adminActivityRoutes);
  console.log('Admin activity routes registered');
}