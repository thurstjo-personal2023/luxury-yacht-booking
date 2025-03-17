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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCreateAddon } from "@/hooks/partner/usePartnerQueries";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PartnerSidebar } from "@/components/layout/PartnerSidebar";

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

export default function AddOnForm() {
  const [, navigate] = useLocation();
  const { user, userRole } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const createAddOnMutation = useCreateAddon();

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

  // Form initialization
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      pricing: 0,
      availability: true,
      tags: [],
    },
  });

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

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      // In a real implementation, we would upload the media files to Firebase Storage here
      // For now, we'll use the URLs directly
      
      // Add tags to the form values
      values.tags = tags;
      
      // Transform the data to match what the API expects
      await createAddOnMutation.mutateAsync({
        name: values.name,
        description: values.description,
        category: values.category,
        pricing: values.pricing,
        availability: values.availability,
        tags: values.tags,
        media: media.map(item => ({ type: item.type, url: item.url })),
      });
      
      toast({
        title: "Service Add-on Created",
        description: "Your service has been successfully created.",
      });
      
      // Navigate back to the partner add-ons page
      navigate("/dashboard/partner/add-ons");
    } catch (error) {
      console.error("Error creating add-on:", error);
      toast({
        title: "Error Creating Service",
        description: "There was a problem creating your service. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden md:block w-64 border-r bg-background">
          <PartnerSidebar />
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold">Add New Service</h1>
                  <p className="text-muted-foreground">
                    Create a new service add-on for yacht bookings
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard/partner/add-ons")}
                >
                  Cancel
                </Button>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Service Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Name field */}
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter service name" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              The name of your service as it will appear to customers
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Description field */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe your service..." 
                                {...field} 
                                rows={4}
                              />
                            </FormControl>
                            <FormDescription>
                              Provide a detailed description of what your service offers
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Category field */}
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category *</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ADDON_CATEGORIES.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Choose the category that best matches your service
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Price field */}
                      <FormField
                        control={form.control}
                        name="pricing"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (USD) *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                step="0.01"
                                placeholder="0.00" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Set the price for your service
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Media upload */}
                      <div className="space-y-3">
                        <FormLabel>Media</FormLabel>
                        <div className="grid grid-cols-3 gap-4">
                          {media.map((item, index) => (
                            <div key={index} className="relative rounded-md overflow-hidden border bg-muted h-32">
                              {item.type === "image" && (
                                <img 
                                  src={item.url} 
                                  alt={`Media ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              {item.type === "video" && (
                                <video 
                                  src={item.url} 
                                  className="w-full h-full object-cover"
                                  controls
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => removeMedia(index)}
                                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          
                          {/* Upload button */}
                          <div className="flex items-center justify-center border border-dashed rounded-md bg-muted/50 h-32">
                            <div className="flex flex-col items-center justify-center">
                              {isUploading ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                              ) : (
                                <>
                                  <label
                                    htmlFor="media-upload"
                                    className="flex flex-col items-center justify-center cursor-pointer"
                                  >
                                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                    <span className="text-sm text-muted-foreground">Upload media</span>
                                    <input
                                      id="media-upload"
                                      type="file"
                                      accept="image/*,video/*"
                                      onChange={handleMediaSelect}
                                      className="hidden"
                                    />
                                  </label>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <FormDescription>
                          Add photos or videos of your service (recommended)
                        </FormDescription>
                      </div>
                      
                      {/* Availability field */}
                      <FormField
                        control={form.control}
                        name="availability"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Availability</FormLabel>
                              <FormDescription>
                                Make this service available for bookings
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {/* Tags input */}
                      <div className="space-y-3">
                        <FormLabel>Tags</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="gap-1">
                              {tag}
                              <button type="button" onClick={() => removeTag(tag)}>
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input 
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            placeholder="Add tag"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addTag();
                              }
                            }}
                          />
                          <Button type="button" size="sm" onClick={addTag}>
                            <Plus className="h-4 w-4 mr-1" /> Add
                          </Button>
                        </div>
                        <FormDescription>
                          Add relevant tags to help customers find your service
                        </FormDescription>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      {/* Submit button */}
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate("/dashboard/partner/add-ons")}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createAddOnMutation.isPending}
                        >
                          {createAddOnMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Create Service
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}