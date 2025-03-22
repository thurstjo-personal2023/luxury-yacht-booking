/**
 * Create Addon Use Case Tests
 * 
 * Tests for the CreateAddonUseCase in the application layer.
 */

import { BaseUseCaseTest } from '../../../../../utils/base-use-case-test';
import { CreateAddonUseCase } from '../../../../../../core/application/use-cases/addon/create-addon-use-case';
import { createTestAddon } from '../../../../../utils/addon-test-utils';
import { Addon } from '../../../../../../core/domain/addon/addon';
import { AddonType } from '../../../../../../core/domain/addon/addon-type';
import { MockRepositoryFactory } from '../../../../../mocks/repositories/mock-repository-factory';
import { MockAddonRepository } from '../../../../../mocks/repositories/addon/mock-addon-repository';
import { AddonValidationError } from '../../../../../../core/domain/addon/addon-errors';

// Test suite for CreateAddonUseCase
describe('CreateAddonUseCase', () => {
  // Use our base use case test class to handle common setup
  class CreateAddonTests extends BaseUseCaseTest<CreateAddonUseCase> {
    constructor() {
      super((repositoryFactory) => new CreateAddonUseCase(repositoryFactory));
    }
    
    // Helper to get mock addon repository
    getMockAddonRepository(): MockAddonRepository {
      return MockRepositoryFactory.getMockAddonRepository();
    }
  }
  
  let tests: CreateAddonTests;
  
  beforeEach(() => {
    tests = new CreateAddonTests();
  });
  
  // Test case: Valid addon creation
  test('should create a valid addon', async () => {
    // Arrange
    const testAddon = createTestAddon({
      id: undefined, // ID will be assigned by repository
      partnerId: 'partner-123',
      name: 'Test Service',
      type: AddonType.SERVICE
    });
    
    // Mock the repository to return a specific ID
    const expectedId = 'new-addon-123';
    tests.setRepositoryMethodBehavior(
      () => tests.getMockAddonRepository(),
      'create',
      { returnValue: expectedId }
    );
    
    // Act
    const result = await tests.useCase.execute(testAddon, { user: { uid: 'partner-123', role: 'partner' }});
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBe(expectedId);
    
    // Verify repository was called with the correct data
    tests.assertRepositoryMethodCalled(
      () => tests.getMockAddonRepository(),
      'create'
    );
    
    tests.assertRepositoryMethodCalledWith(
      () => tests.getMockAddonRepository(),
      'create',
      {
        ...testAddon,
        partnerId: 'partner-123' // Should use the context user ID
      }
    );
  });
  
  // Test case: Unauthorized user
  test('should reject creation from unauthorized user', async () => {
    // Arrange
    const testAddon = createTestAddon({
      partnerId: 'partner-123' // Different from auth context
    });
    
    // Act
    const result = await tests.useCase.execute(testAddon, { user: { uid: 'different-user', role: 'consumer' }});
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('not authorized');
    
    // Verify repository was NOT called
    expect(tests.getMockAddonRepository().wasMethodCalled('create')).toBe(false);
  });
  
  // Test case: Missing required fields
  test('should reject addon with missing required fields', async () => {
    // Arrange
    const invalidAddon = {
      partnerId: 'partner-123',
      // Missing name and other required fields
    } as unknown as Addon;
    
    // Act
    const result = await tests.useCase.execute(invalidAddon, { user: { uid: 'partner-123', role: 'partner' }});
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(AddonValidationError);
    
    // Verify repository was NOT called
    expect(tests.getMockAddonRepository().wasMethodCalled('create')).toBe(false);
  });
  
  // Test case: Repository error handling
  test('should handle repository errors', async () => {
    // Arrange
    const testAddon = createTestAddon({
      partnerId: 'partner-123'
    });
    
    // Mock the repository to throw an error
    tests.setRepositoryMethodBehavior(
      () => tests.getMockAddonRepository(),
      'create',
      { error: new Error('Database error') }
    );
    
    // Act
    const result = await tests.useCase.execute(testAddon, { user: { uid: 'partner-123', role: 'partner' }});
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Error creating addon');
    
    // Verify repository was called
    tests.assertRepositoryMethodCalled(
      () => tests.getMockAddonRepository(),
      'create'
    );
  });
});