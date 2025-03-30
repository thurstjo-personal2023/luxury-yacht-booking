
export interface IAddOnFormValidator {
  validateAddOnData(data: AddOnFormData): Promise<ValidationResult>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface AddOnFormData {
  name: string;
  description: string;
  category: string;
  pricing: number;
  media: { type: string; url: string }[];
}
