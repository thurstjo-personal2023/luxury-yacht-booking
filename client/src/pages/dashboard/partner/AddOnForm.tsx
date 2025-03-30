import { FC, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useAuthService } from "@/services/auth";
import { useCreateAddon } from "@/hooks/partner/usePartnerQueries";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PartnerSidebar } from "@/components/layout/PartnerSidebar";
import { AddOnFormPresenter } from '@/adapters/presenters/AddOnFormPresenter';
import { IAddOnService } from '@/core/application/interfaces/IAddOnService';
import { AddOnServiceFactory } from '@/core/application/factories/AddOnServiceFactory';
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, Upload, X, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


// Categories for service add-ons
const ADDON_CATEGORIES = [
  "Water Sports",
  "Catering",
  "Entertainment",
  "Transportation",
  "Photography",
  "Decoration",
  "Equipment",
  "Other",
];

// Media type options
const MEDIA_TYPES = ["image", "video"];

// Form schema using Zod for validation
const formSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  category: z.string().refine((val) => ADDON_CATEGORIES.includes(val), {
    message: "Please select a valid category",
  }),
  pricing: z.coerce
    .number()
    .positive({ message: "Price must be a positive number" })
    .min(1, { message: "Price must be at least 1" }),
  availability: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

// TypeScript type for the form values
type FormValues = z.infer<typeof formSchema>;

// Media type to store image/video URLs
interface MediaItem {
  type: "image" | "video";
  url: string;
  file?: File; // For local file reference
}

interface AddOnFormData extends FormValues {
  media: {type: string, url: string}[];
}


const AddOnForm: FC = () => {
  const { user, userRole } = useAuthService();
  const addOnService = AddOnServiceFactory.create();
  const createAddon = useCreateAddon();
  const [, navigate] = useLocation();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Role verification - redirect if not a partner
  useEffect(() => {
    if (user && userRole !== "partner") {
      toast({
        title: "Access Restricted",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [user, userRole, navigate]);

  // Handle image selection
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileType = file.type.startsWith("image/") ? "image" : "video";

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image or video file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    // Create a URL for preview
    const url = URL.createObjectURL(file);

    // In a real implementation, we would upload the file to Firebase Storage here
    // For now, we'll simulate an upload delay
    setTimeout(() => {
      setMedia([...media, { type: fileType, url, file }]);
      setIsUploading(false);
    }, 1000);
  };

  // Remove media item
  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  // Add a tag
  const addTag = () => {
    if (!tagInput.trim()) return;
    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    setTagInput("");
  };

  // Remove a tag
  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = useCallback(async (formData: AddOnFormData) => {
    try {
      const result = await addOnService.createAddOn({
        ...formData,
        producerId: user?.uid,
      });

      if (result.success) {
        toast({
          title: "Add-on created",
          description: "Your add-on has been created successfully"
        });
        navigate("/dashboard/partner/add-ons");
      } else {
        throw new Error("Failed to create add-on")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create add-on",
        variant: "destructive"
      });
    }
  }, [user, addOnService, navigate]);

  return (
    <DashboardLayout sidebar={<PartnerSidebar />}>
      <AddOnFormPresenter 
        onSubmit={handleSubmit}
        media={media}
        setMedia={setMedia}
        removeMedia={removeMedia}
        handleMediaSelect={handleMediaSelect}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
        tags={tags}
        setTags={setTags}
        addTag={addTag}
        removeTag={removeTag}
        tagInput={tagInput}
        setTagInput={setTagInput}
        ADDON_CATEGORIES={ADDON_CATEGORIES}
        formSchema={formSchema}
      />
    </DashboardLayout>
  );
};

export default AddOnForm;