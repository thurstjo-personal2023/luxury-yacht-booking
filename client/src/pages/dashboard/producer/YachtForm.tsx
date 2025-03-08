import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import { 
  AlertCircle,
  ArrowLeft, 
  Camera, 
  Info, 
  Loader2, 
  NavigationIcon, 
  Plus, 
  Trash2, 
  UploadCloud, 
  X 
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth, db, storage } from "@/lib/firebase";
import { 
  doc, 
  collection, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject
} from "firebase/storage";
import { YachtExperience, Media, Location } from "@shared/firestore-schema";

// Form validation schema
const yachtFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  category: z.string().min(1, { message: "Please select a category" }),
  yacht_type: z.string().min(1, { message: "Please enter the yacht type" }),
  duration: z.coerce.number().min(1, { message: "Duration must be at least 1 hour" }),
  capacity: z.coerce.number().min(1, { message: "Capacity must be at least 1 person" }),
  pricing: z.coerce.number().min(1, { message: "Price must be greater than 0" }),
  pricing_model: z.enum(["Fixed", "Variable"]).default("Fixed"),
  tags: z.array(z.string()).min(1, { message: "Please add at least one tag" }),
  availability_status: z.boolean().default(true),
  featured: z.boolean().default(false),
  published_status: z.boolean().default(true),
  virtual_tour_enabled: z.boolean().default(false),
});

type YachtFormValues = z.infer<typeof yachtFormSchema>;

