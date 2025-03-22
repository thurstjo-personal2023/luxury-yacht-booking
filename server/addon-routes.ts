/**
 * Add-on Routes Registration
 * 
 * This module registers the add-on routes in the Express application.
 */

import { Express } from 'express';
import { adminDb } from './firebase-admin';
import { AddonFactory } from '../infrastructure/factories/addon-factory';
import { registerAddonRoutes } from '../infrastructure/api/routes/addon-routes';

/**
 * Register the add-on routes in the Express application
 * @param app Express application
 */
export function registerAddOnRoutes(app: Express): void {
  // Create controllers using the factory
  const { addonController, bundleController } = AddonFactory.createControllers(adminDb);
  
  // Register routes with the controllers
  registerAddonRoutes(app, addonController, bundleController);
}