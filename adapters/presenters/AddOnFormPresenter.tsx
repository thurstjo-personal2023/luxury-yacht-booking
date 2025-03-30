import React from 'react';
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { AddOnFormData } from '@/core/domain/addon/addon-types';

interface AddOnFormPresenterProps {
  onSubmit: (data: AddOnFormData) => void;
  formSchema: any;
  media: { type: string; url: string }[];
  removeMedia: (index: number) => void;
  handleMediaSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
            <div className="space-y-2">
              <Input 
                type="text" 
                name="name" 
                placeholder="Service Name"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <select 
                name="category"
                className="w-full p-2 border rounded"
              >
                <option value="">Select Category</option>
                {ADDON_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <textarea
                name="description"
                placeholder="Service Description"
                className="w-full p-2 border rounded"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Input
                type="number"
                name="pricing"
                placeholder="Price"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Media</label>
              <div className="flex gap-2 flex-wrap">
                {media.map((item, index) => (
                  <div key={index} className="relative">
                    {item.type === 'image' && (
                      <img src={item.url} alt="" className="w-24 h-24 object-cover rounded" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="w-24 h-24 border-2 border-dashed rounded flex items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleMediaSelect}
                    accept="image/*,video/*"
                    disabled={isUploading}
                  />
                  <div className="text-center">
                    <span className="block text-sm">Upload</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Create Service
          </Button>
        </form>
      </Form>
    </div>
  );
};