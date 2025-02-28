import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle,
  ArrowLeft, 
  Check, 
  ChevronRight, 
  Image as ImageIcon, 
  UploadCloud, 
  UserRound 
} from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ServiceProviderProfile } from "@shared/firestore-schema";

// Profile Form Schema
const profileFormSchema = z.object({
  businessName: z.string().min(3, { message: "Business name must be at least 3 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  profilePhoto: z.string().optional(),
  yearsOfExperience: z.coerce.number().min(0, { message: "Years of experience must be a positive number" }).optional(),
  professionalDescription: z.string().max(500, { message: "Description must be less than 500 characters" }).optional(),
  servicesOffered: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  industryAffiliations: z.array(z.string()).optional(),
  communicationPreferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(true),
    push: z.boolean().default(true),
  }),
  profileVisibility: z.enum(['public', 'verified_users', 'private']).default('public'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProducerProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ServiceProviderProfile | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize form with default values
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      businessName: "",
      email: "",
      phone: "",
      address: "",
      profilePhoto: "",
      yearsOfExperience: undefined,
      professionalDescription: "",
      servicesOffered: [],
      certifications: [],
      industryAffiliations: [],
      communicationPreferences: {
        email: true,
        sms: true,
        push: true,
      },
      profileVisibility: 'public',
    },
  });

  // Fetch producer profile data on component mount
  useEffect(() => {
    const fetchProducerProfile = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          setLocation("/login");
          return;
        }

        // First try to get data from the service provider collection
        const profileDocRef = doc(db, "user_profiles_service_provider", user.uid);
        const profileDoc = await getDoc(profileDocRef);
        
        // If producer profile exists, use that data
        if (profileDoc.exists()) {
          const data = profileDoc.data() as ServiceProviderProfile;
          setProfileData(data);
          
          // Set form values
          form.reset({
            businessName: data.businessName || "",
            email: data.contactInformation?.email || "",
            phone: data.contactInformation?.phone || "",
            address: data.contactInformation?.address || "",
            profilePhoto: data.profilePhoto || "",
            yearsOfExperience: data.yearsOfExperience || undefined,
            professionalDescription: data.professionalDescription || "",
            servicesOffered: data.servicesOffered || [],
            certifications: data.certifications || [],
            industryAffiliations: data.industryAffiliations || [],
            communicationPreferences: {
              email: data.communicationPreferences?.email !== false,
              sms: data.communicationPreferences?.sms !== false,
              push: data.communicationPreferences?.push !== false,
            },
            profileVisibility: data.profileVisibility || 'public',
          });
          
          // Set image preview
          if (data.profilePhoto) {
            setImagePreview(data.profilePhoto);
          }
        } else {
          // If producer profile doesn't exist, look for data in users collection
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Pre-fill the form with available user data
            form.reset({
              businessName: userData.name || "",
              email: userData.email || user.email || "",
              phone: userData.phone || "",
              address: "",
              profilePhoto: userData.profilePhoto || "",
              yearsOfExperience: undefined,
              professionalDescription: "",
              servicesOffered: [],
              certifications: [],
              industryAffiliations: [],
              communicationPreferences: {
                email: true,
                sms: true,
                push: true,
              },
              profileVisibility: 'public',
            });
            
            // Create a partial profile data object
            setProfileData({
              providerId: user.uid,
              businessName: userData.name || "",
              contactInformation: {
                email: userData.email || user.email || "",
                phone: userData.phone || "",
                address: "",
              },
              profilePhoto: userData.profilePhoto || "",
              servicesOffered: [],
              certifications: [],
              ratings: 0,
              tags: [],
              createdDate: new Date() as any,
              lastUpdatedDate: new Date() as any,
            } as ServiceProviderProfile);
            
            if (userData.profilePhoto) {
              setImagePreview(userData.profilePhoto);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching producer profile:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducerProfile();
  }, [setLocation, toast, form]);

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image upload to Firebase Storage
  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !auth.currentUser) return null;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const storageRef = ref(storage, `profile_photos/${auth.currentUser.uid}/${Date.now()}_${imageFile.name}`);
      
      // Upload the file
      const uploadTask = uploadBytes(storageRef, imageFile);
      
      // Simple progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);
      
      // Wait for upload to complete
      await uploadTask;
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload profile image. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission
  const onSubmit = async (values: ProfileFormValues) => {
    if (!auth.currentUser) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to update your profile.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Upload image if a new one was selected
      let profilePhotoUrl = values.profilePhoto;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          profilePhotoUrl = uploadedUrl;
        }
      }
      
      // Prepare the updated profile data
      const updatedProfile: Partial<ServiceProviderProfile> = {
        businessName: values.businessName,
        contactInformation: {
          email: values.email,
          phone: values.phone,
          address: values.address,
        },
        profilePhoto: profilePhotoUrl || "",
        yearsOfExperience: values.yearsOfExperience,
        professionalDescription: values.professionalDescription,
        servicesOffered: values.servicesOffered || [],
        certifications: values.certifications || [],
        industryAffiliations: values.industryAffiliations || [],
        communicationPreferences: values.communicationPreferences,
        profileVisibility: values.profileVisibility,
        lastUpdatedDate: new Date() as any,
      };
      
      // Check if profile document exists
      const profileDocRef = doc(db, "user_profiles_service_provider", auth.currentUser.uid);
      const profileSnapshot = await getDoc(profileDocRef);
      
      if (profileSnapshot.exists()) {
        // Update existing document
        await updateDoc(profileDocRef, updatedProfile);
      } else {
        // Create new profile document with complete required fields
        const newProfile: ServiceProviderProfile = {
          providerId: auth.currentUser.uid,
          businessName: values.businessName,
          contactInformation: {
            email: values.email,
            phone: values.phone,
            address: values.address,
          },
          profilePhoto: profilePhotoUrl || "",
          servicesOffered: values.servicesOffered || [],
          certifications: values.certifications || [],
          yearsOfExperience: values.yearsOfExperience,
          professionalDescription: values.professionalDescription,
          industryAffiliations: values.industryAffiliations || [],
          communicationPreferences: values.communicationPreferences,
          profileVisibility: values.profileVisibility,
          ratings: 0,
          tags: [],
          accountStatus: 'active',
          verificationStatus: 'pending',
          createdDate: new Date() as any,
          lastUpdatedDate: new Date() as any,
        };
        
        // Set the new document
        await setDoc(profileDocRef, newProfile);
        
        // Also update the users collection with basic info
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userDocRef, {
          name: values.businessName,
          email: values.email,
          phone: values.phone,
          profilePhoto: profilePhotoUrl || "",
          lastUpdatedDate: new Date().toISOString()
        }).catch(() => {
          // If update fails (document might not exist), try to create it
          setDoc(userDocRef, {
            name: values.businessName,
            email: values.email,
            phone: values.phone,
            profilePhoto: profilePhotoUrl || "",
            role: "producer",
            createdAt: new Date().toISOString(),
            lastUpdatedDate: new Date().toISOString()
          });
        });
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
      
      // Refresh profile data
      const updatedDoc = await getDoc(profileDocRef);
      if (updatedDoc.exists()) {
        setProfileData(updatedDoc.data() as ServiceProviderProfile);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Define services offered options
  const serviceOptions = [
    "Luxury Yacht Rentals",
    "Sailing Cruises",
    "Fishing Charters",
    "Diving Excursions",
    "Water Sports",
    "Sunset Cruises",
    "Corporate Events",
    "Private Parties",
    "Overnight Stays",
    "Full-Day Experiences"
  ];

  // Define certification options
  const certificationOptions = [
    "Maritime Safety",
    "Professional Captain's License",
    "First Aid & CPR",
    "Diving Certification",
    "Hospitality Excellence",
    "Environmental Protection",
    "Food Safety & Handling",
    "Luxury Service Standards",
    "Marine Navigation Expert",
    "Emergency Response"
  ];
  
  // Navigation back to dashboard
  const goToDashboard = () => setLocation("/dashboard/producer");

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 mb-4" 
            onClick={goToDashboard}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold">Producer Profile</h1>
          <p className="text-muted-foreground">
            Manage your business profile and settings
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Overview Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Profile Overview</CardTitle>
                <CardDescription>Your public profile information</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage 
                    src={imagePreview || profileData?.profilePhoto || ""} 
                    alt={profileData?.businessName || "Profile"} 
                  />
                  <AvatarFallback className="text-2xl">
                    {(profileData?.businessName?.charAt(0) || "P")}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold mb-1">
                  {profileData?.businessName || "Your Business Name"}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {profileData?.contactInformation?.email || "your.email@example.com"}
                </p>
                
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Account Status</span>
                    <span className="flex items-center gap-1 text-green-600">
                      <Check className="h-3 w-3" />
                      {profileData?.accountStatus || 'Active'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Profile Visibility</span>
                    <span>{profileData?.profileVisibility || 'Public'}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Services</span>
                    <span>{profileData?.servicesOffered?.length || 0} listed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start" onClick={() => setLocation("/dashboard/producer/assets")}>
                  Manage Yachts
                  <ChevronRight className="ml-auto h-4 w-4" />
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setLocation("/dashboard/producer/compliance")}>
                  Upload Documents
                  <ChevronRight className="ml-auto h-4 w-4" />
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => setLocation("/dashboard/producer/reviews")}>
                  View Reviews
                  <ChevronRight className="ml-auto h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>
                  Update your business information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="services">Services</TabsTrigger>
                    <TabsTrigger value="preferences">Preferences</TabsTrigger>
                  </TabsList>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Basic Info Tab */}
                      <TabsContent value="basic" className="space-y-6">
                        {/* Profile Photo Upload */}
                        <FormItem>
                          <FormLabel>Profile Photo</FormLabel>
                          <div className="flex items-center gap-6">
                            <Avatar className="h-24 w-24">
                              <AvatarImage 
                                src={imagePreview || profileData?.profilePhoto || ""} 
                                alt={profileData?.businessName || "Profile"} 
                              />
                              <AvatarFallback className="text-2xl bg-primary/10">
                                <UserRound className="h-10 w-10 text-primary" />
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 space-y-2">
                              <FormLabel htmlFor="profile-upload" className="cursor-pointer">
                                <div className="flex items-center gap-2 text-sm text-primary">
                                  <UploadCloud className="h-4 w-4" />
                                  Upload New Photo
                                </div>
                              </FormLabel>
                              <Input 
                                id="profile-upload" 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleImageChange}
                              />
                              
                              <FormDescription>
                                Recommended: Square image, at least 300x300px
                              </FormDescription>
                              
                              {isUploading && (
                                <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                                  <div 
                                    className="bg-primary h-2.5 rounded-full" 
                                    style={{ width: `${uploadProgress}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </FormItem>
                        
                        {/* Business Name */}
                        <FormField
                          control={form.control}
                          name="businessName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your Business Name" {...field} />
                              </FormControl>
                              <FormDescription>
                                This will be displayed publicly on your profile
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Contact Information - Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Email */}
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input placeholder="email@example.com" type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Phone */}
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="+1 (555) 123-4567" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {/* Address */}
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Address</FormLabel>
                              <FormControl>
                                <Input placeholder="Your business address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Years of Experience */}
                        <FormField
                          control={form.control}
                          name="yearsOfExperience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Years of Experience</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  placeholder="5" 
                                  {...field} 
                                  onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Professional Description */}
                        <FormField
                          control={form.control}
                          name="professionalDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Professional Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Tell customers about your business, experience, and services..." 
                                  className="min-h-32" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                {field.value?.length || 0}/500 characters
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      
                      {/* Services Tab */}
                      <TabsContent value="services" className="space-y-6">
                        <Alert className="mb-6">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Services & Certifications</AlertTitle>
                          <AlertDescription>
                            Select the services you offer and certifications you have. This information helps customers find your business.
                          </AlertDescription>
                        </Alert>
                        
                        {/* Services Offered */}
                        <div className="space-y-2">
                          <FormLabel>Services Offered</FormLabel>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {serviceOptions.map((service) => (
                              <div key={service} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`service-${service}`}
                                  checked={form.getValues().servicesOffered?.includes(service) || false}
                                  onChange={(e) => {
                                    const currentValues = form.getValues().servicesOffered || [];
                                    if (e.target.checked) {
                                      form.setValue('servicesOffered', [...currentValues, service]);
                                    } else {
                                      form.setValue(
                                        'servicesOffered',
                                        currentValues.filter(v => v !== service)
                                      );
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <label
                                  htmlFor={`service-${service}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {service}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <Separator className="my-6" />
                        
                        {/* Certifications */}
                        <div className="space-y-2">
                          <FormLabel>Certifications</FormLabel>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {certificationOptions.map((cert) => (
                              <div key={cert} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`cert-${cert}`}
                                  checked={form.getValues().certifications?.includes(cert) || false}
                                  onChange={(e) => {
                                    const currentValues = form.getValues().certifications || [];
                                    if (e.target.checked) {
                                      form.setValue('certifications', [...currentValues, cert]);
                                    } else {
                                      form.setValue(
                                        'certifications',
                                        currentValues.filter(v => v !== cert)
                                      );
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <label
                                  htmlFor={`cert-${cert}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {cert}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setLocation("/dashboard/producer/compliance")}
                          >
                            Manage Compliance Documents
                          </Button>
                          <FormDescription className="mt-2">
                            Upload licenses, certifications, and other business documents
                          </FormDescription>
                        </div>
                      </TabsContent>
                      
                      {/* Preferences Tab */}
                      <TabsContent value="preferences" className="space-y-6">
                        {/* Communication Preferences */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Communication Preferences</h3>
                          
                          <FormField
                            control={form.control}
                            name="communicationPreferences.email"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Email Notifications</FormLabel>
                                  <FormDescription>
                                    Receive booking confirmations and updates via email
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
                          
                          <FormField
                            control={form.control}
                            name="communicationPreferences.sms"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">SMS Notifications</FormLabel>
                                  <FormDescription>
                                    Receive text messages for important updates
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
                          
                          <FormField
                            control={form.control}
                            name="communicationPreferences.push"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Push Notifications</FormLabel>
                                  <FormDescription>
                                    Receive push notifications for real-time updates
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
                        </div>
                        
                        <Separator className="my-6" />
                        
                        {/* Profile Visibility */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Profile Visibility</h3>
                          
                          <FormField
                            control={form.control}
                            name="profileVisibility"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        id="public"
                                        value="public"
                                        checked={field.value === 'public'}
                                        onChange={() => field.onChange('public')}
                                        className="rounded-full"
                                      />
                                      <label htmlFor="public" className="text-sm font-medium">
                                        Public - Visible to everyone
                                      </label>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        id="verified_users"
                                        value="verified_users"
                                        checked={field.value === 'verified_users'}
                                        onChange={() => field.onChange('verified_users')}
                                        className="rounded-full"
                                      />
                                      <label htmlFor="verified_users" className="text-sm font-medium">
                                        Verified Users Only - Only visible to registered and verified users
                                      </label>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        id="private"
                                        value="private"
                                        checked={field.value === 'private'}
                                        onChange={() => field.onChange('private')}
                                        className="rounded-full"
                                      />
                                      <label htmlFor="private" className="text-sm font-medium">
                                        Private - Only visible to users you approve
                                      </label>
                                    </div>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </TabsContent>
                      
                      {/* Form Actions - Common for all tabs */}
                      <div className="flex justify-end space-x-4 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={goToDashboard}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}