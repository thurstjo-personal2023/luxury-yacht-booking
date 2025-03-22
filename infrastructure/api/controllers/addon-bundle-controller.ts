/**
 * Add-on Bundle Controller
 * 
 * This controller handles HTTP requests for add-on bundling with yacht experiences.
 */

import { Request, Response } from 'express';
import { CreateAddonBundleUseCase } from '../../../core/application/use-cases/addon/create-addon-bundle-use-case';
import { GetAddonBundleUseCase } from '../../../core/application/use-cases/addon/get-addon-bundle-use-case';
import { BundleAddonsUseCase } from '../../../core/application/use-cases/addon/bundle-addons-use-case';

/**
 * Controller for add-on bundling operations
 */
export class AddonBundleController {
  constructor(
    private readonly createAddonBundleUseCase: CreateAddonBundleUseCase,
    private readonly getAddonBundleUseCase: GetAddonBundleUseCase,
    private readonly bundleAddonsUseCase: BundleAddonsUseCase
  ) {}
  
  /**
   * Create a new add-on bundle for a yacht experience
   * @param req Express request
   * @param res Express response
   */
  async createBundle(req: Request, res: Response): Promise<void> {
    try {
      // Extract user ID from authenticated request
      const userId = req.user?.uid;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      // Extract data from request body
      const { yachtId, includedAddons = [], optionalAddons = [] } = req.body;
      
      // Execute the use case
      const result = await this.createAddonBundleUseCase.execute({
        yachtId,
        includedAddons,
        optionalAddons
      });
      
      // Return response based on result
      if (result.success) {
        res.status(201).json({
          success: true,
          bundle: result.bundle?.toObject()
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          errors: result.errors
        });
      }
    } catch (error) {
      console.error('Error creating add-on bundle:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred'
      });
    }
  }
  
  /**
   * Get a bundle by ID or yacht ID
   * @param req Express request
   * @param res Express response
   */
  async getBundle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { yachtId } = req.query;
      
      let result;
      
      // If yachtId is provided, use it to get the bundle
      if (yachtId) {
        result = await this.getAddonBundleUseCase.executeByYachtId(yachtId as string);
      } else {
        // Otherwise, use the bundle ID
        result = await this.getAddonBundleUseCase.executeById(id);
      }
      
      // Return response based on result
      if (result.success) {
        res.status(200).json({
          success: true,
          bundle: result.bundle?.toObject()
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error getting add-on bundle:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred'
      });
    }
  }
  
  /**
   * Get all bundles that include a specific add-on
   * @param req Express request
   * @param res Express response
   */
  async getBundlesByAddonId(req: Request, res: Response): Promise<void> {
    try {
      const { addonId } = req.params;
      
      // Execute the use case
      const result = await this.getAddonBundleUseCase.executeByAddonId(addonId);
      
      // Return response based on result
      if (result.success) {
        res.status(200).json({
          success: true,
          bundles: result.bundles?.map(bundle => bundle.toObject())
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error getting bundles by add-on ID:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred'
      });
    }
  }
  
  /**
   * Update the add-ons in a yacht experience
   * @param req Express request
   * @param res Express response
   */
  async updateBundle(req: Request, res: Response): Promise<void> {
    try {
      // Extract user ID from authenticated request
      const userId = req.user?.uid;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      // Extract data from request body
      const { yachtId, includedAddOns = [], optionalAddOns = [] } = req.body;
      
      // Format the add-on data for the use case
      const formattedIncludedAddOns = includedAddOns.map((addon: any) => ({
        addonId: addon.addOnId || addon.addonId,
        partnerId: addon.partnerId,
        pricing: addon.pricing,
        maxQuantity: addon.maxQuantity
      }));
      
      const formattedOptionalAddOns = optionalAddOns.map((addon: any) => ({
        addonId: addon.addOnId || addon.addonId,
        partnerId: addon.partnerId,
        pricing: addon.pricing,
        maxQuantity: addon.maxQuantity
      }));
      
      // Execute the use case
      const result = await this.bundleAddonsUseCase.execute({
        yachtId,
        includedAddOns: formattedIncludedAddOns,
        optionalAddOns: formattedOptionalAddOns
      });
      
      // Return response based on result
      if (result.success) {
        res.status(200).json({
          success: true,
          bundle: result.bundle?.toObject(),
          // Also return the formatted add-on references for Firestore
          includedAddOns: result.includedAddOnsReferences,
          optionalAddOns: result.optionalAddOnsReferences
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          errors: result.errors
        });
      }
    } catch (error) {
      console.error('Error updating add-on bundle:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred'
      });
    }
  }
}