/**
 * User Profile Page
 * 
 * This page displays and allows editing of the user's profile
 * using the harmonized user schema.
 */

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { UserProfileDisplay } from '@/components/profile/UserProfileDisplay';
import { UserProfileForm } from '@/components/profile/UserProfileForm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Edit, User } from 'lucide-react';
import { Link } from 'wouter';

export default function ProfilePage() {
  const { user, loading, harmonizedUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  // Handle loading state
  if (loading) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <div className="spinner">Loading...</div>
      </div>
    );
  }
  
  // Handle not logged in
  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not logged in</AlertTitle>
          <AlertDescription>
            You need to be logged in to view your profile.
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center mt-6">
          <Button asChild>
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  // Handle no profile data
  if (!harmonizedUser) {
    return (
      <div className="container mx-auto py-10">
        <Alert className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Profile not found</AlertTitle>
          <AlertDescription>
            Your profile data could not be found. Please contact support.
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center mt-6">
          <Button asChild variant="outline">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center">
        <Button variant="outline" className="mr-auto" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>
      
      {isEditing ? (
        <UserProfileForm 
          onCancel={() => setIsEditing(false)}
          onSuccess={() => setIsEditing(false)}
        />
      ) : (
        <UserProfileDisplay showPrivateInfo={true} />
      )}
    </div>
  );
}