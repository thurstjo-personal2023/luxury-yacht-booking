import React from 'react';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AddOnFormData } from '@/core/domain/interfaces/IAddOnForm';

interface AddOnFormPresenterProps {
  onSubmit: (data: AddOnFormData) => Promise<void>;
  formSchema: any;
  media: { type: string; url: string }[];
  removeMedia: (index: number) => void;
  handleMediaSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isUploading: boolean;
  ADDON_CATEGORIES: string[];
}

export const AddOnFormPresenter: React.FC<AddOnFormPresenterProps> = ({
  onSubmit,
  formSchema,
  media,
  removeMedia,
  handleMediaSelect,
  isUploading,
  ADDON_CATEGORIES
}) => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Service</h1>
      <Form {...formSchema}>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-4">
            <Input type="text" name="name" placeholder="Service Name" />
            <select name="category" className="w-full p-2 border rounded">
              <option value="">Select Category</option>
              {ADDON_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <textarea 
              name="description" 
              placeholder="Description"
              className="w-full p-2 border rounded"
            />
            <Input type="number" name="pricing" placeholder="Price" min="0" />
            <div className="media-upload">
              <Input
                type="file"
                onChange={handleMediaSelect}
                accept="image/*"
                disabled={isUploading}
              />
              {media.map((item, index) => (
                <div key={index} className="media-preview">
                  <img src={item.url} alt={`Media ${index}`} />
                  <button onClick={() => removeMedia(index)}>Remove</button>
                </div>
              ))}
            </div>
            <button 
              type="submit" 
              className="bg-blue-500 text-white px-4 py-2 rounded"
              disabled={isUploading}
            >
              Create Service
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
};