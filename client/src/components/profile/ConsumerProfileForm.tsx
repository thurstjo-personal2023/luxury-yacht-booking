/**
 * Consumer Profile Form
 * 
 * Allows consumers to edit their profile based on the harmonized user schema
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  address: z.string().optional(),
  preferences: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  accessibilityNeeds: z.array(z.string()).optional(),
  favoriteDestinations: z.array(z.string()).optional(),
  activityPreferences: z.array(z.string()).optional(),
  communicationPreferences: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional(),
    marketingEmails: z.boolean().optional()
  }).optional(),
  emergencyContact: z.object({
    name: z.string(),
    phoneNumber: z.string(),
    relationship: z.string().optional()
  }).optional()
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ConsumerProfileForm() {
  const { toast } = useToast();
  const { user, profileData, refreshUserData } = useAuthService();
  const { harmonizedUser, touristProfile } = profileData;
  const [isLoading, setIsLoading] = useState(false);
  const [newPreference, setNewPreference] = useState("");
  const [newDietary, setNewDietary] = useState("");
  const [newAccessibility, setNewAccessibility] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [newActivity, setNewActivity] = useState("");

  const onSubmit = async (values: ProfileFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      await refreshUserData();
      
      toast({
        title: "Success",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Form with default values from user profile
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: harmonizedUser?.name || "",
      phone: harmonizedUser?.phone || "",
      address: touristProfile?.address || "",
      preferences: touristProfile?.preferences || [],
      dietaryRestrictions: touristProfile?.dietaryRestrictions || [],
      accessibilityNeeds: touristProfile?.accessibilityNeeds || [],
      favoriteDestinations: touristProfile?.favoriteDestinations || [],
      activityPreferences: touristProfile?.activityPreferences || [],
      communicationPreferences: touristProfile?.communicationPreferences || {
        email: true,
        sms: true,
        push: true,
        marketingEmails: false
      },
      emergencyContact: touristProfile?.emergencyContact || {
        name: "",
        phoneNumber: "",
        relationship: ""
      }
    },
  });
  
  // Add a new preference tag
  const addPreference = () => {
    if (!newPreference) return;
    
    const currentPreferences = form.getValues("preferences") || [];
    if (!currentPreferences.includes(newPreference)) {
      form.setValue("preferences", [...currentPreferences, newPreference]);
    }
    
    setNewPreference("");
  };
  
  // Remove a preference tag
  const removePreference = (preference: string) => {
    const currentPreferences = form.getValues("preferences") || [];
    form.setValue("preferences", currentPreferences.filter(p => p !== preference));
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
      
      // Update tourist-specific profile data in user_profiles_tourist
      const touristProfileRef = doc(db, 'user_profiles_tourist', user.uid);
      
      if (touristProfile) {
        // Update existing profile
        await updateDoc(touristProfileRef, {
          preferences: data.preferences || [],
          lastUpdated: Timestamp.now()
        });
      } else {
        // Create new profile if it doesn't exist
        await setDoc(touristProfileRef, {
          id: user.uid,
          profilePhoto: '',
          loyaltyTier: 'Bronze',
          preferences: data.preferences || [],
          wishlist: [],
          bookingHistory: [],
          reviewsProvided: [],
          lastUpdated: Timestamp.now()
        });
      }
      
      // Refresh user data
      await refreshUserData();
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
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
          <CardTitle>Consumer Profile</CardTitle>
          <CardDescription>
            Update your profile information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={touristProfile?.profilePhoto || ""} alt={harmonizedUser?.name || "User"} />
              <AvatarFallback>{harmonizedUser?.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium">{harmonizedUser?.name || "User"}</h3>
              <p className="text-sm text-muted-foreground">{harmonizedUser?.email}</p>
              {touristProfile?.loyaltyTier && (
                <Badge variant="outline" className="mt-1">
                  {touristProfile.loyaltyTier} Member
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-6" />
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Travel Preferences</h3>
                
                <div className="flex flex-wrap gap-2">
                  {form.watch('preferences')?.map((pref, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {pref}
                      <button
                        type="button"
                        onClick={() => {
                          const current = form.getValues('preferences') || [];
                          form.setValue('preferences', current.filter((_, i) => i !== index));
                        }}
                        className="ml-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={newPreference}
                    onChange={(e) => setNewPreference(e.target.value)}
                    placeholder="Add a preference"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (newPreference.trim()) {
                        const current = form.getValues('preferences') || [];
                        form.setValue('preferences', [...current, newPreference.trim()]);
                        setNewPreference('');
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Dietary Restrictions */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dietary Restrictions</h3>
                <div className="flex flex-wrap gap-2">
                  {form.watch('dietaryRestrictions')?.map((restriction, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {restriction}
                      <button
                        type="button"
                        onClick={() => {
                          const current = form.getValues('dietaryRestrictions') || [];
                          form.setValue('dietaryRestrictions', current.filter((_, i) => i !== index));
                        }}
                        className="ml-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={newDietary}
                    onChange={(e) => setNewDietary(e.target.value)}
                    placeholder="Add dietary restriction"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (newDietary.trim()) {
                        const current = form.getValues('dietaryRestrictions') || [];
                        form.setValue('dietaryRestrictions', [...current, newDietary.trim()]);
                        setNewDietary('');
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Emergency Contact</h3>
                <FormField
                  control={form.control}
                  name="emergencyContact.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="emergencyContact.phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="emergencyContact.relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Communication Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Communication Preferences</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="communicationPreferences.email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Email Updates</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="communicationPreferences.sms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">SMS Notifications</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
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
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
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

              <div className="space-y-2">
                <FormLabel>Preferences</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.watch("preferences")?.map((preference) => (
                    <Badge key={preference} variant="secondary" className="flex items-center gap-1">
                      {preference}
                      <button
                        type="button"
                        onClick={() => removePreference(preference)}
                        className="text-muted-foreground hover:text-foreground transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newPreference}
                    onChange={(e) => setNewPreference(e.target.value)}
                    placeholder="Add new preference (e.g., 'Luxury', 'Family-friendly')"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={addPreference}
                    disabled={!newPreference}
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
                  "Update Profile"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}