// YachtForm component for adding/editing yachts
export default function YachtForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic");
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [yachtData, setYachtData] = useState<YachtExperience | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [customizationOptionInput, setCustomizationOptionInput] = useState({
    name: "",
    price: "",
    product_id: ""
  });
  const [customizationOptions, setCustomizationOptions] = useState<{
    name: string;
    price: number;
    product_id: string;
  }[]>([]);
  const [location, setLocation_] = useState<Location | null>(null);
  
  // Initialize form with default values
  const form = useForm<YachtFormValues>({
    resolver: zodResolver(yachtFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      yacht_type: "",
      duration: 4, // Default 4 hours
      capacity: 10, // Default 10 people
      pricing: 0,
      pricing_model: "Fixed",
      tags: [],
      availability_status: true,
      featured: false,
      published_status: true,
      virtual_tour_enabled: false,
    },
  });
  
  // Yacht categories
  const categoryOptions = [
    "Luxury Charter",
    "Sailing Experience",
    "Fishing Trip",
    "Water Sports",
    "Corporate Event",
    "Special Occasion",
    "Sunset Cruise",
    "Overnight Stay",
    "Island Hopping",
    "Diving Adventure"
  ];
  
  // Initialize edit mode if yacht ID is provided
  useEffect(() => {
    if (params.id) {
      setEditMode(true);
      fetchYachtDetails(params.id);
    }
  }, [params.id]);
  
  // Fetch yacht details for editing
  const fetchYachtDetails = async (yachtId: string) => {
    setInitialLoading(true);
    try {
      const yachtRef = doc(db, "yacht_experiences", yachtId);
      const yachtDoc = await getDoc(yachtRef);
      
      if (yachtDoc.exists()) {
        const data = yachtDoc.data() as YachtExperience;
        setYachtData(data);
        setMedia(data.media || []);
        setCustomizationOptions(data.customization_options || []);
        setLocation_(data.location);
        
        // Set form values
        form.reset({
          title: data.title,
          description: data.description,
          category: data.category,
          yacht_type: data.yacht_type || "",
          duration: data.duration,
          capacity: data.capacity,
          pricing: data.pricing,
          pricing_model: data.pricing_model,
          tags: data.tags || [],
          availability_status: data.availability_status,
          featured: data.featured,
          published_status: data.published_status,
          virtual_tour_enabled: data.virtual_tour?.enabled || false,
        });
      } else {
        toast({
          title: "Yacht Not Found",
          description: "The yacht you're trying to edit could not be found.",
          variant: "destructive",
        });
        navigateBack();
      }
    } catch (error) {
      console.error("Error fetching yacht details:", error);
      toast({
        title: "Error",
        description: "Failed to load yacht details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setInitialLoading(false);
    }
  };
  
  // Handle media file upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !auth.currentUser) return;
    
    setUploadingMedia(true);
    const newMedia: Media[] = [...media];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/');
        
        // Create a unique file path
        const storagePath = `yacht_media/${auth.currentUser.uid}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        
        // Upload the file
        await uploadBytes(storageRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        // Add to media array
        newMedia.push({
          type: isVideo ? 'video' : 'image',
          url: downloadURL
        });
      }
      
      setMedia(newMedia);
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${files.length} file(s)`,
      });
    } catch (error) {
      console.error("Error uploading media:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload media. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingMedia(false);
      // Reset the input
      e.target.value = '';
    }
  };
  
  // Handle media deletion
  const handleDeleteMedia = (index: number) => {
    const newMedia = [...media];
    // Note: We're not actually deleting from storage here, that would be another step
    newMedia.splice(index, 1);
    setMedia(newMedia);
  };
  
  // Handle location selection
  const handleLocationSelect = (place: {
    address: string;
    latitude: number;
    longitude: number;
    port_marina?: string;
  }) => {
    setLocation_({
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      region: determineRegion(place.address),
      port_marina: place.port_marina || ""
    });
  };
  
  // Determine region based on address
  const determineRegion = (address: string): "dubai" | "abu-dhabi" => {
    const lowerCaseAddress = address.toLowerCase();
    return lowerCaseAddress.includes("dubai") ? "dubai" : "abu-dhabi";
  };
  
  // Handle adding a tag
  const handleAddTag = () => {
    if (tagInput.trim() && !form.getValues().tags.includes(tagInput.trim())) {
      const currentTags = form.getValues().tags;
      form.setValue('tags', [...currentTags, tagInput.trim()]);
      setTagInput("");
    }
  };
  
  // Handle removing a tag
  const handleRemoveTag = (tag: string) => {
    const currentTags = form.getValues().tags;
    form.setValue('tags', currentTags.filter(t => t !== tag));
  };
  
  // Handle adding a customization option
  const handleAddCustomizationOption = () => {
    if (
      customizationOptionInput.name.trim() && 
      customizationOptionInput.price.trim() && 
      !isNaN(parseFloat(customizationOptionInput.price))
    ) {
      setCustomizationOptions([
        ...customizationOptions,
        {
          name: customizationOptionInput.name.trim(),
          price: parseFloat(customizationOptionInput.price),
          product_id: customizationOptionInput.product_id.trim() || `option-${Date.now()}`
        }
      ]);
      setCustomizationOptionInput({ name: "", price: "", product_id: "" });
    }
  };
  
  // Handle removing a customization option
  const handleRemoveCustomizationOption = (index: number) => {
    const newOptions = [...customizationOptions];
    newOptions.splice(index, 1);
    setCustomizationOptions(newOptions);
  };
  
  // Form submission handler
  const onSubmit = async (values: YachtFormValues) => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save a yacht.",
        variant: "destructive",
      });
      return;
    }
    
    // Switch to media tab if no media uploaded
    if (media.length === 0 && activeTab !== "media") {
      toast({
        title: "Media Required",
        description: "Please upload at least one image of your yacht.",
      });
      setActiveTab("media");
      return;
    }
    
    // Switch to basic tab if no location selected
    if (!location && activeTab !== "basic") {
      toast({
        title: "Location Required",
        description: "Please select a location for your yacht.",
      });
      setActiveTab("basic");
      return;
    }
    
    // Final validation before submission
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please select a location for your yacht.",
        variant: "destructive",
      });
      return;
    }
    
    if (media.length === 0) {
      toast({
        title: "Media Required",
        description: "Please upload at least one image of your yacht.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Create or update yacht experience object
      const packageId = editMode && yachtData 
        ? yachtData.package_id 
        : `yacht-${auth.currentUser.uid}-${Date.now()}`;
      
      const yachtObject: YachtExperience = {
        package_id: packageId,
        title: values.title,
        description: values.description,
        category: values.category,
        yacht_type: values.yacht_type,
        location: location,
        duration: values.duration,
        capacity: values.capacity,
        pricing: values.pricing,
        pricing_model: values.pricing_model,
        customization_options: customizationOptions,
        media: media,
        availability_status: values.availability_status,
        featured: values.featured,
        tags: values.tags,
        published_status: values.published_status,
        created_date: editMode && yachtData ? yachtData.created_date : Timestamp.now(),
        last_updated_date: Timestamp.now(),
        virtual_tour: {
          enabled: values.virtual_tour_enabled,
          scenes: editMode && yachtData?.virtual_tour?.scenes ? yachtData.virtual_tour.scenes : []
        }
      };
      
      // Log the object being saved
      console.log('Saving yacht with data:', yachtObject);
      
      // Save to Firestore
      const yachtRef = doc(db, "yacht_experiences", packageId);
      
      if (editMode) {
        // Convert YachtExperience to a plain object for Firestore update
        const updateData = {
          title: yachtObject.title,
          description: yachtObject.description,
          category: yachtObject.category,
          yacht_type: yachtObject.yacht_type,
          location: yachtObject.location,
          duration: yachtObject.duration,
          capacity: yachtObject.capacity,
          pricing: yachtObject.pricing,
          pricing_model: yachtObject.pricing_model,
          customization_options: yachtObject.customization_options,
          media: yachtObject.media,
          availability_status: yachtObject.availability_status,
          featured: yachtObject.featured,
          tags: yachtObject.tags,
          published_status: yachtObject.published_status,
          last_updated_date: yachtObject.last_updated_date,
          virtual_tour: yachtObject.virtual_tour
        };
        
        await updateDoc(yachtRef, updateData);
        toast({
          title: "Yacht Updated",
          description: "Your yacht has been successfully updated.",
        });
      } else {
        await setDoc(yachtRef, yachtObject);
        toast({
          title: "Yacht Created",
          description: "Your yacht has been successfully created.",
        });
      }

      // Invalidate queries to refresh data in the asset management page
      // Invalidate all yacht queries regardless of pagination parameters
      queryClient.invalidateQueries({ 
        queryKey: ['/api/yachts/producer']
      });
      
      // Explicitly invalidate the first page to ensure the dashboard refreshes
      queryClient.invalidateQueries({
        queryKey: ['/api/yachts/producer', { page: 1, pageSize: 10 }]
      });
      
      // Invalidate the featured experiences query if the yacht is marked as featured
      if (values.featured) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/experiences/featured']
        });
      }
      
      // Navigate back to asset management
      navigateBack();
    } catch (error) {
      console.error("Error saving yacht:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save your yacht. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Navigation
  const navigateBack = () => setLocation("/dashboard/producer/assets");
  
  if (initialLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <h3 className="text-lg font-medium">Loading Yacht Details...</h3>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 mb-4" 
            onClick={navigateBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assets
          </Button>
          
          <h1 className="text-3xl font-bold">{editMode ? 'Edit Yacht' : 'Add New Yacht'}</h1>
          <p className="text-muted-foreground">
            {editMode ? 'Update your yacht information' : 'Add a new yacht to your fleet'}
          </p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs 
              value={activeTab} 
              onValueChange={(value) => {
                // Check if form values are valid before allowing tab change
                setActiveTab(value);
              }} 
              className="space-y-6"
            >
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="details">Details & Pricing</TabsTrigger>
                <TabsTrigger value="media">Media & Settings</TabsTrigger>
              </TabsList>
              
              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Enter the basic details of your yacht experience
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Title */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Luxury Yacht Experience" {...field} />
                          </FormControl>
                          <FormDescription>
                            A catchy title for your yacht experience
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the yacht experience..."
                              className="min-h-32"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Provide a detailed description of what guests can expect
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Category */}
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              <option value="">Select a category</option>
                              {categoryOptions.map(category => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormDescription>
                            Choose the category that best describes your yacht experience
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Yacht Type */}
                    <FormField
                      control={form.control}
                      name="yacht_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Yacht Type</FormLabel>
                          <FormControl>
                            <Input placeholder="Motor Yacht, Sailing Yacht, etc." {...field} />
                          </FormControl>
                          <FormDescription>
                            Specify the type or model of the yacht
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Location */}
                    <div className="space-y-2">
                      <FormLabel>Location</FormLabel>
                      <PlacesAutocomplete
                        onPlaceSelect={handleLocationSelect}
                        placeholder="Search for marina or port location"
                        className="w-full"
                      />
                      {location && (
                        <div className="p-4 border rounded-md mt-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{location.port_marina || "Selected Location"}</p>
                              <p className="text-sm text-muted-foreground">{location.address}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <NavigationIcon className="h-3 w-3" />
                                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                              </div>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setLocation_(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      <FormDescription>
                        Select the marina or port where your yacht is located
                      </FormDescription>
                    </div>
                    
                    <div className="flex justify-between mt-6">
                      {/* No Previous button on first tab */}
                      
                      <Button 
                        type="button" 
                        onClick={() => setActiveTab("details")}
                        className="flex items-center gap-2 ml-auto"
                      >
                        Next: Details & Pricing
                        <ArrowLeft className="h-4 w-4 rotate-180" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Details & Pricing Tab */}
              <TabsContent value="details" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Details & Pricing</CardTitle>
                    <CardDescription>
                      Set up the capacity, duration, and pricing for your yacht experience
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Duration */}
                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (hours)</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormDescription>
                              How long the experience lasts
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Capacity */}
                      <FormField
                        control={form.control}
                        name="capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacity (people)</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormDescription>
                              Maximum number of guests
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Base Price */}
                      <FormField
                        control={form.control}
                        name="pricing"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base Price ($)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.01" {...field} />
                            </FormControl>
                            <FormDescription>
                              Starting price per booking
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Pricing Model */}
                    <FormField
                      control={form.control}
                      name="pricing_model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pricing Model</FormLabel>
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="fixed"
                                value="Fixed"
                                checked={field.value === 'Fixed'}
                                onChange={() => field.onChange('Fixed')}
                                className="rounded-full"
                              />
                              <label htmlFor="fixed" className="text-sm font-medium">
                                Fixed Price
                              </label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="variable"
                                value="Variable"
                                checked={field.value === 'Variable'}
                                onChange={() => field.onChange('Variable')}
                                className="rounded-full"
                              />
                              <label htmlFor="variable" className="text-sm font-medium">
                                Variable Price (based on options)
                              </label>
                            </div>
                          </div>
                          <FormDescription>
                            Choose how you want to structure your pricing
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Customization Options */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <FormLabel>Customization Options</FormLabel>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        {customizationOptions.map((option, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 border rounded-md">
                            <div className="flex-1">
                              <p className="font-medium">{option.name}</p>
                              <p className="text-sm text-muted-foreground">${option.price}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCustomizationOption(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="md:col-span-2">
                          <FormLabel className="text-sm">Option Name</FormLabel>
                          <Input
                            placeholder="e.g. Catering, Equipment Rental"
                            value={customizationOptionInput.name}
                            onChange={(e) => setCustomizationOptionInput({
                              ...customizationOptionInput,
                              name: e.target.value
                            })}
                          />
                        </div>
                        <div>
                          <FormLabel className="text-sm">Price ($)</FormLabel>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="50"
                            value={customizationOptionInput.price}
                            onChange={(e) => setCustomizationOptionInput({
                              ...customizationOptionInput,
                              price: e.target.value
                            })}
                          />
                        </div>
                        <div>
                          <Button
                            type="button"
                            onClick={handleAddCustomizationOption}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Option
                          </Button>
                        </div>
                      </div>
                      
                      <FormDescription>
                        Add optional extras that guests can add to their booking
                      </FormDescription>
                    </div>
                    
                    {/* Tags */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tags</FormLabel>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {field.value.map(tag => (
                                <div key={tag} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm">
                                  {tag}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 ml-1"
                                    onClick={() => handleRemoveTag(tag)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add a tag"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTag();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddTag}
                              >
                                Add
                              </Button>
                            </div>
                            <FormDescription>
                              Add relevant tags to help customers find your yacht
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-between mt-6">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setActiveTab("basic")}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Basic Information
                      </Button>
                      
                      <Button 
                        type="button" 
                        onClick={() => setActiveTab("media")}
                        className="flex items-center gap-2"
                      >
                        Next: Media & Settings
                        <ArrowLeft className="h-4 w-4 rotate-180" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Media & Settings Tab */}
              <TabsContent value="media" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Media</CardTitle>
                    <CardDescription>
                      Upload photos and videos of your yacht
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Media Uploader */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <FormLabel>Photos & Videos</FormLabel>
                        <label
                          htmlFor="media-upload"
                          className="flex items-center gap-1 text-sm text-primary cursor-pointer"
                        >
                          <UploadCloud className="h-4 w-4" />
                          Upload Media
                        </label>
                        <input
                          id="media-upload"
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          className="hidden"
                          onChange={handleMediaUpload}
                          disabled={uploadingMedia}
                        />
                      </div>
                      
                      {uploadingMedia && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading media...
                        </div>
                      )}
                      
                      {media.length === 0 ? (
                        <div className="border-2 border-dashed rounded-md p-10 text-center">
                          <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No media uploaded yet</p>
                          <p className="text-xs text-muted-foreground">
                            Upload photos and videos to showcase your yacht
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {media.map((item, index) => (
                            <div key={index} className="relative group rounded-md overflow-hidden">
                              {item.type === 'image' ? (
                                <img
                                  src={item.url}
                                  alt={`Yacht media ${index + 1}`}
                                  className="w-full h-32 object-cover"
                                />
                              ) : (
                                <video
                                  src={item.url}
                                  className="w-full h-32 object-cover"
                                  controls={false}
                                />
                              )}
                              
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteMedia(index)}
                                  className="text-white"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </div>
                              
                              {index === 0 && (
                                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs">
                                  Cover Photo
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <FormDescription>
                        The first image will be used as the cover photo for your listing
                      </FormDescription>
                    </div>
                    
                    <Separator className="my-6" />
                    
                    {/* Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Publishing Settings</h3>
                      
                      {/* Availability Status */}
                      <FormField
                        control={form.control}
                        name="availability_status"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Available for Booking</FormLabel>
                              <FormDescription>
                                Make this yacht available for customers to book
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
                      
                      {/* Featured Status */}
                      <FormField
                        control={form.control}
                        name="featured"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Featured Listing</FormLabel>
                              <FormDescription>
                                Highlight this yacht in featured sections of the website
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
                      
                      {/* Published Status */}
                      <FormField
                        control={form.control}
                        name="published_status"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Publish Listing</FormLabel>
                              <FormDescription>
                                Make this yacht listing visible to customers
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
                      
                      {/* Virtual Tour */}
                      <FormField
                        control={form.control}
                        name="virtual_tour_enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Virtual Tour</FormLabel>
                              <FormDescription>
                                Enable 360° virtual tour for this yacht
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
                      
                      {form.getValues().virtual_tour_enabled && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Virtual Tour Editor</AlertTitle>
                          <AlertDescription>
                            After saving, you can access the Virtual Tour Editor to set up your 360° experience.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <div className="flex justify-between mt-6">
                      {activeTab !== "basic" && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            const prevTab = activeTab === "media" ? "details" : "basic";
                            setActiveTab(prevTab);
                          }}
                          className="flex items-center gap-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Previous
                        </Button>
                      )}
                      
                      {activeTab !== "media" && (
                        <Button 
                          type="button" 
                          onClick={() => {
                            const nextTab = activeTab === "basic" ? "details" : "media";
                            setActiveTab(nextTab);
                          }}
                          className="flex items-center gap-2 ml-auto"
                        >
                          Next
                          <ArrowLeft className="h-4 w-4 rotate-180" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* Form Actions - Always visible at bottom of form */}
            <Card className="mt-8 shadow-md">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">Ready to {editMode ? 'update' : 'create'} your yacht?</h3>
                    <p className="text-sm text-muted-foreground">
                      {editMode 
                        ? 'Save your changes to update this yacht experience.' 
                        : 'Complete the form to add this yacht to your fleet.'}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={navigateBack}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="px-6"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editMode ? 'Update Yacht' : 'Create Yacht'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}