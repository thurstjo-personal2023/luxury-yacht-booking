/**
 * Navigation Service Interface
 * 
 * This interface defines the contract for navigation services 
 * that handle programmatic navigation between routes in the application.
 */

export interface INavigationService {
  /**
   * Navigate to a specific route
   */
  navigateTo(route: string): void;
  
  /**
   * Navigate to the home page
   */
  navigateToHome(): void;
  
  /**
   * Navigate to the login page
   */
  navigateToLogin(): void;
  
  /**
   * Navigate to the dashboard
   */
  navigateToDashboard(): void;
  
  /**
   * Navigate to the admin login page
   */
  navigateToAdminLogin(): void;
  
  /**
   * Navigate to the admin dashboard
   */
  navigateToAdminDashboard(): void;
  
  /**
   * Navigate to the media validation page
   */
  navigateToMediaValidation(): void;
  
  /**
   * Navigate to a specific error page
   */
  navigateToError(errorCode: string): void;
}