/**
 * Authentication Use Cases
 * 
 * This module implements the authentication use cases for regular users,
 * following the clean architecture pattern.
 */

import { IAuthenticationService } from './auth-service.interface';
import { User, UserRole } from '../../domain/auth/user';
import { INavigationService } from '../navigation/navigation-service.interface';
import { AuthenticationError } from '../../domain/auth/auth-exceptions';

/**
 * Authentication use cases for regular users (consumers, producers, partners)
 */
export class AuthenticationUseCase {
  constructor(
    private authService: IAuthenticationService,
    private navigationService: INavigationService
  ) {}

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<User> {
    try {
      const user = await this.authService.signIn(email, password);
      return user;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Login failed', 'auth/unknown-error');
    }
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string): Promise<User> {
    try {
      const user = await this.authService.signUp(email, password);
      return user;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Registration failed', 'auth/unknown-error');
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    await this.authService.signOut();
    this.navigationService.navigateTo('/login');
  }

  /**
   * Get the currently authenticated user
   */
  getCurrentUser(): User | null {
    return this.authService.getCurrentUser();
  }

  /**
   * Check if a user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Check if the current user has a specific role
   */
  hasRole(role: UserRole): boolean {
    return this.authService.hasRole(role);
  }
  
  /**
   * Redirect the user based on their role
   */
  redirectBasedOnRole(role: UserRole | null): void {
    if (!role) {
      this.navigationService.navigateTo('/login');
      return;
    }
    
    switch (role) {
      case 'producer':
        this.navigationService.navigateTo('/producer/dashboard');
        break;
      case 'partner':
        this.navigationService.navigateTo('/partner/dashboard');
        break;
      case 'consumer':
      default:
        this.navigationService.navigateTo('/dashboard');
        break;
    }
  }
}