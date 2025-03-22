/**
 * Get Addon Use Case Tests
 * 
 * Tests for the GetAddonUseCase in the application layer.
 */

import { BaseUseCaseTest } from '../../../../../utils/base-use-case-test';
import { GetAddonUseCase } from '../../../../../../core/application/use-cases/addon/get-addon-use-case';
import { createTestAddon } from '../../../../../utils/addon-test-utils';
import { MockRepositoryFactory } from '../../../../../mocks/repositories/mock-repository-factory';
import { MockAddonRepository } from '../../../../../mocks/repositories/addon/mock-addon-repository';
import { AddonNotFoundError } from '../../../../../../core/domain/addon/addon-errors';

// Test suite for GetAddonUseCase
describe('GetAddonUseCase', () => {
  // Use our base use case test class to handle common setup
  class GetAddonTests extends BaseUseCaseTest<GetAddonUseCase> {
    constructor() {
      super((repositoryFactory) => new GetAddonUseCase(repositoryFactory));
    }
    
    // Helper to get mock addon repository
    getMockAddonRepository(): MockAddonRepository {
      return MockRepositoryFactory.getMockAddonRepository();
    }
  }
  
  let tests: GetAddonTests;
  
  beforeEach(() => {
    tests = new GetAddonTests();
  });
  
  // Test case: Get existing addon
  test('should retrieve an existing addon', async () => {
    // Arrange
    const addonId = 'addon-123';
    const testAddon = createTestAddon({
      id: addonId,
      partnerId: 'partner-123',
      name: 'Premium Catering Service'
    });
    
    // Mock the repository to return the test addon
    tests.setRepositoryMethodBehavior(
      () => tests.getMockAddonRepository(),
      'getById',
      { returnValue: testAddon }
    );
    
    // Act
    const result = await tests.useCase.execute(addonId);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(testAddon);
    
    // Verify repository was called with the correct data
    tests.assertRepositoryMethodCalled(
      () => tests.getMockAddonRepository(),
      'getById'
    );
    
    tests.assertRepositoryMethodCalledWith(
      () => tests.getMockAddonRepository(),
      'getById',
      addonId
    );
  });
  
  // Test case: Get non-existent addon
  test('should return error for non-existent addon', async () => {
    // Arrange
    const addonId = 'non-existent-id';
    
    // Mock the repository to return null (not found)
    tests.setRepositoryMethodBehavior(
      () => tests.getMockAddonRepository(),
      'getById',
      { returnValue: null }
    );
    
    // Act
    const result = await tests.useCase.execute(addonId);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(AddonNotFoundError);
    expect(result.error?.message).toContain(addonId);
    
    // Verify repository was called
    tests.assertRepositoryMethodCalled(
      () => tests.getMockAddonRepository(),
      'getById'
    );
  });
  
  // Test case: Repository error handling
  test('should handle repository errors', async () => {
    // Arrange
    const addonId = 'addon-123';
    
    // Mock the repository to throw an error
    tests.setRepositoryMethodBehavior(
      () => tests.getMockAddonRepository(),
      'getById',
      { error: new Error('Database connection error') }
    );
    
    // Act
    const result = await tests.useCase.execute(addonId);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Error retrieving addon');
    
    // Verify repository was called
    tests.assertRepositoryMethodCalled(
      () => tests.getMockAddonRepository(),
      'getById'
    );
  });
});