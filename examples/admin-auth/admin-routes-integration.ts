/**
 * Admin Routes Integration Example
 * 
 * This file demonstrates how to integrate the admin authentication
 * clean architecture components with an Express application.
 */

import express, { Express } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { getApp } from 'firebase-admin/app';
import { setupAdminAuthController } from '../../adapters/controllers/admin-auth-controller-factory';

/**
 * Set up an Express app with admin authentication routes
 */
export function setupAdminAuthApp(): Express {
  // Create Express app
  const app = express();
  app.use(express.json());
  
  // Get Firebase instances
  const firebaseApp = getApp();
  const firestore = getFirestore(firebaseApp);
  
  // Set up admin auth controller and routes
  setupAdminAuthController({
    app,
    firestore,
    firebaseApp,
    basePath: '/api/admin'
  });
  
  // Add health check route
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'admin-auth' });
  });
  
  return app;
}

/**
 * Example usage in a standalone app
 */
if (require.main === module) {
  const app = setupAdminAuthApp();
  const port = process.env.PORT || 3000;
  
  app.listen(port, () => {
    console.log(`Admin authentication server running on port ${port}`);
  });
}

/**
 * Example usage integrated with an existing Express app
 */
export function integrateWithExistingApp(existingApp: Express): void {
  // Get Firebase instances
  const firebaseApp = getApp();
  const firestore = getFirestore(firebaseApp);
  
  // Set up admin auth controller and routes on the existing app
  setupAdminAuthController({
    app: existingApp,
    firestore,
    firebaseApp,
    basePath: '/api/admin'  // Routes will be mounted under /api/admin
  });
  
  console.log('Admin authentication routes registered with existing app');
}