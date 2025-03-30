
export interface AddOnFormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface IAddOnFormValidator {
  validate(formData: any): AddOnFormValidationResult;
  validateMediaItems(media: Array<{type: string, url: string}>): AddOnFormValidationResult;
}
