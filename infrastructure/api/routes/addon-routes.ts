/**
 * Add-on Routes
 * 
 * This module registers routes for add-on management and bundling.
 */

import { Express, Request, Response, NextFunction } from 'express';
import { AddonController } from '../controllers/addon-controller';
import { AddonBundleController } from '../controllers/addon-bundle-controller';
import { verifyAuth } from '../../../server/firebase-admin';

// Role verification middleware
const verifyRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user exists and has a role
    if (!req.user || !req.user.role) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        details: 'User role not available or authenticated' 
      });
    }
    
    // Check if user's role is in the allowed list
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Forbidden', 
      details: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
    });
  };
};

/**
 * Register add-on routes for the API
 * @param app Express application
 * @param addonController Add-on controller
 * @param bundleController Add-on bundle controller
 */
export function registerAddonRoutes(
  app: Express,
  addonController: AddonController,
  bundleController: AddonBundleController
) {
  // Add-on routes
  
  /**
   * Create a new add-on
   * POST /api/addons
   */
  app.post(
    '/api/addons',
    verifyAuth,
    verifyRole(['partner']),
    (req, res) => addonController.createAddon(req, res)
  );
  
  /**
   * Get an add-on by ID
   * GET /api/addons/:id
   */
  app.get(
    '/api/addons/:id',
    (req, res) => addonController.getAddon(req, res)
  );
  
  /**
   * Update an existing add-on
   * PUT /api/addons/:id
   */
  app.put(
    '/api/addons/:id',
    verifyAuth,
    verifyRole(['partner']),
    (req, res) => addonController.updateAddon(req, res)
  );
  
  /**
   * Delete an add-on
   * DELETE /api/addons/:id
   */
  app.delete(
    '/api/addons/:id',
    verifyAuth,
    verifyRole(['partner']),
    (req, res) => addonController.deleteAddon(req, res)
  );
  
  /**
   * List all add-ons with filtering options
   * GET /api/addons
   */
  app.get(
    '/api/addons',
    (req, res) => addonController.listAddons(req, res)
  );
  
  /**
   * List add-ons for a specific partner
   * GET /api/addons/partner/:partnerId
   */
  app.get(
    '/api/addons/partner/:partnerId',
    (req, res) => addonController.listPartnerAddons(req, res)
  );
  
  /**
   * List add-ons for the authenticated partner
   * GET /api/addons/my-addons
   */
  app.get(
    '/api/addons/my-addons',
    verifyAuth,
    verifyRole(['partner']),
    (req, res) => addonController.listMyAddons(req, res)
  );
  
  // Add-on Bundle routes
  
  /**
   * Create a new add-on bundle for a yacht experience
   * POST /api/addon-bundles
   */
  app.post(
    '/api/addon-bundles',
    verifyAuth,
    verifyRole(['producer']),
    (req, res) => bundleController.createBundle(req, res)
  );
  
  /**
   * Get an add-on bundle by ID
   * GET /api/addon-bundles/:id
   */
  app.get(
    '/api/addon-bundles/:id',
    (req, res) => bundleController.getBundle(req, res)
  );
  
  /**
   * Get bundle by yacht ID
   * GET /api/addon-bundles/yacht/:yachtId
   */
  app.get(
    '/api/addon-bundles/yacht/:yachtId',
    (req, res) => {
      // Set the yachtId as a query parameter
      req.query.yachtId = req.params.yachtId;
      bundleController.getBundle(req, res);
    }
  );
  
  /**
   * Get all bundles that include a specific add-on
   * GET /api/addon-bundles/addon/:addonId
   */
  app.get(
    '/api/addon-bundles/addon/:addonId',
    (req, res) => bundleController.getBundlesByAddonId(req, res)
  );
  
  /**
   * Update the add-ons in a yacht experience
   * PUT /api/addon-bundles
   */
  app.put(
    '/api/addon-bundles',
    verifyAuth,
    verifyRole(['producer']),
    (req, res) => bundleController.updateBundle(req, res)
  );
  
  /**
   * Update the add-ons in a yacht experience
   * PUT /api/addon-bundles/yacht/:yachtId
   */
  app.put(
    '/api/addon-bundles/yacht/:yachtId',
    verifyAuth,
    verifyRole(['producer']),
    (req, res) => {
      // Set the yachtId in the request body
      req.body.yachtId = req.params.yachtId;
      bundleController.updateBundle(req, res);
    }
  );
}