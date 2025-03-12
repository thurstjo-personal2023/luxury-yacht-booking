/**
 * User Profile Form Component
 * 
 * This component provides a form for editing user profile data
 * based on the harmonized schema.
 */

import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/hooks/use-toast';
import { 
  updateUserCore, 
  updateTouristProfile, 
  updateServiceProviderProfile 
} from '@/lib/user-profile-utils';
import { HarmonizedUser, TouristProfile, ServiceProviderProfile } from '@shared/harmonized-user-schema';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

// Schema for core user information
const coreUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

// Schema for tourist profile information
const touristProfileSchema = z.object({
  profilePhoto: z.string().optional(),
  preferences: z.string().optional(),
});

// Schema for service provider profile information
const serviceProviderProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessAddress: z.string().min(5, 'Address must be at least 5 characters'),
  servicesOffered: z.string().min(3, 'Services offered is required'),
  certifications: z.string().optional(),
  professionalDescription: z.string().optional(),
  yearsOfExperience: z.string().optional(),
  profilePhoto: z.string().optional(),
});

// Types for form values
type CoreUserFormValues = z.infer<typeof coreUserSchema>;
type TouristProfileFormValues = z.infer<typeof touristProfileSchema>;
type ServiceProviderFormValues = z.infer<typeof serviceProviderProfileSchema>;

