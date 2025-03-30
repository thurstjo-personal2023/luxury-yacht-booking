
import React from 'react';
import { IAddOnFormValidator } from '../../domain/interfaces/IAddOnFormValidator';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export class AddOnFormPresenter {
  private validator: IAddOnFormValidator;

  constructor(validator: IAddOnFormValidator) {
    this.validator = validator;
  }

  async validateForm(formData: any) {
    const result = this.validator.validate(formData);
    if (!result.isValid) {
      throw new Error(Object.values(result.errors).join(', '));
    }
    return formData;
  }

  async validateMedia(mediaItems: Array<{type: string, url: string}>) {
    const result = this.validator.validateMediaItems(mediaItems);
    if (!result.isValid) {
      throw new Error(Object.values(result.errors).join(', '));
    }
    return mediaItems;
  }
}
