/**
 * User Profile Display Component
 * 
 * This component renders a user's profile information based on the harmonized schema.
 * It supports both consumer and producer/partner profiles.
 */

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatTimestamp, getTimestampAge } from '@/lib/user-profile-utils';
import { HarmonizedUser, TouristProfile, ServiceProviderProfile } from '@shared/harmonized-user-schema';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  User, Mail, Phone, Calendar, Star, Award, 
  Briefcase, Tag, CheckCircle, BookOpen, MapPin
} from 'lucide-react';

interface UserProfileDisplayProps {
  harmonizedUser?: HarmonizedUser | null;
  touristProfile?: TouristProfile | null;
  serviceProviderProfile?: ServiceProviderProfile | null;
  showPrivateInfo?: boolean;
  onEdit?: () => void;
}

export function UserProfileDisplay({
  harmonizedUser,
  touristProfile,
  serviceProviderProfile,
  showPrivateInfo = false,
  onEdit
}: UserProfileDisplayProps) {
  const { user } = useAuth();
  
  // If no user data provided, use from auth context
  const auth = useAuth();
  const userData = harmonizedUser || auth.harmonizedUser;
  const consumerProfile = touristProfile || auth.touristProfile;
  const producerProfile = serviceProviderProfile || auth.serviceProviderProfile;
  
  if (!userData) {
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
  
  // Determine if this is the current user's profile
  const isCurrentUser = user && user.uid === userData.id;
  
  // Only show edit button if this is the current user's profile
  const canEdit = isCurrentUser && onEdit;
  
  // Get profile image based on role
  const getProfileImage = () => {
    if (userData.role === 'consumer' && consumerProfile?.profilePhoto) {
      return consumerProfile.profilePhoto;
    } else if ((userData.role === 'producer' || userData.role === 'partner') && producerProfile?.profilePhoto) {
      return producerProfile.profilePhoto;
    }
    return '';
  };
  
  // Get display name based on role
  const getDisplayName = () => {
    if ((userData.role === 'producer' || userData.role === 'partner') && producerProfile?.businessName) {
      return producerProfile.businessName;
    }
    return userData.name;
  };
  
  // Get role badge color
  const getRoleBadgeColor = () => {
    switch (userData.role) {
      case 'consumer': return 'bg-blue-100 text-blue-800';
      case 'producer': return 'bg-green-100 text-green-800';
      case 'partner': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Format the role name with proper capitalization
  const formatRoleName = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="relative">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={getProfileImage()} alt={getDisplayName()} />
            <AvatarFallback>
              {userData.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{getDisplayName()}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Badge variant="outline" className={`${getRoleBadgeColor()} mr-2`}>
                {formatRoleName(userData.role)}
              </Badge>
              {userData.emailVerified && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Verified
                </Badge>
              )}
            </CardDescription>
          </div>
          
          {canEdit && (
            <Button 
              variant="outline" 
              className="absolute top-6 right-6"
              onClick={onEdit}
            >
              Edit Profile
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Core User Information */}
          <div>
            <h3 className="text-lg font-medium mb-2">Contact Information</h3>
            <div className="space-y-2">
              {userData.email && (
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{userData.email}</span>
                </div>
              )}
              
              {userData.phone && (
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{userData.phone}</span>
                </div>
              )}
              
              {showPrivateInfo && (
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Member since {formatTimestamp(userData.createdAt)}</span>
                </div>
              )}
            </div>
          </div>
          
          <Separator />
          
          {/* Role-Specific Information */}
          {userData.role === 'consumer' && consumerProfile && (
            <div>
              <h3 className="text-lg font-medium mb-2">Consumer Profile</h3>
              <div className="space-y-2">
                {consumerProfile.loyaltyTier && (
                  <div className="flex items-center text-sm">
                    <Award className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Loyalty Tier: <Badge variant="secondary">{consumerProfile.loyaltyTier}</Badge></span>
                  </div>
                )}
                
                {showPrivateInfo && consumerProfile.preferences && consumerProfile.preferences.length > 0 && (
                  <div>
                    <div className="flex items-center text-sm mb-1">
                      <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Preferences:</span>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-6">
                      {consumerProfile.preferences.map((pref, idx) => (
                        <Badge key={idx} variant="outline">{pref}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {showPrivateInfo && consumerProfile.wishlist && consumerProfile.wishlist.length > 0 && (
                  <div className="flex items-center text-sm">
                    <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Wishlist: {consumerProfile.wishlist.length} items</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {(userData.role === 'producer' || userData.role === 'partner') && producerProfile && (
            <div>
              <h3 className="text-lg font-medium mb-2">Service Provider Profile</h3>
              <div className="space-y-2">
                {producerProfile.servicesOffered && producerProfile.servicesOffered.length > 0 && (
                  <div>
                    <div className="flex items-center text-sm mb-1">
                      <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Services:</span>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-6">
                      {producerProfile.servicesOffered.map((service, idx) => (
                        <Badge key={idx} variant="secondary">{service}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {producerProfile.ratings && (
                  <div className="flex items-center text-sm">
                    <Star className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Rating: {producerProfile.ratings} stars</span>
                  </div>
                )}
                
                {producerProfile.yearsOfExperience && (
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{producerProfile.yearsOfExperience} years of experience</span>
                  </div>
                )}
                
                {producerProfile.professionalDescription && (
                  <div className="mt-2">
                    <div className="text-sm text-muted-foreground mb-1">About:</div>
                    <p className="text-sm">{producerProfile.professionalDescription}</p>
                  </div>
                )}
                
                {producerProfile.contactInformation?.address && (
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{producerProfile.contactInformation.address}</span>
                  </div>
                )}
                
                {producerProfile.certifications && producerProfile.certifications.length > 0 && (
                  <div>
                    <div className="flex items-center text-sm mb-1">
                      <CheckCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Certifications:</span>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-6">
                      {producerProfile.certifications.map((cert, idx) => (
                        <Badge key={idx} variant="outline">{cert}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
        <div className="w-full flex justify-between">
          <span>
            ID: {userData.id}
          </span>
          {userData.updatedAt && (
            <span>
              Last updated: {getTimestampAge(userData.updatedAt)}
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}