interface UserProfileFormProps {
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function UserProfileForm({ onCancel, onSuccess }: UserProfileFormProps) {
  const { user, harmonizedUser, touristProfile, serviceProviderProfile, refreshUserData } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle the case where there's no user data
  if (!user || !harmonizedUser) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">No user profile data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Tab management
  const [activeTab, setActiveTab] = useState('core');
  
  // Set up forms
  const coreForm = useForm<CoreUserFormValues>({
    resolver: zodResolver(coreUserSchema),
    defaultValues: {
      name: harmonizedUser.name || '',
      phone: harmonizedUser.phone || '',
    },
  });
  
  const touristForm = useForm<TouristProfileFormValues>({
    resolver: zodResolver(touristProfileSchema),
    defaultValues: {
      profilePhoto: touristProfile?.profilePhoto || '',
      preferences: touristProfile?.preferences?.join(', ') || '',
    },
  });
  
  const providerForm = useForm<ServiceProviderFormValues>({
    resolver: zodResolver(serviceProviderProfileSchema),
    defaultValues: {
      businessName: serviceProviderProfile?.businessName || '',
      businessAddress: serviceProviderProfile?.contactInformation?.address || '',
      servicesOffered: serviceProviderProfile?.servicesOffered?.join(', ') || '',
      certifications: serviceProviderProfile?.certifications?.join(', ') || '',
      professionalDescription: serviceProviderProfile?.professionalDescription || '',
      yearsOfExperience: serviceProviderProfile?.yearsOfExperience?.toString() || '',
      profilePhoto: serviceProviderProfile?.profilePhoto || '',
    },
  });
  
  // Handle core form submission
  const onSubmitCore = async (values: CoreUserFormValues) => {
    setIsSubmitting(true);
    try {
      // Update core user data
      const success = await updateUserCore({
        name: values.name,
        phone: values.phone || '',
      });
      
      if (success) {
        toast({
          title: 'Profile updated',
          description: 'Your core profile information has been updated successfully.',
        });
        await refreshUserData();
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: 'Error updating profile',
          description: 'There was a problem updating your profile. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating core profile:', error);
      toast({
        title: 'Error updating profile',
        description: 'There was a problem updating your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle tourist profile submission
  const onSubmitTourist = async (values: TouristProfileFormValues) => {
    setIsSubmitting(true);
    try {
      // Parse preferences from comma-separated string
      const preferences = values.preferences 
        ? values.preferences.split(',').map(p => p.trim()).filter(p => p)
        : [];
      
      // Update tourist profile
      const success = await updateTouristProfile({
        profilePhoto: values.profilePhoto || '',
        preferences,
      });
      
      if (success) {
        toast({
          title: 'Profile updated',
          description: 'Your consumer profile has been updated successfully.',
        });
        await refreshUserData();
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: 'Error updating profile',
          description: 'There was a problem updating your profile. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating tourist profile:', error);
      toast({
        title: 'Error updating profile',
        description: 'There was a problem updating your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle service provider profile submission
  const onSubmitProvider = async (values: ServiceProviderFormValues) => {
    setIsSubmitting(true);
    try {
      // Parse comma-separated strings into arrays
      const servicesOffered = values.servicesOffered
        ? values.servicesOffered.split(',').map(s => s.trim()).filter(s => s)
        : [];
      
      const certifications = values.certifications
        ? values.certifications.split(',').map(c => c.trim()).filter(c => c)
        : [];
      
      // Parse numeric values
      const yearsOfExperience = values.yearsOfExperience 
        ? parseInt(values.yearsOfExperience, 10) 
        : undefined;
      
      // Update provider profile
      const success = await updateServiceProviderProfile({
        businessName: values.businessName,
        contactInformation: {
          address: values.businessAddress,
        },
        servicesOffered,
        certifications,
        professionalDescription: values.professionalDescription,
        yearsOfExperience: isNaN(yearsOfExperience as number) ? undefined : yearsOfExperience,
        profilePhoto: values.profilePhoto || '',
      });
      
      if (success) {
        toast({
          title: 'Profile updated',
          description: 'Your service provider profile has been updated successfully.',
        });
        await refreshUserData();
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: 'Error updating profile',
          description: 'There was a problem updating your profile. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating service provider profile:', error);
      toast({
        title: 'Error updating profile',
        description: 'There was a problem updating your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={harmonizedUser.role === 'consumer' 
              ? touristProfile?.profilePhoto 
              : serviceProviderProfile?.profilePhoto} 
              alt={harmonizedUser.name} />
            <AvatarFallback>
              {harmonizedUser.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Badge variant="outline" className="mr-2">
                {harmonizedUser.role.charAt(0).toUpperCase() + harmonizedUser.role.slice(1)}
              </Badge>
              {harmonizedUser.emailVerified && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Verified
                </Badge>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="core">Basic Information</TabsTrigger>
            <TabsTrigger value="role-specific">
              {harmonizedUser.role === 'consumer' ? 'Consumer Profile' : 'Service Provider'}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="core">
            <Form {...coreForm}>
              <form onSubmit={coreForm.handleSubmit(onSubmitCore)} className="space-y-6">
                <FormField
                  control={coreForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={coreForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your phone number" {...field} />
                      </FormControl>
                      <FormDescription>
                        This will be used for contact purposes only.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  {onCancel && (
                    <Button variant="outline" type="button" onClick={onCancel}>
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="role-specific">
            {harmonizedUser.role === 'consumer' ? (
              <Form {...touristForm}>
                <form onSubmit={touristForm.handleSubmit(onSubmitTourist)} className="space-y-6">
                  <FormField
                    control={touristForm.control}
                    name="profilePhoto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Photo URL</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter profile photo URL" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter a URL to your profile photo.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={touristForm.control}
                    name="preferences"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferences</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your preferences (comma-separated)" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Enter your preferences separated by commas (e.g., "Luxury, Adventure, Fishing").
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    {onCancel && (
                      <Button variant="outline" type="button" onClick={onCancel}>
                        Cancel
                      </Button>
                    )}
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <Form {...providerForm}>
                <form onSubmit={providerForm.handleSubmit(onSubmitProvider)} className="space-y-6">
                  <FormField
                    control={providerForm.control}
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
                    control={providerForm.control}
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
                    control={providerForm.control}
                    name="servicesOffered"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Services Offered</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter services offered (comma-separated)" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the services you offer separated by commas (e.g., "Yacht Rental, Fishing Tours, Diving").
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={providerForm.control}
                    name="certifications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certifications</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter certifications (comma-separated)" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Enter your certifications separated by commas (e.g., "Yacht Master, Diving Instructor").
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={providerForm.control}
                    name="professionalDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professional Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter a description of your business and services" 
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={providerForm.control}
                    name="yearsOfExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years of Experience</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter years of experience" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={providerForm.control}
                    name="profilePhoto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Photo URL</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter profile photo URL" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter a URL to your logo or profile photo.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    {onCancel && (
                      <Button variant="outline" type="button" onClick={onCancel}>
                        Cancel
                      </Button>
                    )}
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
        <div>
          User ID: {user.uid}
        </div>
      </CardFooter>
    </Card>
  );
}