/**
 * Admin Authentication Factory
 * 
 * This factory creates and configures all components needed for the
 * admin authentication system, wiring them together with their dependencies.
 */

import { Firestore } from 'firebase-admin/firestore';
import { AdminAuthenticationService } from '../../domain/admin/admin-authentication-service';
import { AdminAuthorizationService } from '../../domain/admin/admin-authorization-service';
import { AdminInvitationService } from '../../domain/admin/admin-invitation-service';
import { FirebaseAdminRepository } from '../../../adapters/repositories/firebase/firebase-admin-repository';
import { FirebaseAdminCredentialsRepository } from '../../../adapters/repositories/firebase/firebase-admin-credentials-repository';
import { FirebaseAdminInvitationRepository } from '../../../adapters/repositories/firebase/firebase-admin-invitation-repository';
import { FirebaseAuthProvider } from '../../../adapters/auth/firebase-auth-provider';
import { IAuthProvider } from '../interfaces/auth/auth-provider';
import { IAdminRepository } from '../interfaces/repositories/admin-repository';
import { IAdminCredentialsRepository } from '../interfaces/repositories/admin-credentials-repository';
import { IAdminInvitationRepository } from '../interfaces/repositories/admin-invitation-repository';
import { AuthenticateAdminUseCase } from '../use-cases/admin/authenticate-admin-use-case';
import { VerifyAdminMfaUseCase } from '../use-cases/admin/verify-admin-mfa-use-case';
import { CreateAdminInvitationUseCase } from '../use-cases/admin/create-admin-invitation-use-case';
import { VerifyAdminInvitationUseCase } from '../use-cases/admin/verify-admin-invitation-use-case';
import { RegisterAdminUseCase } from '../use-cases/admin/register-admin-use-case';

export interface AdminAuthFactoryOptions {
  firestore: Firestore;
  firebaseApp?: any;
}

export interface AdminAuthModules {
  // Domain Services
  authenticationService: AdminAuthenticationService;
  authorizationService: AdminAuthorizationService;
  invitationService: AdminInvitationService;
  
  // Repositories
  adminRepository: IAdminRepository;
  credentialsRepository: IAdminCredentialsRepository;
  invitationRepository: IAdminInvitationRepository;
  
  // Auth Provider
  authProvider: IAuthProvider;
  
  // Use Cases
  authenticateAdminUseCase: AuthenticateAdminUseCase;
  verifyAdminMfaUseCase: VerifyAdminMfaUseCase;
  createAdminInvitationUseCase: CreateAdminInvitationUseCase;
  verifyAdminInvitationUseCase: VerifyAdminInvitationUseCase;
  registerAdminUseCase: RegisterAdminUseCase;
}

/**
 * Create all components for the admin authentication system
 */
export function createAdminAuthModules(options: AdminAuthFactoryOptions): AdminAuthModules {
  // Create repositories
  const adminRepository = new FirebaseAdminRepository(options.firestore);
  const credentialsRepository = new FirebaseAdminCredentialsRepository(options.firestore);
  const invitationRepository = new FirebaseAdminInvitationRepository(options.firestore);
  
  // Create auth provider
  const authProvider = new FirebaseAuthProvider(options.firebaseApp);
  
  // Create domain services
  const authenticationService = new AdminAuthenticationService(authProvider);
  const authorizationService = new AdminAuthorizationService();
  const invitationService = new AdminInvitationService();
  
  // Create use cases
  const authenticateAdminUseCase = new AuthenticateAdminUseCase(
    adminRepository,
    credentialsRepository,
    authProvider,
    authenticationService
  );
  
  const verifyAdminMfaUseCase = new VerifyAdminMfaUseCase(
    adminRepository,
    authProvider,
    authenticationService
  );
  
  const createAdminInvitationUseCase = new CreateAdminInvitationUseCase(
    invitationRepository,
    adminRepository,
    invitationService,
    authorizationService
  );
  
  const verifyAdminInvitationUseCase = new VerifyAdminInvitationUseCase(
    invitationRepository,
    invitationService
  );
  
  const registerAdminUseCase = new RegisterAdminUseCase(
    adminRepository,
    credentialsRepository,
    invitationRepository,
    authProvider,
    authenticationService
  );
  
  return {
    // Domain Services
    authenticationService,
    authorizationService,
    invitationService,
    
    // Repositories
    adminRepository,
    credentialsRepository,
    invitationRepository,
    
    // Auth Provider
    authProvider,
    
    // Use Cases
    authenticateAdminUseCase,
    verifyAdminMfaUseCase,
    createAdminInvitationUseCase,
    verifyAdminInvitationUseCase,
    registerAdminUseCase
  };
}