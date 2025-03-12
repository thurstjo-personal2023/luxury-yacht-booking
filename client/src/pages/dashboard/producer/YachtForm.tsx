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
import { getYachtImageProps, handleYachtImageError } from "@/lib/image-utils";
import { 
  doc, 
  collection, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject
} from "firebase/storage";
import { YachtExperience as BaseYachtExperience, Media, Location } from "@shared/firestore-schema";

// Extended interface to handle both naming conventions
interface YachtExperience extends BaseYachtExperience {
  // Legacy fields from old data model
  yachtId?: string;
  id?: string;
  name?: string;
  price?: number;
  available?: boolean;
  features?: string[];
  max_guests?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

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
  // Always use the unified collection for all operations
  const sourceCollection = "unified_yacht_experiences";
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
  const [producerData, setProducerData] = useState<{
    producerId: string;
    providerId: string;
  } | null>(null);
  
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
  
  // Fetch producer data from harmonized_users collection
  useEffect(() => {
    if (auth.currentUser) {
      fetchProducerData(auth.currentUser.uid);
    }
  }, []);

  // Initialize edit mode if yacht ID is provided
  useEffect(() => {
    if (params.id) {
      setEditMode(true);
      fetchYachtDetails(params.id);
    }
  }, [params.id]);
  
