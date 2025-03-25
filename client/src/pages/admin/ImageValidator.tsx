import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { ImageValidationReports } from '@/components/admin/ImageValidationReports';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useAdminAuth } from '@/hooks/use-admin-auth';

export function ImageValidator() {
  const { adminUser, isLoading, error } = useAdminAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Check admin authentication status
  if (!adminUser && !isLoading) {
    toast({
      title: 'Unauthorized',
      description: 'Please log in to access this admin page.',
      variant: 'destructive'
    });
    navigate('/admin-login');
    return null;
  }
  
  // Show loading state
  if (isLoading) {
    return <div className="container mx-auto py-10">Loading authentication...</div>;
  }
  
  // Check admin role - this is now using proper admin role check
  const adminRole = adminUser?.role;
  const hasAccess = adminRole && ['SUPER_ADMIN', 'ADMIN', 'super_admin', 'admin'].includes(adminRole);
  
  if (!hasAccess) {
    toast({
      title: 'Forbidden',
      description: 'You do not have permission to access this page.',
      variant: 'destructive'
    });
    navigate('/admin-dashboard');
    return null;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Image Validator</h1>
        <p className="text-muted-foreground">
          Validate image URLs across the platform to ensure they are accessible and properly formatted.
        </p>
      </div>
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </Button>
        </div>
      </div>
      
      <div className="space-y-8">
        <ImageValidationReports />
      </div>
    </div>
  );
}

export default ImageValidator;