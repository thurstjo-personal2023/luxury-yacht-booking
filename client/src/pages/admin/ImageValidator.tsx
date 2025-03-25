/**
 * Image Validator Page
 * 
 * Admin page for validating images across the platform.
 * Uses withAdminLayout HOC for consistent admin layout integration.
 */
import { Button } from '@/components/ui/button';
import { ImageValidationReports } from '@/components/admin/ImageValidationReports';
import { useLocation } from 'wouter';
import withAdminLayout from '@/components/admin/withAdminLayout';
import { Helmet } from 'react-helmet';

function ImageValidator() {
  const [, navigate] = useLocation();

  return (
    <>
      <Helmet>
        <title>Image Validator - Etoile Yachts Admin</title>
      </Helmet>
      
      <div className="container mx-auto py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Image Validator</h1>
          <p className="text-muted-foreground">
            Validate image URLs across the platform to ensure they are accessible and properly formatted.
          </p>
        </div>
        
        <div className="mb-6 flex justify-between items-center">
          <div>
            <Button variant="outline" onClick={() => navigate('/admin-dashboard')}>
              ← Back to Admin Dashboard
            </Button>
          </div>
        </div>
        
        <div className="space-y-8">
          <ImageValidationReports />
        </div>
      </div>
    </>
  );
}

export default withAdminLayout(ImageValidator);