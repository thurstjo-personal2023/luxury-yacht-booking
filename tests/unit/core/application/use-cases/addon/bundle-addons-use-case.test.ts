/**
 * Bundle Addons Use Case Tests
 * 
 * Tests for the BundleAddonsUseCase in the application layer.
 */

import { BaseUseCaseTest } from '../../../../../utils/base-use-case-test';
import { BundleAddonsUseCase } from '../../../../../../core/application/use-cases/addon/bundle-addons-use-case';
import { createTestAddon, createTestBundle, createAddonReference } from '../../../../../utils/addon-test-utils';
import { MockRepositoryFactory } from '../../../../../mocks/repositories/mock-repository-factory';
import { MockAddonRepository } from '../../../../../mocks/repositories/addon/mock-addon-repository';
import { MockAddonBundleRepository } from '../../../../../mocks/repositories/addon/mock-addon-bundle-repository';
import { MockYachtRepository } from '../../../../../mocks/repositories/booking/mock-yacht-repository';
import { AddonType } from '../../../../../../core/domain/addon/addon-type';

// Test suite for BundleAddonsUseCase
describe('BundleAddonsUseCase', () => {
  // Use our base use case test class to handle common setup
  class BundleAddonsTests extends BaseUseCaseTest<BundleAddonsUseCase> {
    constructor() {
      super((repositoryFactory) => new BundleAddonsUseCase(repositoryFactory));
    }
    
    // Helper to get mock repositories
    getMockAddonRepository(): MockAddonRepository {
      return MockRepositoryFactory.getMockAddonRepository();
    }
    
    getMockAddonBundleRepository(): MockAddonBundleRepository {
      return MockRepositoryFactory.getMockAddonBundleRepository();
    }
    
    getMockYachtRepository(): MockYachtRepository {
      return MockRepositoryFactory.getMockYachtRepository();
    }
  }
  
  let tests: BundleAddonsTests;
  
  beforeEach(() => {
    tests = new BundleAddonsTests();
  });
  
  // Test case: Create a new bundle
  test('should create a new bundle for a yacht', async () => {
    // Arrange
    const producerId = 'producer-123';
    const yachtId = 'yacht-456';
    
    // Create test addons
    const includedAddons = [
      createTestAddon({ id: 'addon-1', partnerId: 'partner-1', type: AddonType.SERVICE }),
      createTestAddon({ id: 'addon-2', partnerId: 'partner-2', type: AddonType.PRODUCT })
    ];
    
    const optionalAddons = [
      createTestAddon({ id: 'addon-3', partnerId: 'partner-1', type: AddonType.SERVICE })
    ];
    
    // Mock yacht repository to return the yacht exists
    tests.setRepositoryMethodBehavior(
      () => tests.getMockYachtRepository(),
      'exists',
      { returnValue: true }
    );
    
    // Mock yacht repository to return producer owns yacht
    tests.setRepositoryMethodBehavior(
      () => tests.getMockYachtRepository(),
      'isOwner',
      { returnValue: true }
    );
    
    // Mock bundle repository to check if bundle exists
    tests.setRepositoryMethodBehavior(
      () => tests.getMockAddonBundleRepository(),
      'exists',
      { returnValue: false }
    );
    
    // Mock addon repository to return addons by ID
    tests.setRepositoryMethodBehavior(
      () => tests.getMockAddonRepository(),
      'findByIds',
      { returnValue: [...includedAddons, ...optionalAddons] }
    );
    
    // Mock bundle repository to create a new bundle
    const newBundleId = 'bundle-789';
    tests.setRepositoryMethodBehavior(
      () => tests.getMockAddonBundleRepository(),
      'create',
      { returnValue: newBundleId }
    );
    
    // Act
    const result = await tests.useCase.execute({
      experienceId: yachtId,
      includedAddOnIds: includedAddons.map(addon => addon.id),
      optionalAddOnIds: optionalAddons.map(addon => addon.id)
    }, { user: { uid: producerId, role: 'producer' }});
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBe(newBundleId);
    
    // Verify repository methods were called
    tests.assertRepositoryMethodCalled(
      () => tests.getMockYachtRepository(),
      'exists'
    );
    
    tests.assertRepositoryMethodCalled(
      () => tests.getMockYachtRepository(),
      'isOwner'
    );
    
    tests.assertRepositoryMethodCalled(
      () => tests.getMockAddonRepository(),
      'findByIds'
    );
    
    tests.assertRepositoryMethodCalled(
      () => tests.getMockAddonBundleRepository(),
      'create'
    );
  });
  
  // Test case: Update an existing bundle
  test('should update an existing bundle', async () => {
    // Arrange
    const producerId = 'producer-123';
    const yachtId = 'yacht-456';
    const existingBundleId = 'bundle-789';
    
    // Create test addons
    const includedAddons = [
      createTestAddon({ id: 'addon-1', partnerId: 'partner-1', type: AddonType.SERVICE })
    ];
    
    const optionalAddons = [
      createTestAddon({ id: 'addon-2', partnerId: 'partner-2', type: AddonType.PRODUCT })
    ];
    
    // Mock yacht repository to return the yacht exists
    tests.setRepositoryMethodBehavior(
      () => tests.getMockYachtRepository(),
      'exists',
      { returnValue: true }
    );
    
    // Mock yacht repository to return producer owns yacht
    tests.setRepositoryMethodBehavior(
      () => tests.getMockYachtRepository(),
      'isOwner',
      { returnValue: true }
    );
    
    // Mock bundle repository to check if bundle exists
    tests.setRepositoryMethodBehavior(
      () => tests.getMockAddonBundleRepository(),
      'exists',
      { returnValue: true }
    );
    
    // Mock getting existing bundle
    const existingBundle = createTestBundle(
      yachtId,
      [createTestAddon({ id: 'old-addon-1' })],
      [],
      { id: existingBundleId }
    );
    
    tests.setRepositoryMethodBehavior(
      () => tests.getMockAddonBundleRepository(),
      'getByYachtId',
      { returnValue: existingBundle }
    );
    
    // Mock addon repository to return addons by ID
    tests.setRepositoryMethodBehavior(
      () => tests.getMockAddonRepository(),
      'findByIds',
      { returnValue: [...includedAddons, ...optionalAddons] }
    );
    
    // Mock bundle repository to update bundle
    tests.setRepositoryMethodBehavior(
      () => tests.getMockAddonBundleRepository(),
      'update',
      { returnValue: true }
    );
    
    // Act
    const result = await tests.useCase.execute({
      experienceId: yachtId,
      includedAddOnIds: includedAddons.map(addon => addon.id),
      optionalAddOnIds: optionalAddons.map(addon => addon.id)
    }, { user: { uid: producerId, role: 'producer' }});
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBe(existingBundleId);
    
    // Verify repository methods were called
    tests.assertRepositoryMethodCalled(
      () => tests.getMockYachtRepository(),
      'exists'
    );
    
    tests.assertRepositoryMethodCalled(
      () => tests.getMockYachtRepository(),
      'isOwner'
    );
    
    tests.assertRepositoryMethodCalled(
      () => tests.getMockAddonRepository(),
      'findByIds'
    );
    
    tests.assertRepositoryMethodCalled(
      () => tests.getMockAddonBundleRepository(),
      'update'
    );
  });
  
  // Test case: Unauthorized user
  test('should reject bundling from unauthorized user', async () => {
    // Arrange
    const nonOwnerId = 'non-owner-user';
    const yachtId = 'yacht-456';
    
    // Mock yacht repository to return the yacht exists
    tests.setRepositoryMethodBehavior(
      () => tests.getMockYachtRepository(),
      'exists',
      { returnValue: true }
    );
    
    // Mock yacht repository to return user is NOT owner
    tests.setRepositoryMethodBehavior(
      () => tests.getMockYachtRepository(),
      'isOwner',
      { returnValue: false }
    );
    
    // Act
    const result = await tests.useCase.execute({
      experienceId: yachtId,
      includedAddOnIds: ['addon-1'],
      optionalAddOnIds: []
    }, { user: { uid: nonOwnerId, role: 'producer' }});
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('not the owner');
    
    // Verify owner check was called but not other repository methods
    tests.assertRepositoryMethodCalled(
      () => tests.getMockYachtRepository(),
      'isOwner'
    );
    
    expect(tests.getMockAddonBundleRepository().wasMethodCalled('create')).toBe(false);
    expect(tests.getMockAddonBundleRepository().wasMethodCalled('update')).toBe(false);
  });
  
  // Test case: Yacht doesn't exist
  test('should reject bundling for non-existent yacht', async () => {
    // Arrange
    const producerId = 'producer-123';
    const nonExistentYachtId = 'non-existent-yacht';
    
    // Mock yacht repository to return the yacht doesn't exist
    tests.setRepositoryMethodBehavior(
      () => tests.getMockYachtRepository(),
      'exists',
      { returnValue: false }
    );
    
    // Act
    const result = await tests.useCase.execute({
      experienceId: nonExistentYachtId,
      includedAddOnIds: ['addon-1'],
      optionalAddOnIds: []
    }, { user: { uid: producerId, role: 'producer' }});
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('does not exist');
    
    // Verify existence check was called but not other repository methods
    tests.assertRepositoryMethodCalled(
      () => tests.getMockYachtRepository(),
      'exists'
    );
    
    expect(tests.getMockYachtRepository().wasMethodCalled('isOwner')).toBe(false);
    expect(tests.getMockAddonBundleRepository().wasMethodCalled('create')).toBe(false);
  });
});