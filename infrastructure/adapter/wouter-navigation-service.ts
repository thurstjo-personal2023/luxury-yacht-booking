/**
 * Wouter Navigation Service
 * 
 * This module implements the navigation service interface using wouter.
 * It handles programmatic navigation between routes in the application.
 */

import { INavigationService } from '../../core/application/services/navigation-service.interface';

/**
 * Wouter implementation of the navigation service
 * This uses window.location but could be adapted to use wouter's programmatic navigation
 */
export class WouterNavigationService implements INavigationService {
  private navigateCallback: (path: string) => void = () => {};
  
  /**
   * Constructor
   * @param navigate Optional navigation callback (from wouter's useLocation)
   */
  constructor(navigate?: (path: string) => void) {
    if (navigate) {
      this.navigateCallback = navigate;
    }
  }
  
  /**
   * Set the navigation callback
   * This should be called from the app's main component with the navigate function from useLocation
   */
  setNavigateCallback(navigate: (path: string) => void): void {
    this.navigateCallback = navigate;
  }
  
  /**
   * Navigate to a specific route
   */
  navigateTo(route: string): void {
    console.log('Navigation service: Navigating to', route);
    try {
      this.navigateCallback(route);
    } catch (error) {
      console.error('Navigation service: Error during navigation, falling back to window.location', error);
      window.location.href = route;
    }
  }
  
  /**
   * Navigate to the home page
   */
  navigateToHome(): void {
    this.navigateTo('/');
  }
  
  /**
   * Navigate to the login page
   */
  navigateToLogin(): void {
    this.navigateTo('/login');
  }
  
  /**
   * Navigate to the dashboard
   */
  navigateToDashboard(): void {
    this.navigateTo('/dashboard');
  }
  
  /**
   * Navigate to the admin login page
   */
  navigateToAdminLogin(): void {
    this.navigateTo('/admin/login');
  }
  
  /**
   * Navigate to the admin dashboard
   */
  navigateToAdminDashboard(): void {
    this.navigateTo('/admin/dashboard');
  }
  
  /**
   * Navigate to the media validation page
   */
  navigateToMediaValidation(): void {
    this.navigateTo('/admin/media-validation');
  }
  
  /**
   * Navigate to a specific error page
   */
  navigateToError(errorCode: string): void {
    this.navigateTo(`/error/${errorCode}`);
  }
}