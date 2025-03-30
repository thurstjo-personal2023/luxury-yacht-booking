
export interface AddOn {
  id: string;
  name: string;
  description: string;
  category: string;
  pricing: number;
  media: Media[];
  partnerId: string;
}

export interface Media {
  type: string;
  url: string;
}

export interface AddOnValidationResult {
  isValid: boolean;
  errors: string[];
}
