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
import { AlertCircle, ArrowLeft, Edit, User, RefreshCw, Shield } from 'lucide-react';
import { Link } from 'wouter';
import { syncAuthClaims } from '@/lib/user-profile-utils';
import { toast } from '@/hooks/use-toast';

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
  
  // Function to handle role synchronization
  const [syncingRole, setSyncingRole] = useState(false);
  
  const handleSyncRole = async () => {
    if (syncingRole) return;
    
    setSyncingRole(true);
    try {
      const result = await syncAuthClaims();
      
      if (result.success) {
        toast({
          title: "Role synchronized",
          description: result.message || "Your role has been synchronized successfully.",
          variant: "default",
        });
        
        // If roles were different, show more detailed information
        if (result.currentRole !== result.newRole) {
          toast({
            title: "Role updated",
            description: `Your role has been updated from ${result.currentRole || 'unknown'} to ${result.newRole || 'unknown'}.`,
            variant: "default",
          });
          
          // Force page reload to apply new permissions
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        toast({
          title: "Synchronization failed",
          description: result.message || "Failed to synchronize your role. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Role sync error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during role synchronization.",
        variant: "destructive",
      });
    } finally {
      setSyncingRole(false);
    }
  };
  
  // Get the role directly from user object or from harmonized user
  const userRole = user?.customClaims?.role || harmonizedUser?.role || 'unknown';
  
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
          <>
            <Button 
              variant="outline" 
              className="mr-2"
              onClick={handleSyncRole}
              disabled={syncingRole}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncingRole ? 'animate-spin' : ''}`} />
              {syncingRole ? 'Syncing...' : 'Sync Role'}
            </Button>
            
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </>
        )}
      </div>
      
      {/* Role information alert */}
      <Alert className="mb-6 max-w-4xl">
        <Shield className="h-4 w-4" />
        <AlertTitle>Current Role: {userRole}</AlertTitle>
        <AlertDescription>
          {userRole === 'producer' || userRole === 'partner' ? (
            'You have producer access to manage assets and listings.'
          ) : (
            'You have consumer access to browse and book experiences.'
          )}
          {' '}
          If you're experiencing permission issues, try the "Sync Role" button to synchronize your permissions.
        </AlertDescription>
      </Alert>
      
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