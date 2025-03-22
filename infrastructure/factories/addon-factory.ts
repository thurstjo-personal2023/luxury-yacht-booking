/**
 * Add-on Factory
 * 
 * This factory creates instances of add-on controllers, use cases, repositories, and services.
 */

import { Firestore } from 'firebase-admin/firestore';
import { AddonController } from '../api/controllers/addon-controller';
import { AddonBundleController } from '../api/controllers/addon-bundle-controller';
import { FirestoreAddonRepository } from '../../adapters/repositories/firestore/firestore-addon-repository';
import { FirestoreAddonBundleRepository } from '../../adapters/repositories/firestore/firestore-addon-bundle-repository';
import { AddonServiceImpl } from '../../adapters/services/addon-service-impl';
import { AddonBundlingServiceImpl } from '../../adapters/services/addon-bundling-service-impl';
import { CreateAddonUseCase } from '../../core/application/use-cases/addon/create-addon-use-case';
import { GetAddonUseCase } from '../../core/application/use-cases/addon/get-addon-use-case';
import { UpdateAddonUseCase } from '../../core/application/use-cases/addon/update-addon-use-case';
import { DeleteAddonUseCase } from '../../core/application/use-cases/addon/delete-addon-use-case';
import { ListAddonsUseCase } from '../../core/application/use-cases/addon/list-addons-use-case';
import { CreateAddonBundleUseCase } from '../../core/application/use-cases/addon/create-addon-bundle-use-case';
import { GetAddonBundleUseCase } from '../../core/application/use-cases/addon/get-addon-bundle-use-case';
import { BundleAddonsUseCase } from '../../core/application/use-cases/addon/bundle-addons-use-case';

/**
 * Factory for creating add-on related objects
 */
export class AddonFactory {
  /**
   * Create add-on controller instances
   * @param firestore Firestore instance
   * @returns Add-on controller and bundle controller
   */
  static createControllers(firestore: Firestore): { addonController: AddonController; bundleController: AddonBundleController } {
    // Create repositories
    const addonRepository = new FirestoreAddonRepository(firestore);
    const bundleRepository = new FirestoreAddonBundleRepository(firestore);
    
    // Create services
    const addonService = new AddonServiceImpl();
    const bundlingService = new AddonBundlingServiceImpl(addonRepository);
    
    // Create use cases
    const createAddonUseCase = new CreateAddonUseCase(addonRepository, addonService);
    const getAddonUseCase = new GetAddonUseCase(addonRepository);
    const updateAddonUseCase = new UpdateAddonUseCase(addonRepository, addonService);
    const deleteAddonUseCase = new DeleteAddonUseCase(addonRepository, bundleRepository);
    const listAddonsUseCase = new ListAddonsUseCase(addonRepository);
    
    const createAddonBundleUseCase = new CreateAddonBundleUseCase(bundleRepository, bundlingService);
    const getAddonBundleUseCase = new GetAddonBundleUseCase(bundleRepository);
    const bundleAddonsUseCase = new BundleAddonsUseCase(addonRepository, bundleRepository, bundlingService);
    
    // Create controllers
    const addonController = new AddonController(
      createAddonUseCase,
      getAddonUseCase,
      updateAddonUseCase,
      deleteAddonUseCase,
      listAddonsUseCase
    );
    
    const bundleController = new AddonBundleController(
      createAddonBundleUseCase,
      getAddonBundleUseCase,
      bundleAddonsUseCase
    );
    
    return { addonController, bundleController };
  }
}