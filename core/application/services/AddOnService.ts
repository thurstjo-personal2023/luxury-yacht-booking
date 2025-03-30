
import { AddOn, AddOnValidationResult } from '../../domain/addon/addon-types';
import { IAddOnService } from '../../domain/interfaces/IAddOnService';

export class AddOnService implements IAddOnService {
  private repository: IAddOnRepository;
  private mediaService: IMediaService;

  constructor(repository: IAddOnRepository, mediaService: IMediaService) {
    this.repository = repository;
    this.mediaService = mediaService;
  }

  async createAddOn(data: AddOn): Promise<string> {
    const validationResult = await this.validateAddOn(data);
    if (!validationResult.isValid) {
      throw new Error(validationResult.errors.join(', '));
    }
    return this.repository.create(data);
  }

  async validateAddOn(data: AddOn): Promise<AddOnValidationResult> {
    const errors: string[] = [];
    
    if (!data.name || data.name.length < 3) {
      errors.push('Name must be at least 3 characters');
    }
    
    if (!data.description || data.description.length < 10) {
      errors.push('Description must be at least 10 characters');
    }
    
    if (!data.media || data.media.length === 0) {
      errors.push('At least one media item is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
