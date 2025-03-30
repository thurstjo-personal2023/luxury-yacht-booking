
import React from 'react';
import { AddOnFormData } from '@/core/application/interfaces/IAddOnService';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface AddOnFormPresenterProps {
  onSubmit: (data: AddOnFormData) => void;
  media: { type: string; url: string }[];
  setMedia: (media: { type: string; url: string }[]) => void;
  removeMedia: (index: number) => void;
  handleMediaSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  setIsUploading: (value: boolean) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  addTag: (tag: string) => void;
  removeTag: (index: number) => void;
  tagInput: string;
  setTagInput: (value: string) => void;
  ADDON_CATEGORIES: string[];
  formSchema: any;
}

export const AddOnFormPresenter: React.FC<AddOnFormPresenterProps> = ({
  onSubmit,
  media,
  removeMedia,
  handleMediaSelect,
  isUploading,
  tags,
  addTag,
  removeTag,
  tagInput,
  setTagInput,
  ADDON_CATEGORIES,
  formSchema
}) => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Service</h1>
      <Form {...formSchema}>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Form fields implementation */}
          <div className="grid gap-4">
            {/* Media upload section */}
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
                    accept="image/*,video/*"
                    onChange={handleMediaSelect}
                    className="hidden"
                  />
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </label>
              </div>
            </div>

            {/* Tags section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex gap-2 flex-wrap">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="ml-2"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (tagInput.trim()) {
                        addTag(tagInput.trim());
                        setTagInput('');
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (tagInput.trim()) {
                      addTag(tagInput.trim());
                      setTagInput('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Create Service Add-on
          </Button>
        </form>
      </Form>
    </div>
  );
};
