
export interface AddOnFormData {
  name: string;
  description: string;
  category: string;
  pricing: number;
  media: { type: string; url: string }[];
  tags: string[];
  availability: boolean;
}

export interface IAddOnService {
  createAddOn(data: AddOnFormData, partnerId: string): Promise<string>;
  validateAddOnData(data: AddOnFormData): Promise<{ isValid: boolean; errors: string[] }>;
  uploadMedia(file: File): Promise<{ type: string; url: string }>;
}