  // Fetch producer details from harmonized_users collection
  const fetchProducerData = async (userId: string) => {
    try {
      console.log(`Fetching producer data for user ID: ${userId}`);
      
      // Create a query to find the user in the harmonized_users collection
      const usersRef = collection(db, "harmonized_users");
      const q = query(usersRef, where("userId", "==", userId));
      
      // Execute the query
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Get the first matching document
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        // Check if the user is a producer
        if (userData.role === 'producer') {
          console.log("Found producer data:", userData);
          
          // Set the producerId and providerId from the harmonized_users collection
          setProducerData({
            producerId: userData.producerId || userData.id,
            providerId: userData.providerId || userData.id
          });
        } else {
          console.warn(`User ${userId} is not a producer. Role: ${userData.role}`);
          // Fallback to using the auth ID directly
          setProducerData({
            producerId: userId,
            providerId: userId
          });
        }
      } else {
        console.warn(`No user found in harmonized_users with ID: ${userId}`);
        // Fallback to using the auth ID directly
        setProducerData({
          producerId: userId,
          providerId: userId
        });
      }
    } catch (error) {
      console.error("Error fetching producer data:", error);
      // Fallback to using the auth ID directly
      setProducerData({
        producerId: userId,
        providerId: userId
      });
    }
  };
  
  // Fetch yacht details for editing
  const fetchYachtDetails = async (yachtId: string) => {
    setInitialLoading(true);
    try {
      // Only use the unified collection - no legacy collections
      const collectionName = "unified_yacht_experiences";
      console.log(`Searching for yacht ID ${yachtId} in ${collectionName} collection...`);
      
      const yachtRef = doc(db, collectionName, yachtId);
      const yachtDoc = await getDoc(yachtRef);
      
      if (yachtDoc && yachtDoc.exists()) {
        const data = yachtDoc.data() as YachtExperience;
        console.log("Found yacht data:", data);
        
        // Normalize data to handle both formats
        const normalizedData = {
          // Create a normalized data structure with both field names
          package_id: data.package_id || data.yachtId || data.id || yachtId,
          yachtId: data.package_id || data.yachtId || data.id || yachtId,
          id: data.package_id || data.yachtId || data.id || yachtId,
          title: data.title || data.name || "",
          name: data.title || data.name || "",
          description: data.description || "",
          category: data.category || "",
          yacht_type: data.yacht_type || "",
          duration: data.duration || 4,
          capacity: data.capacity || data.max_guests || 10,
          pricing: data.pricing || data.price || 0,
          pricing_model: data.pricing_model || "Fixed",
          customization_options: data.customization_options || [],
          media: data.media || [],
          availability_status: data.availability_status !== undefined ? data.availability_status : (data.available !== undefined ? data.available : true),
          available: data.availability_status !== undefined ? data.availability_status : (data.available !== undefined ? data.available : true),
          featured: data.featured || false,
          tags: data.tags || data.features || [],
          features: data.tags || data.features || [],
          published_status: data.published_status !== undefined ? data.published_status : true,
          created_date: data.created_date || Timestamp.now(),
          last_updated_date: data.last_updated_date || Timestamp.now(),
          virtual_tour: data.virtual_tour || { enabled: false, scenes: [] },
          location: data.location || {
            address: "",
            latitude: 0,
            longitude: 0,
            region: "dubai",
            port_marina: ""
          }
        };
        
        // Set the normalized data
        setYachtData(normalizedData);
        setMedia(normalizedData.media || []);
        setCustomizationOptions(normalizedData.customization_options || []);
        setLocation_(normalizedData.location);
        
        // Set form values using the normalized data
        form.reset({
          title: normalizedData.title,
          description: normalizedData.description,
          category: normalizedData.category,
          yacht_type: normalizedData.yacht_type || "",
          duration: normalizedData.duration,
          capacity: normalizedData.capacity,
          pricing: normalizedData.pricing,
          pricing_model: normalizedData.pricing_model,
          tags: normalizedData.tags || [],
          availability_status: normalizedData.availability_status,
          featured: normalizedData.featured,
          published_status: normalizedData.published_status,
          virtual_tour_enabled: normalizedData.virtual_tour?.enabled || false,
        });
      } else {
        toast({
          title: "Yacht Not Found",
          description: "The yacht you're trying to edit could not be found in any collection.",
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
    const uploadedMedia: Media[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/');
        
        // Create a unique file path with timestamp for cache busting
        const timestamp = Date.now();
        const storagePath = `yacht_media/${auth.currentUser.uid}/${timestamp}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        
        // Upload the file
        await uploadBytes(storageRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        // Add to uploaded media array
        uploadedMedia.push({
          type: isVideo ? 'video' : 'image',
          url: downloadURL
        });
      }
      
      // Determine if this is the first upload (no existing media)
      const isFirstUpload = newMedia.length === 0;
      
      if (isFirstUpload) {
        // If this is the first upload, these become our media with first image as cover
        setMedia([...uploadedMedia, ...newMedia]);
        
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${files.length} file(s). First image set as cover.`,
        });
      } else {
        // Otherwise add to end of existing media
        setMedia([...newMedia, ...uploadedMedia]);
        
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${files.length} file(s). Use "Set as Cover" to make any image the cover image.`,
        });
      }
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
  
  // Set an image as cover image (move to first position in array)
  const setCoverImage = (index: number) => {
    if (index < 0 || index >= media.length || index === 0) return;
    
    // Make a copy of the media array
    const newMedia = [...media];
    
    // Move the selected image to the first position (as cover image)
    const [selectedImage] = newMedia.splice(index, 1);
    newMedia.unshift(selectedImage);
    
    setMedia(newMedia);
    
    toast({
      title: "Cover Image Set",
      description: "The selected image will be used as the cover image",
    });
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
    const tagValue = tagInput.trim();
    if (!tagValue) return;
    
    // Get current tags, ensure it's an array
    const currentTags = Array.isArray(form.getValues().tags) ? form.getValues().tags : [];
    
    // Only add if tag doesn't already exist
    if (!currentTags.includes(tagValue)) {
      form.setValue('tags', [...currentTags, tagValue]);
    }
    
    setTagInput("");
  };
  
  // Handle removing a tag
  const handleRemoveTag = (tag: string) => {
    // Get current tags, ensure it's an array
    const currentTags = Array.isArray(form.getValues().tags) ? form.getValues().tags : [];
    
    // Filter out the tag to remove
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
      
      // Always use the unified collection for all operations
      const collectionName = "unified_yacht_experiences";
      
      // Log that we're exclusively using the unified collection
      console.log(`Using unified collection (${collectionName}) for all yacht operations`)
      
      // Save to Firestore
      const yachtRef = doc(db, collectionName, packageId);
      
      // Create a comprehensive data object with all field naming conventions
      const newYachtData: Record<string, any> = {
        // Core unified schema fields
        id: packageId,
        title: values.title,
        description: values.description,
        category: values.category,
        yachtType: values.yacht_type, // unified field
        location: location,
        duration: values.duration,
        capacity: values.capacity,
        pricing: values.pricing,
        pricingModel: values.pricing_model, // unified field
        customizationOptions: customizationOptions.map(opt => ({ 
          id: opt.product_id || `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: opt.name,
          price: opt.price 
        })), // unified field
        media: media,
        isAvailable: values.availability_status, // unified field
        isFeatured: values.featured, // unified field
        isPublished: values.published_status, // unified field
        tags: values.tags,
        // Add producer ID from harmonized_users collection
        producerId: producerData?.producerId || auth.currentUser?.uid || 'unknown-producer',
        providerId: producerData?.providerId || auth.currentUser?.uid || 'unknown-producer',
        virtualTour: {
          isEnabled: values.virtual_tour_enabled, // unified field
          scenes: editMode && yachtData?.virtual_tour?.scenes ? yachtData.virtual_tour.scenes : []
        },
        
        // Legacy fields for backward compatibility
        package_id: packageId,
        yacht_type: values.yacht_type,
        pricing_model: values.pricing_model,
        customization_options: customizationOptions,
        availability_status: values.availability_status,
        featured: values.featured,
        published_status: values.published_status,
        yachtId: packageId,
        name: values.title,
        price: values.pricing,
        available: values.availability_status,
        features: values.tags,
        max_guests: values.capacity,
      };
      
      // Add updated timestamp fields - ensuring we don't duplicate them
      const now = Timestamp.now();
      newYachtData.last_updated_date = now;
      newYachtData.updatedAt = now;
      
      // Add creation date fields - either from existing doc or new
      if (editMode && yachtData?.created_date) {
        newYachtData.created_date = yachtData.created_date;
        newYachtData.createdAt = yachtData.created_date; // legacy field
      } else {
        newYachtData.created_date = now;
        newYachtData.createdAt = now; // legacy field
      }
      
      if (editMode) {
        try {
          console.log(`Attempting to update yacht with ID ${packageId} in collection ${collectionName}`);
          
          // Add a cache-busting timestamp to force updates to be seen
          newYachtData._lastUpdated = Date.now();
          console.log('Update data:', newYachtData);
          
          // Update the document in the unified collection
          await updateDoc(yachtRef, newYachtData);
          console.log('Update successful to unified collection');
          
          console.log('Update successful');
          toast({
            title: "Yacht Updated",
            description: "Your yacht has been successfully updated.",
          });
        } catch (error) {
          console.error('Error updating yacht:', error);
          
          // Try creating a new document if update fails
          try {
            console.log('Update failed, trying to create new document instead');
            
            // Use the same newYachtData object, but reset a few fields that might be causing issues
            newYachtData.created_date = Timestamp.now();
            newYachtData.createdAt = Timestamp.now();
            newYachtData.last_updated_date = Timestamp.now();
            newYachtData.updatedAt = Timestamp.now();
            newYachtData._lastUpdated = Date.now(); // Force cache update
            newYachtData.virtual_tour = {
              enabled: values.virtual_tour_enabled,
              scenes: []
            };
            
            // Use setDoc instead of updateDoc to create the document if it doesn't exist
            await setDoc(yachtRef, newYachtData);
            console.log('Create successful as fallback to update');
            toast({
              title: "Yacht Updated",
              description: "Your yacht has been successfully updated.",
            });
          } catch (setDocError) {
            console.error('Error creating yacht document as fallback:', setDocError);
            throw error; // re-throw the original error to trigger the error handling below
          }
        }
      } else {
        // For new yachts, create with both field naming conventions
        try {
          // Add cache-busting timestamp
          newYachtData._lastUpdated = Date.now();
          console.log('Create data:', newYachtData);
          
          // Create document in the unified collection
          await setDoc(yachtRef, newYachtData);
          console.log('Successfully created yacht in unified collection');
          
          toast({
            title: "Yacht Created",
            description: "Your yacht has been successfully created.",
          });
        } catch (error) {
          console.error('Error creating new yacht:', error);
          throw error; // re-throw to trigger the error handling below
        }
      }

      // Invalidate all yacht queries to ensure all cached data is refreshed
      console.log('Invalidating all yacht queries to refresh data...');
      
      // Perform aggressive cache invalidation for all possible data sources
      console.log("Performing comprehensive cache invalidation after yacht update...");
      
      // First, reset the entire cache to ensure fresh data from all endpoints
      queryClient.resetQueries();
      
      // Then, explicitly invalidate specific endpoint queries
      // Producer yacht queries (main asset management page)
      queryClient.removeQueries({ queryKey: ['/api/producer/yachts'] });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/producer/yachts'],
        refetchType: 'all'
      });
      
      // Paginated yacht queries
      for (let page = 1; page <= 10; page++) { // Higher safety margin
        queryClient.invalidateQueries({
          queryKey: ['/api/producer/yachts', { page, pageSize: 10 }],
          refetchType: 'all'
        });
      }
      
      // General experiences endpoints
      queryClient.invalidateQueries({
        queryKey: ['/api/experiences'],
        refetchType: 'all'
      });
      
      // Specific yacht query by ID
      if (packageId) {
        queryClient.invalidateQueries({
          queryKey: ['/api/yacht', packageId],
          refetchType: 'all'
        });
      }
      
      // Featured experiences
      queryClient.invalidateQueries({ 
        queryKey: ['/api/experiences/featured'],
        refetchType: 'all'
      });
      
      // Unified yacht queries
      queryClient.invalidateQueries({
        queryKey: ['/api/unified/yachts'],
        refetchType: 'all'
      });
      
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
                              {Array.isArray(field.value) && field.value.map(tag => (
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
                                  onError={handleYachtImageError}
                                />
                              ) : (
                                <video
                                  src={item.url}
                                  className="w-full h-32 object-cover"
                                  controls={false}
                                />
                              )}
                              
                              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {index !== 0 && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setCoverImage(index)}
                                    className="text-white"
                                  >
                                    <Camera className="h-4 w-4 mr-1" />
                                    Set as Cover
                                  </Button>
                                )}
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
                                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium shadow-sm">
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