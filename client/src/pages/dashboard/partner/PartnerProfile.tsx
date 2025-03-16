import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PartnerSidebar } from "@/components/layout/PartnerSidebar";
import { usePartnerProfile, useUpdatePartnerProfile } from "@/hooks/partner/usePartnerQueries";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  CircleUserRound,
  Briefcase,
  Award,
  Tag,
  BadgeCheck,
  Loader2,
  Upload,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ServiceProviderProfile } from "../../../../shared/harmonized-user-schema";

// Form schema for profile
const profileFormSchema = z.object({
  // Core user info
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  phone: z.string().min(5, { message: "Phone number is required" }),
  
  // Business info
  businessName: z.string().min(2, { message: "Business name is required" }),
  address: z.string().min(5, { message: "Address is required" }),
  
  // Professional info
  professionalDescription: z.string().optional(),
  yearsOfExperience: z.coerce.number().min(0).optional(),
  servicesOffered: z.array(z.string()).optional(),
  
  // Communication preferences
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  
  // Account visibility
  profileVisibility: z.enum(["public", "verified_users", "private"]).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function PartnerProfile() {
  const { data: partnerData, isLoading: profileLoading } = usePartnerProfile();
  const updateProfile = useUpdatePartnerProfile();
  const [activeTab, setActiveTab] = useState("general");
  const [isUploading, setIsUploading] = useState(false);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      businessName: "",
      address: "",
      professionalDescription: "",
      yearsOfExperience: 0,
      servicesOffered: [],
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      profileVisibility: "public",
    },
  });
  
  // Update form when data is loaded
  useState(() => {
    if (!profileLoading && partnerData) {
      const { core, profile } = partnerData;
      
      form.reset({
        name: core?.name || "",
        email: core?.email || "",
        phone: core?.phone || "",
        businessName: profile?.businessName || "",
        address: profile?.contactInformation?.address || "",
        professionalDescription: profile?.professionalDescription || "",
        yearsOfExperience: profile?.yearsOfExperience || 0,
        servicesOffered: profile?.servicesOffered || [],
        emailNotifications: profile?.communicationPreferences?.email || true,
        smsNotifications: profile?.communicationPreferences?.sms || false,
        pushNotifications: profile?.communicationPreferences?.push || true,
        profileVisibility: profile?.profileVisibility || "public",
      });
    }
  });
  
  // Handle form submission
  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate({
      core: {
        name: data.name,
        email: data.email,
        phone: data.phone,
      },
      profile: {
        businessName: data.businessName,
        contactInformation: {
          address: data.address,
        },
        professionalDescription: data.professionalDescription,
        yearsOfExperience: data.yearsOfExperience,
        servicesOffered: data.servicesOffered,
        communicationPreferences: {
          email: data.emailNotifications,
          sms: data.smsNotifications,
          push: data.pushNotifications,
        },
        profileVisibility: data.profileVisibility as ServiceProviderProfile['profileVisibility'],
      }
    });
  };
  
  const handleProfileImageUpload = () => {
    // Placeholder for image upload functionality
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
    }, 2000);
  };
  
  // Loading state
  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-screen overflow-hidden">
          <aside className="hidden md:block w-64 border-r bg-background">
            <PartnerSidebar />
          </aside>
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading profile...</span>
                </div>
              </div>
            </main>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
                  <h1 className="text-3xl font-bold">Business Profile</h1>
                  <p className="text-muted-foreground">
                    Manage your business information and profile settings
                  </p>
                </div>
                
                <Badge 
                  variant={partnerData?.profile?.verificationStatus === "verified" ? "default" : "outline"}
                  className={partnerData?.profile?.verificationStatus === "verified" ? 
                    "bg-green-100 text-green-800 hover:bg-green-100" : 
                    "bg-amber-50 text-amber-800"
                  }
                >
                  {partnerData?.profile?.verificationStatus === "verified" ? (
                    <BadgeCheck className="w-3 h-3 mr-1" />
                  ) : null}
                  {partnerData?.profile?.verificationStatus === "verified" ? "Verified Partner" : 
                   partnerData?.profile?.verificationStatus === "pending" ? "Verification Pending" : "Unverified"}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-6">
                {/* Profile Card */}
                <Card>
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                      <Avatar className="h-24 w-24 border-2 border-border">
                        <AvatarImage 
                          src={partnerData?.profile?.profilePhoto} 
                          alt={partnerData?.core?.name || "Partner"} 
                        />
                        <AvatarFallback className="text-2xl">
                          {partnerData?.core?.name?.[0]?.toUpperCase() || <Briefcase />}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <CardTitle>{partnerData?.profile?.businessName || "Business Name"}</CardTitle>
                    <CardDescription>{partnerData?.core?.email}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Partner ID: {partnerData?.core?.id?.slice(0, 8)}
                    </p>
                    
                    <div className="flex justify-center space-x-2 mb-4">
                      {partnerData?.profile?.tags?.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleProfileImageUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Update Photo
                    </Button>
                  </CardContent>
                </Card>
                
                {/* Profile Form */}
                <Card>
                  <CardHeader>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="general">
                          <CircleUserRound className="h-4 w-4 mr-2" />
                          General
                        </TabsTrigger>
                        <TabsTrigger value="business">
                          <Briefcase className="h-4 w-4 mr-2" />
                          Business
                        </TabsTrigger>
                        <TabsTrigger value="services">
                          <Award className="h-4 w-4 mr-2" />
                          Services
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <TabsContent value="general" className="space-y-4 mt-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Full Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="John Doe" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input placeholder="john@example.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="+1 (234) 567-8901" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="profileVisibility"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Profile Visibility</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select visibility" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="public">Public (Anyone can view)</SelectItem>
                                    <SelectItem value="verified_users">Verified Users Only</SelectItem>
                                    <SelectItem value="private">Private (Only you)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Control who can see your business profile
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                        
                        <TabsContent value="business" className="space-y-4 mt-0">
                          <FormField
                            control={form.control}
                            name="businessName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Acme Services LLC" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Address</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="123 Main St, City, Country" 
                                    className="resize-none"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="yearsOfExperience"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Years of Experience</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="professionalDescription"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Professional Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Tell customers about your business..." 
                                    className="resize-none min-h-[120px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  This will be displayed on your public profile
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                        
                        <TabsContent value="services" className="space-y-4 mt-0">
                          <div className="bg-muted/50 p-4 rounded-lg mb-4">
                            <h3 className="font-medium mb-2">Your Service Categories</h3>
                            <div className="flex flex-wrap gap-2">
                              {partnerData?.profile?.servicesOffered?.map((service, index) => (
                                <Badge key={index} variant="secondary">
                                  <Tag className="h-3 w-3 mr-1 opacity-70" />
                                  {service}
                                </Badge>
                              ))}
                              {!partnerData?.profile?.servicesOffered?.length && (
                                <p className="text-sm text-muted-foreground">No services defined yet</p>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-4">
                            To add or update service categories, please contact our partner support team.
                            Your service offerings determine what types of add-ons you can create.
                          </p>
                          
                          <div className="space-y-4">
                            <h3 className="font-medium">Communication Preferences</h3>
                            <Separator />
                            
                            <FormField
                              control={form.control}
                              name="emailNotifications"
                              render={({ field }) => (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">Email Notifications</p>
                                    <p className="text-sm text-muted-foreground">
                                      Receive booking alerts and updates via email
                                    </p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="h-4 w-4"
                                  />
                                </div>
                              )}
                            />
                            
                            <Separator />
                            
                            <FormField
                              control={form.control}
                              name="smsNotifications"
                              render={({ field }) => (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">SMS Notifications</p>
                                    <p className="text-sm text-muted-foreground">
                                      Receive text messages for urgent updates
                                    </p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="h-4 w-4"
                                  />
                                </div>
                              )}
                            />
                            
                            <Separator />
                            
                            <FormField
                              control={form.control}
                              name="pushNotifications"
                              render={({ field }) => (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">Push Notifications</p>
                                    <p className="text-sm text-muted-foreground">
                                      Receive mobile app notifications
                                    </p>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="h-4 w-4"
                                  />
                                </div>
                              )}
                            />
                          </div>
                        </TabsContent>
                        
                        <div className="flex justify-end">
                          <Button 
                            type="submit" 
                            disabled={updateProfile.isPending}
                            className="w-full md:w-auto"
                          >
                            {updateProfile.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}