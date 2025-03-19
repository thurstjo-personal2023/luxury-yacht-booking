/**
 * Admin Media Validation Page
 * 
 * This page renders the media validation panel for admin users.
 */
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import MediaValidationPanel from '@/components/admin/MediaValidationPanel';
import AdminLayout from '@/components/layouts/AdminLayout';

const MediaValidationPage: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();
  const { toast } = useToast();
  
  // Set up navigation
  const [, setLocation] = useLocation();
  
  // Redirect non-admin users
  if (!loading && (!user || !isAdmin)) {
    toast({
      title: 'Access Denied',
      description: 'You must be an admin to access this page',
      variant: 'destructive'
    });
    setLocation('/');
    return null;
  }
  
  // Show loading state if auth is still loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <>
      <Helmet>
        <title>Media Validation - Etoile Yachts Admin</title>
      </Helmet>
      
      <AdminLayout>
        <MediaValidationPanel />
      </AdminLayout>
    </>
  );
};

export default MediaValidationPage;