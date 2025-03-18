import React from 'react';
import { Helmet } from 'react-helmet';
import MediaValidationPanel from '@/components/admin/MediaValidationPanel';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

/**
 * Media Admin Page
 * 
 * This page hosts the media validation panel and other media management tools.
 * It's accessible only to users with admin privileges.
 */
const MediaAdmin: React.FC = () => {
  const { user, loading } = useAuth();
  
  // Check if user has admin privileges
  const isAdmin = user?.role === 'producer'; // Currently using 'producer' as admin
  
  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You need to be logged in to access this page.
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access this page.
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button asChild>
            <Link href="/">Go to Home</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Helmet>
        <title>Media Administration | Etoile Yachts</title>
      </Helmet>
      
      <div className="container mx-auto py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Media Administration</h1>
          
          <div className="grid grid-cols-1 gap-8">
            <MediaValidationPanel />
          </div>
        </div>
      </div>
    </>
  );
};

export default MediaAdmin;