/**
 * Media Validation Admin Page
 * 
 * This page provides access to the media validation panel for administrators.
 */

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import MediaValidationPanel from '@/components/MediaValidationPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const MediaValidationPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  
  // If user is not logged in
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Please log in to access the media validation tools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If user is not authorized 
  if (!(isAdmin || user.role === 'producer')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render the media validation panel
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Media Validation Tools</h1>
      </div>
      
      <div className="grid gap-6">
        <MediaValidationPanel />
      </div>
    </div>
  );
};

export default MediaValidationPage;