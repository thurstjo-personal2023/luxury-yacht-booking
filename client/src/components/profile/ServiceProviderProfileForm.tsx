/**
 * Service Provider Profile Form
 * 
 * Allows producers/partners to edit their profile based on the harmonized user schema
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuthService } from "@/services/auth";
import { doc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Plus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Profile data validation schema
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(6, "Phone number must be at least 6 characters"),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  businessAddress: z.string().min(5, "Address must be at least 5 characters"),
  servicesOffered: z.array(z.string()).min(1, "Add at least one service"),
  certifications: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  yearsOfExperience: z.coerce.number().min(0, "Years must be a positive number").optional(),
  professionalDescription: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ServiceProviderProfileForm() {
  const { toast } = useToast();
  const { user, profileData, refreshUserData } = useAuthService();
  const { harmonizedUser, serviceProviderProfile } = profileData;
  const [isLoading, setIsLoading] = useState(false);
  const [newService, setNewService] = useState("");
  const [newCertification, setNewCertification] = useState("");
  const [newTag, setNewTag] = useState("");

  // Form with default values from user profile
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: harmonizedUser?.name || "",
      phone: harmonizedUser?.phone || "",
      businessName: serviceProviderProfile?.businessName || "",
      businessAddress: serviceProviderProfile?.contactInformation?.address || "",
      servicesOffered: serviceProviderProfile?.servicesOffered || [],
      certifications: serviceProviderProfile?.certifications || [],
      tags: serviceProviderProfile?.tags || [],
      yearsOfExperience: serviceProviderProfile?.yearsOfExperience || 0,
      professionalDescription: serviceProviderProfile?.professionalDescription || "",
    },
  });
  
  // Add a new service
  const addService = () => {
    if (!newService) return;
    
    const currentServices = form.getValues("servicesOffered") || [];
    if (!currentServices.includes(newService)) {
      form.setValue("servicesOffered", [...currentServices, newService]);
    }
    
    setNewService("");
  };
  
  // Remove a service
  const removeService = (service: string) => {
    const currentServices = form.getValues("servicesOffered") || [];
    form.setValue("servicesOffered", currentServices.filter(s => s !== service));
  };
  
  // Add a new certification
  const addCertification = () => {
    if (!newCertification) return;
    
    const currentCertifications = form.getValues("certifications") || [];
    if (!currentCertifications.includes(newCertification)) {
      form.setValue("certifications", [...currentCertifications, newCertification]);
    }
    
    setNewCertification("");
  };
  
  // Remove a certification
  const removeCertification = (certification: string) => {
    const currentCertifications = form.getValues("certifications") || [];
    form.setValue("certifications", currentCertifications.filter(c => c !== certification));
  };
  
  // Add a new tag
  const addTag = () => {
    if (!newTag) return;
    
    const currentTags = form.getValues("tags") || [];
    if (!currentTags.includes(newTag)) {
      form.setValue("tags", [...currentTags, newTag]);
    }
    
    setNewTag("");
  };
  
  // Remove a tag
  const removeTag = (tag: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(t => t !== tag));
  };

  // Form submission handler
  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update your profile",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update core user data in harmonized_users
      const coreUpdates = {
        name: data.name,
        phone: data.phone,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(doc(db, 'harmonized_users', user.uid), coreUpdates);
      
      // Update provider-specific profile data
      const providerProfileRef = doc(db, 'user_profiles_service_provider', user.uid);
      
      const providerUpdates = {
        providerId: user.uid,
        businessName: data.businessName,
        contactInformation: {
          address: data.businessAddress
        },
        servicesOffered: data.servicesOffered,
        certifications: data.certifications || [],
        tags: data.tags || [],
        yearsOfExperience: data.yearsOfExperience,
        professionalDescription: data.professionalDescription || "",
        lastUpdated: Timestamp.now()
      };
      
      if (serviceProviderProfile) {
        // Update existing profile
        await updateDoc(providerProfileRef, providerUpdates);
      } else {
        // Create new profile if it doesn't exist
        await setDoc(providerProfileRef, {
          ...providerUpdates,
          profilePhoto: '',
          ratings: 0,
        });
      }
      
      // Refresh user data
      await refreshUserData();
      
      toast({
        title: "Profile updated",
        description: "Your business profile has been updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error updating profile",
        description: error.message || "An error occurred while updating your profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Provider Profile</CardTitle>
          <CardDescription>
            Update your business profile and service offerings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={serviceProviderProfile?.profilePhoto || ""} alt={harmonizedUser?.name || "Business"} />
              <AvatarFallback>{serviceProviderProfile?.businessName?.charAt(0) || "B"}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium">
                {serviceProviderProfile?.businessName || harmonizedUser?.name || "Business"}
              </h3>
              <p className="text-sm text-muted-foreground">{harmonizedUser?.email}</p>
              {serviceProviderProfile?.ratings !== undefined && (
                <div className="flex items-center mt-1">
                  <Badge variant="outline">
                    {serviceProviderProfile.ratings.toFixed(1)} ★
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner/Manager Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="Enter your phone number" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your business name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your business address" {...field} />
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
                        min="0"
                        placeholder="Enter years of experience" 
                        {...field} 
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
                        placeholder="Describe your business and services offered" 
                        className="min-h-32"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      This description will appear on your public profile.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Services Offered</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.watch("servicesOffered")?.map((service) => (
                    <Badge key={service} variant="secondary" className="flex items-center gap-1">
                      {service}
                      <button
                        type="button"
                        onClick={() => removeService(service)}
                        className="text-muted-foreground hover:text-foreground transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    placeholder="Add new service (e.g., 'Yacht Charter', 'Private Dining')"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={addService}
                    disabled={!newService}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage>{form.formState.errors.servicesOffered?.message}</FormMessage>
              </div>

              <div className="space-y-2">
                <FormLabel>Certifications</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.watch("certifications")?.map((certification) => (
                    <Badge key={certification} variant="outline" className="flex items-center gap-1">
                      {certification}
                      <button
                        type="button"
                        onClick={() => removeCertification(certification)}
                        className="text-muted-foreground hover:text-foreground transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newCertification}
                    onChange={(e) => setNewCertification(e.target.value)}
                    placeholder="Add certification (e.g., 'ISO 9001', 'Luxury Certified')"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={addCertification}
                    disabled={!newCertification}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel>Tags</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.watch("tags")?.map((tag) => (
                    <Badge key={tag} variant="default" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-primary-foreground hover:text-primary-foreground/80 transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag (e.g., 'luxury', 'yacht')"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={addTag}
                    disabled={!newTag}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Business Profile"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}