
import { AddOnService } from '@/core/application/services/AddOnService';
import { AddOn } from '@/core/domain/addon/addon-types';
import { AddOnFormData } from '@/core/domain/interfaces/IAddOnForm';

export class AddOnController {
  constructor(private readonly addOnService: AddOnService) {}

  async createAddOn(formData: AddOnFormData, partnerId: string): Promise<string> {
    try {
      const validationResult = await this.addOnService.validateAddOn({
        ...formData,
        partnerId
      } as AddOn);

      if (!validationResult.isValid) {
        throw new Error(validationResult.errors.join(', '));
      }

      return await this.addOnService.createAddOn({
        ...formData,
        partnerId
      } as AddOn);
    } catch (error) {
      throw new Error(`Failed to create add-on: ${error.message}`);
    }
  }
}
