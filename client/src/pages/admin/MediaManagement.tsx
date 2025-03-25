import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import MediaValidationReports from '@/components/admin/MediaValidationReports';
import BrokenUrlRepair from '@/components/admin/BrokenUrlRepair';
import BlobUrlResolution from '@/components/admin/BlobUrlResolution';
import RelativeUrlFixer from '@/components/admin/RelativeUrlFixer';
// Import directly using relative path to fix TypeScript module resolution
import AdminLayout from '../../components/layouts/AdminLayout';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useLocation } from 'wouter';

export default function MediaManagement() {
  const { adminUser, isLoading, error } = useAdminAuth();
  const [, setLocation] = useLocation();
  
  // Show loading state
  if (isLoading) {
    return <div className="container mx-auto py-10">Loading authentication...</div>;
  }
  
  // Redirect if user is not authenticated or not an admin
  if (!adminUser) {
    setLocation('/admin-login');
    return null;
  }
  
  // Check admin role
  const adminRole = adminUser.role;
  const hasAccess = adminRole && ['SUPER_ADMIN', 'ADMIN', 'super_admin', 'admin'].includes(adminRole);
  
  if (!hasAccess) {
    setLocation('/admin-dashboard');
    return null;
  }
  
  // For now, let any user access the admin section
  // In production, we would check user's admin status
  // but we'll skip this check for development
  
  return (
    <AdminLayout>
      <Helmet>
        <title>Media Management | Etoile Yachts Admin</title>
      </Helmet>
      
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Media Management</h1>
          <p className="text-muted-foreground">
            Validate, repair, and optimize media content across the platform
          </p>
        </div>
        
        <div className="mb-6">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Best Practices</AlertTitle>
            <AlertDescription>
              Regular media validation helps maintain a consistent user experience. 
              Run validation weekly and address any issues promptly.
            </AlertDescription>
          </Alert>
        </div>
        
        <Tabs defaultValue="validation" className="space-y-4">
          <TabsList>
            <TabsTrigger value="validation">Media Validation</TabsTrigger>
            <TabsTrigger value="repair">URL Repair</TabsTrigger>
            <TabsTrigger value="blob">Blob Resolution</TabsTrigger>
            <TabsTrigger value="relative">Relative URLs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="validation" className="space-y-4">
            <MediaValidationReports />
          </TabsContent>
          
          <TabsContent value="repair" className="space-y-4">
            <BrokenUrlRepair />
          </TabsContent>
          
          <TabsContent value="blob" className="space-y-4">
            <BlobUrlResolution />
          </TabsContent>
          
          <TabsContent value="relative" className="space-y-4">
            <RelativeUrlFixer />
          </TabsContent>
        </Tabs>
        
        <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Media Type Validation</CardTitle>
              <CardDescription>
                Validates that media URLs match their declared content type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Identifies URLs where the content doesn't match the expected type,
                such as videos incorrectly identified as images.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Broken URL Detection</CardTitle>
              <CardDescription>
                Checks for inaccessible or broken external URLs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Identifies URLs that return 404, 500, or other error codes
                and allows replacing them with placeholders.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Blob URL Resolution</CardTitle>
              <CardDescription>
                Replaces temporary blob:// URLs with permanent media
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Blob URLs are temporary browser-based references that cannot
                be accessed across sessions or by other users.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Relative URL Fixing</CardTitle>
              <CardDescription>
                Converts relative URLs to absolute URLs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Relative URLs (like /images/yacht.jpg) can't be validated externally
                and must be converted to absolute URLs (https://domain.com/images/yacht.jpg).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}