/**
 * Admin Authentication Controller Factory
 * 
 * This factory creates and configures the admin authentication controller
 * with its dependencies and registers its routes with an Express app.
 */

import { Express } from 'express';
import { Firestore } from 'firebase-admin/firestore';
import { AdminAuthModules, createAdminAuthModules } from '../../core/application/factories/admin-auth-factory';
import { AdminAuthController } from './admin-auth-controller';
import { verifyAdminAuth } from '../../server/admin-routes';

interface AdminAuthControllerFactoryOptions {
  app: Express;
  firestore: Firestore;
  firebaseApp: any;
  basePath?: string;
}

/**
 * Create the admin authentication controller and register its routes
 */
export function setupAdminAuthController(options: AdminAuthControllerFactoryOptions): {
  controller: AdminAuthController;
  modules: AdminAuthModules;
} {
  const { app, firestore, firebaseApp, basePath = '/api/admin' } = options;

  // Create admin auth modules
  const modules = createAdminAuthModules({
    firestore,
    firebaseApp
  });

  // Create controller
  const controller = new AdminAuthController(
    modules.authenticateAdminUseCase,
    modules.verifyAdminMfaUseCase,
    modules.createAdminInvitationUseCase,
    modules.verifyAdminInvitationUseCase,
    modules.registerAdminUseCase
  );

  // Register routes
  
  // Login route - public
  app.post(`${basePath}/login`, (req, res) => controller.login(req, res));
  
  // MFA verification route - public (but requires valid adminId from login)
  app.post(`${basePath}/verify-mfa`, (req, res) => controller.verifyMfa(req, res));
  
  // Create invitation route - protected, only for admins
  app.post(`${basePath}/create-invitation`, verifyAdminAuth, (req, res) => controller.createInvitation(req, res));
  
  // Verify invitation route - public
  app.post(`${basePath}/verify-invitation`, (req, res) => controller.verifyInvitation(req, res));
  
  // Register admin route - public (but requires valid invitation code)
  app.post(`${basePath}/register`, (req, res) => controller.registerAdmin(req, res));

  return { controller, modules };
}