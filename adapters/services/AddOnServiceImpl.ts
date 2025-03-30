
import { IAddOnService, AddOnFormData } from '@/core/application/interfaces/IAddOnService';
import { storage } from '@/server/storage';

export class AddOnServiceImpl implements IAddOnService {
  async createAddOn(data: AddOnFormData, partnerId: string): Promise<string> {
    try {
      const addOnData = {
        ...data,
        partnerId,
        createdDate: new Date(),
        lastUpdatedDate: new Date()
      };
      
      const response = await fetch('/api/partner/addons/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addOnData)
      });

      if (!response.ok) {
        throw new Error('Failed to create add-on');
      }

      const result = await response.json();
      return result.id;
    } catch (error) {
      throw new Error(`Error creating add-on: ${error.message}`);
    }
  }

  async validateAddOnData(data: AddOnFormData): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!data.name || data.name.length < 3) {
      errors.push('Name must be at least 3 characters long');
    }
    
    if (!data.description || data.description.length < 10) {
      errors.push('Description must be at least 10 characters long');
    }
    
    if (!data.category) {
      errors.push('Category is required');
    }
    
    if (data.pricing < 0) {
      errors.push('Price cannot be negative');
    }
    
    if (!data.media || data.media.length === 0) {
      errors.push('At least one media item is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async uploadMedia(file: File): Promise<{ type: string; url: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload media');
      }

      const result = await response.json();
      return {
        type: file.type.startsWith('image/') ? 'image' : 'video',
        url: result.url
      };
    } catch (error) {
      throw new Error(`Error uploading media: ${error.message}`);
    }
  }
}
