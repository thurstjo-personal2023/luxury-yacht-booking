import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import MediaValidationReports from '@/components/admin/MediaValidationReports';
import BrokenUrlRepair from '@/components/admin/BrokenUrlRepair';
import BlobUrlResolution from '@/components/admin/BlobUrlResolution';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useAuth } from '@/hooks/use-auth';
import { Navigate } from 'wouter';

export default function MediaManagement() {
  const { user, isAdmin } = useAuth();
  
  // Redirect if user is not authenticated or not an admin
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }
  
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
        </Tabs>
        
        <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </div>
    </AdminLayout>
  );
}