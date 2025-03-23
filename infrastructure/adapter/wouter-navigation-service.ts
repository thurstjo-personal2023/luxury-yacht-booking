/**
 * Wouter Navigation Service
 * 
 * This module implements the navigation service interface using Wouter.
 */

import { INavigationService } from '../../core/application/navigation/navigation-service.interface';

/**
 * Navigation service implementation using Wouter
 */
export class WouterNavigationService implements INavigationService {
  /**
   * Constructor
   * 
   * @param navigate Wouter's navigate function
   * @param location Current location from Wouter
   */
  constructor(
    private navigate: (path: string, options?: { replace?: boolean }) => void,
    private location: string
  ) {}
  
  /**
   * Navigate to a specific path
   */
  navigateTo(path: string): void {
    this.navigate(path);
  }
  
  /**
   * Replace the current location with a new path
   */
  replaceWith(path: string): void {
    this.navigate(path, { replace: true });
  }
  
  /**
   * Go back to the previous location
   */
  goBack(): void {
    window.history.back();
  }
  
  /**
   * Get the current path
   */
  getCurrentPath(): string {
    return this.location;
  }
  
  /**
   * Factory method to create the service from React hooks
   * This needs to be used within a React component since it uses hooks
   */
  static fromHooks(
    navigate: (path: string, options?: { replace?: boolean }) => void,
    location: string
  ): WouterNavigationService {
    return new WouterNavigationService(navigate, location);
  }
}