/**
 * Navigation Service Interface
 * 
 * This interface defines navigation operations that can be implemented
 * by different navigation frameworks (e.g., Wouter, React Router).
 */

export interface INavigationService {
  /**
   * Navigate to a new path, adding to history
   */
  navigateTo(path: string): void;
  
  /**
   * Replace the current history entry with a new path
   */
  replaceWith(path: string): void;
  
  /**
   * Navigate back to the previous history entry
   */
  goBack(): void;
  
  /**
   * Get the current path
   */
  getCurrentPath(): string;
}