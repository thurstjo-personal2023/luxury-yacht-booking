import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { ImageValidationReports } from '@/components/admin/ImageValidationReports';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

export function ImageValidator() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Check if user is producer (admin)
  // In a real app, this would check for a specific admin role
  const isAdmin = userRole === 'producer';
  
  if (!user) {
    toast({
      title: 'Unauthorized',
      description: 'Please log in to access this page.',
      variant: 'destructive'
    });
    navigate('/login');
    return null;
  }
  
  if (!isAdmin) {
    toast({
      title: 'Forbidden',
      description: 'You do not have permission to access this page.',
      variant: 'destructive'
    });
    navigate('/');
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