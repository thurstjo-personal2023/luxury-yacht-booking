/**
 * Add-on Controller
 * 
 * This controller handles HTTP requests for add-on management.
 */

import { Request, Response } from 'express';
import { CreateAddonUseCase } from '../../../core/application/use-cases/addon/create-addon-use-case';
import { GetAddonUseCase } from '../../../core/application/use-cases/addon/get-addon-use-case';
import { UpdateAddonUseCase } from '../../../core/application/use-cases/addon/update-addon-use-case';
import { DeleteAddonUseCase } from '../../../core/application/use-cases/addon/delete-addon-use-case';
import { ListAddonsUseCase } from '../../../core/application/use-cases/addon/list-addons-use-case';
import { AddonType } from '../../../core/domain/addon/addon-type';

/**
 * Controller for add-on management
 */
export class AddonController {
  constructor(
    private readonly createAddonUseCase: CreateAddonUseCase,
    private readonly getAddonUseCase: GetAddonUseCase,
    private readonly updateAddonUseCase: UpdateAddonUseCase,
    private readonly deleteAddonUseCase: DeleteAddonUseCase,
    private readonly listAddonsUseCase: ListAddonsUseCase
  ) {}
  
  /**
   * Create a new add-on
   * @param req Express request
   * @param res Express response
   */
  async createAddon(req: Request, res: Response): Promise<void> {
    try {
      // Extract user ID from authenticated request
      const userId = req.user?.uid;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      // Extract data from request body
      const {
        name,
        description,
        type = 'service',
        category,
        pricing,
        commissionRate = 0,
        maxQuantity,
        media = [],
        tags = []
      } = req.body;
      
      // Execute the use case
      const result = await this.createAddonUseCase.execute({
        name,
        description,
        type: type as AddonType,
        category,
        pricing: {
          basePrice: pricing,
          commissionRate,
          maxQuantity
        },
        media,
        partnerId: userId,
        tags
      });
      
      // Return response based on result
      if (result.success) {
        res.status(201).json({
          success: true,
          addon: result.addon?.toObject()
        });
      } else {
        res.status(400).json({
          success: false,
          errors: result.errors
        });
      }
    } catch (error) {
      console.error('Error creating add-on:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred'
      });
    }
  }
  
  /**
   * Get an add-on by ID
   * @param req Express request
   * @param res Express response
   */
  async getAddon(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Execute the use case
      const result = await this.getAddonUseCase.executeById(id);
      
      // Return response based on result
      if (result.success) {
        res.status(200).json({
          success: true,
          addon: result.addon?.toObject()
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error getting add-on:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred'
      });
    }
  }
  
  /**
   * Update an existing add-on
   * @param req Express request
   * @param res Express response
   */
  async updateAddon(req: Request, res: Response): Promise<void> {
    try {
      // Extract user ID from authenticated request
      const userId = req.user?.uid;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { id } = req.params;
      
      // Get the current add-on
      const getResult = await this.getAddonUseCase.executeById(id);
      if (!getResult.success) {
        res.status(404).json({
          success: false,
          error: getResult.error
        });
        return;
      }
      
      // Check if the user is authorized to update this add-on
      const addon = getResult.addon!;
      if (addon.toObject().partnerId !== userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to update this add-on'
        });
        return;
      }
      
      // Extract data from request body
      const {
        name,
        description,
        category,
        pricing,
        commissionRate,
        maxQuantity,
        media,
        isAvailable,
        tags
      } = req.body;
      
      // Prepare the update data
      const updateData: any = { id };
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      
      if (pricing !== undefined || commissionRate !== undefined || maxQuantity !== undefined) {
        updateData.pricing = {};
        if (pricing !== undefined) updateData.pricing.basePrice = pricing;
        if (commissionRate !== undefined) updateData.pricing.commissionRate = commissionRate;
        if (maxQuantity !== undefined) updateData.pricing.maxQuantity = maxQuantity;
      }
      
      if (media !== undefined) updateData.media = media;
      if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
      if (tags !== undefined) updateData.tags = tags;
      
      // Execute the use case
      const result = await this.updateAddonUseCase.execute(updateData);
      
      // Return response based on result
      if (result.success) {
        res.status(200).json({
          success: true,
          addon: result.addon?.toObject()
        });
      } else {
        res.status(400).json({
          success: false,
          errors: result.errors
        });
      }
    } catch (error) {
      console.error('Error updating add-on:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred'
      });
    }
  }
  
  /**
   * Delete an add-on
   * @param req Express request
   * @param res Express response
   */
  async deleteAddon(req: Request, res: Response): Promise<void> {
    try {
      // Extract user ID from authenticated request
      const userId = req.user?.uid;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const { id } = req.params;
      
      // Get the current add-on
      const getResult = await this.getAddonUseCase.executeById(id);
      if (!getResult.success) {
        res.status(404).json({
          success: false,
          error: getResult.error
        });
        return;
      }
      
      // Check if the user is authorized to delete this add-on
      const addon = getResult.addon!;
      if (addon.toObject().partnerId !== userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this add-on'
        });
        return;
      }
      
      // Execute the use case
      const result = await this.deleteAddonUseCase.execute(id);
      
      // Return response based on result
      if (result.success) {
        res.status(200).json({
          success: true
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error deleting add-on:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred'
      });
    }
  }
  
  /**
   * List add-ons with optional filtering
   * @param req Express request
   * @param res Express response
   */
  async listAddons(req: Request, res: Response): Promise<void> {
    try {
      // Extract query parameters
      const {
        type,
        category,
        partnerId,
        isAvailable,
        tags,
        searchTerm,
        minPrice,
        maxPrice,
        sortBy,
        sortDirection,
        page = '1',
        pageSize = '20'
      } = req.query;
      
      // Parse numeric parameters
      const parsedPage = parseInt(page as string, 10);
      const parsedPageSize = parseInt(pageSize as string, 10);
      const parsedMinPrice = minPrice ? parseFloat(minPrice as string) : undefined;
      const parsedMaxPrice = maxPrice ? parseFloat(maxPrice as string) : undefined;
      
      // Parse boolean parameters
      const parsedIsAvailable = isAvailable === 'true' ? true :
                              isAvailable === 'false' ? false : undefined;
      
      // Parse tags array
      const parsedTags = tags ? (Array.isArray(tags) ? tags : [tags]) as string[] : undefined;
      
      // Execute the use case
      const result = await this.listAddonsUseCase.execute({
        type: type as AddonType | undefined,
        category: category as string | undefined,
        partnerId: partnerId as string | undefined,
        isAvailable: parsedIsAvailable,
        tags: parsedTags,
        searchTerm: searchTerm as string | undefined,
        minPrice: parsedMinPrice,
        maxPrice: parsedMaxPrice,
        sortBy: sortBy as 'name' | 'price' | 'createdAt' | 'updatedAt' | undefined,
        sortDirection: sortDirection as 'asc' | 'desc' | undefined,
        page: parsedPage,
        pageSize: parsedPageSize
      });
      
      // Return response based on result
      if (result.success) {
        res.status(200).json({
          success: true,
          addons: result.addons?.map(addon => addon.toObject()),
          pagination: {
            totalCount: result.totalCount,
            totalPages: result.totalPages,
            currentPage: result.currentPage
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error listing add-ons:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred'
      });
    }
  }
  
  /**
   * List add-ons for a specific partner
   * @param req Express request
   * @param res Express response
   */
  async listPartnerAddons(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId } = req.params;
      
      // Extract query parameters
      const {
        category,
        isAvailable,
        tags,
        searchTerm,
        minPrice,
        maxPrice,
        sortBy,
        sortDirection,
        page = '1',
        pageSize = '20'
      } = req.query;
      
      // Parse numeric parameters
      const parsedPage = parseInt(page as string, 10);
      const parsedPageSize = parseInt(pageSize as string, 10);
      const parsedMinPrice = minPrice ? parseFloat(minPrice as string) : undefined;
      const parsedMaxPrice = maxPrice ? parseFloat(maxPrice as string) : undefined;
      
      // Parse boolean parameters
      const parsedIsAvailable = isAvailable === 'true' ? true :
                              isAvailable === 'false' ? false : undefined;
      
      // Parse tags array
      const parsedTags = tags ? (Array.isArray(tags) ? tags : [tags]) as string[] : undefined;
      
      // Execute the use case
      const result = await this.listAddonsUseCase.executeByPartnerId(partnerId, {
        category: category as string | undefined,
        isAvailable: parsedIsAvailable,
        tags: parsedTags,
        searchTerm: searchTerm as string | undefined,
        minPrice: parsedMinPrice,
        maxPrice: parsedMaxPrice,
        sortBy: sortBy as 'name' | 'price' | 'createdAt' | 'updatedAt' | undefined,
        sortDirection: sortDirection as 'asc' | 'desc' | undefined,
        page: parsedPage,
        pageSize: parsedPageSize
      });
      
      // Return response based on result
      if (result.success) {
        res.status(200).json({
          success: true,
          addons: result.addons?.map(addon => addon.toObject()),
          pagination: {
            totalCount: result.totalCount,
            totalPages: result.totalPages,
            currentPage: result.currentPage
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error listing partner add-ons:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred'
      });
    }
  }
  
  /**
   * List my add-ons (for the authenticated partner)
   * @param req Express request
   * @param res Express response
   */
  async listMyAddons(req: Request, res: Response): Promise<void> {
    try {
      // Extract user ID from authenticated request
      const userId = req.user?.uid;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      // Use the current user's ID as the partner ID
      req.params.partnerId = userId;
      
      // Delegate to the listPartnerAddons method
      await this.listPartnerAddons(req, res);
    } catch (error) {
      console.error('Error listing my add-ons:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred'
      });
    }
  }
}