/**
 * Base Use Case Test
 * 
 * This module provides base utilities for testing use cases across all modules.
 * It handles common setup and assertion patterns for clean architecture use cases.
 */

import { MockRepositoryFactory } from '../mocks/repositories/mock-repository-factory';
import { IRepositoryFactory } from '../../core/application/ports/repositories/repository-factory';

/**
 * Base class for use case tests
 * Provides common functionality for setting up and testing use cases
 */
export abstract class BaseUseCaseTest<T> {
  // The use case under test
  protected useCase: T;
  
  // Repository factory for creating mock repositories
  protected repositoryFactory: IRepositoryFactory;
  
  /**
   * Constructor
   * @param useCaseFactory Function that creates the use case with repositories
   */
  constructor(useCaseFactory: (repositoryFactory: IRepositoryFactory) => T) {
    // Create a mock repository factory
    this.repositoryFactory = new MockRepositoryFactory();
    
    // Create the use case with the mock repository factory
    this.useCase = useCaseFactory(this.repositoryFactory);
  }
  
  /**
   * Reset all mock repositories before each test
   */
  beforeEach(): void {
    MockRepositoryFactory.resetAll();
  }
  
  /**
   * Assert that a method was called on a repository
   * @param repositoryGetter Function to get the repository from MockRepositoryFactory
   * @param methodName Name of the method to check
   */
  protected assertRepositoryMethodCalled(
    repositoryGetter: () => any,
    methodName: string
  ): void {
    const repository = repositoryGetter();
    expect(repository.wasMethodCalled(methodName)).toBe(true);
  }
  
  /**
   * Assert that a method was called with specific arguments
   * @param repositoryGetter Function to get the repository from MockRepositoryFactory
   * @param methodName Name of the method to check
   * @param expectedArgs Expected arguments
   */
  protected assertRepositoryMethodCalledWith(
    repositoryGetter: () => any,
    methodName: string,
    ...expectedArgs: any[]
  ): void {
    const repository = repositoryGetter();
    const calls = repository.getCallsForMethod(methodName);
    
    expect(calls.length).toBeGreaterThan(0);
    
    // Check if any call matches the expected arguments
    const hasMatchingCall = calls.some(call => {
      if (call.args.length !== expectedArgs.length) {
        return false;
      }
      
      // Check each argument
      for (let i = 0; i < expectedArgs.length; i++) {
        if (expectedArgs[i] === undefined) {
          // Skip undefined arguments (wildcard)
          continue;
        }
        
        if (JSON.stringify(call.args[i]) !== JSON.stringify(expectedArgs[i])) {
          return false;
        }
      }
      
      return true;
    });
    
    expect(hasMatchingCall).toBe(true);
  }
  
  /**
   * Set the behavior for a repository method
   * @param repositoryGetter Function to get the repository from MockRepositoryFactory
   * @param methodName Name of the method
   * @param behavior Behavior to set
   */
  protected setRepositoryMethodBehavior(
    repositoryGetter: () => any,
    methodName: string,
    behavior: { returnValue?: any; error?: Error; delay?: number; }
  ): void {
    const repository = repositoryGetter();
    repository.setMethodBehavior(methodName, behavior);
  }
}