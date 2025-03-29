import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useAuthService } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { IconButton } from '@/components/ui/icon-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Plus, X, Save } from 'lucide-react';

const profileSchema = z.object({
  // Basic Information
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  profilePhoto: z.string().optional(),

  // Demographics
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),

  // Account Preferences
  preferredLanguage: z.string().optional(),
  preferredCurrency: z.string().optional(),

  // Travel Preferences
  activityPreferences: z.array(z.string()).default([]),
  dietaryRestrictions: z.array(z.string()).default([]),
  accessibilityNeeds: z.array(z.string()).default([]),
  favoriteDestinations: z.array(z.string()).default([]),

  // Emergency Contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),

  // Payment Information
  billingAddress: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ConsumerProfileForm() {
  const { toast } = useToast();
  const { user, profileData, refreshUserData } = useAuthService();
  const { harmonizedUser, touristProfile } = profileData || {};
  const [isLoading, setIsLoading] = useState(false);
  const [formValues, setFormValues] = useState<Partial<ProfileFormValues>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (harmonizedUser && touristProfile) {
      setFormValues({
        name: harmonizedUser.name || '',
        email: harmonizedUser.email || '',
        phone: harmonizedUser.phone || '',
        profilePhoto: touristProfile.profilePhoto || '',
        dateOfBirth: touristProfile.dateOfBirth || '',
        gender: touristProfile.gender || '',
        nationality: touristProfile.nationality || '',
        preferredLanguage: touristProfile.preferredLanguage || '',
        preferredCurrency: touristProfile.preferredCurrency || '',
        activityPreferences: touristProfile.activityPreferences || [],
        dietaryRestrictions: touristProfile.dietaryRestrictions || [],
        accessibilityNeeds: touristProfile.accessibilityNeeds || [],
        favoriteDestinations: touristProfile.favoriteDestinations || [],
        emergencyContactName: touristProfile.emergencyContact?.name || '',
        emergencyContactPhone: touristProfile.emergencyContact?.phone || '',
        billingAddress: touristProfile.billingAddress || '',
      });
    }
  }, [harmonizedUser, touristProfile]);

  const handleFieldChange = (field: string, value: any) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues)
      });

      if (!response.ok) throw new Error('Failed to update profile');

      await refreshUserData();
      setHasChanges(false);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Basic Information */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={formValues.name || ''}
                    onChange={e => handleFieldChange('name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={formValues.email || ''}
                    onChange={e => handleFieldChange('email', e.target.value)}
                    placeholder="Enter your email"
                    type="email"
                    disabled
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={formValues.phone || ''}
                    onChange={e => handleFieldChange('phone', e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Demographics */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Demographics</h3>
              <div className="grid gap-4">
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={formValues.dateOfBirth || ''}
                    onChange={e => handleFieldChange('dateOfBirth', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select
                    value={formValues.gender}
                    onValueChange={value => handleFieldChange('gender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nationality</Label>
                  <Input
                    value={formValues.nationality || ''}
                    onChange={e => handleFieldChange('nationality', e.target.value)}
                    placeholder="Enter your nationality"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Account Preferences */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Account Preferences</h3>
              <div className="grid gap-4">
                <div>
                  <Label>Preferred Language</Label>
                  <Select
                    value={formValues.preferredLanguage}
                    onValueChange={value => handleFieldChange('preferredLanguage', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Preferred Currency</Label>
                  <Select
                    value={formValues.preferredCurrency}
                    onValueChange={value => handleFieldChange('preferredCurrency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <Separator />

            {/* Emergency Contact */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
              <div className="grid gap-4">
                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={formValues.emergencyContactName || ''}
                    onChange={e => handleFieldChange('emergencyContactName', e.target.value)}
                    placeholder="Emergency contact name"
                  />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input
                    value={formValues.emergencyContactPhone || ''}
                    onChange={e => handleFieldChange('emergencyContactPhone', e.target.value)}
                    placeholder="Emergency contact phone"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}