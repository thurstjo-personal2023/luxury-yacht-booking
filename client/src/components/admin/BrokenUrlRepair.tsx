import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangleIcon, WrenchIcon, CheckCircleIcon, HammerIcon, ImageIcon, VideoIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface RepairedUrl {
  docId: string;
  collection: string;
  field: string;
  subField?: string;
  oldUrl: string;
  newUrl: string;
  mediaType?: 'image' | 'video' | 'unknown';
}

interface RepairReport {
  id: string;
  timestamp: string;
  createdAt: { seconds: number; nanoseconds: number };
  repairedUrls: RepairedUrl[];
  stats: {
    totalIdentified: number;
    totalRepaired: number;
    imageCount: number;
    videoCount: number;
    byCollection: Record<string, number>;
  };
}

export function BrokenUrlRepair() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get authentication token
  const getIdToken = async () => {
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken(true);
  };
  
  // Fetch the most recent validation report to get broken URL count
  const { data: latestValidation, isLoading: isLoadingValidation } = useQuery({
    queryKey: ['media-validation-reports'],
    queryFn: async () => {
      try {
        const token = await getIdToken();
        const response = await fetch('/api/admin/media-validation-reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch validation reports');
        
        const data = await response.json();
        if (data.reports && data.reports.length > 0) {
          return data.reports[0]; // Most recent report
        }
        return null;
      } catch (err) {
        console.error('Error fetching validation reports:', err);
        throw err;
      }
    },
    enabled: !!user
  });
  
  // Fetch repair reports
  const { data: repairReports, isLoading: isLoadingRepairs } = useQuery({
    queryKey: ['url-repair-reports'],
    queryFn: async () => {
      try {
        const token = await getIdToken();
        const response = await fetch('/api/admin/url-repair-reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch repair reports');
        
        const data = await response.json();
        return data.reports as RepairReport[];
      } catch (err) {
        console.error('Error fetching repair reports:', err);
        throw err;
      }
    },
    enabled: !!user
  });
  
  // Mutation to repair broken URLs
  const repairMutation = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      const response = await fetch('/api/admin/repair-broken-urls', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to repair broken URLs');
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['url-repair-reports'] });
      queryClient.invalidateQueries({ queryKey: ['media-validation-reports'] });
      
      toast({
        title: 'URL Repair Completed',
        description: 'Broken URLs have been replaced with placeholders.',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'URL Repair Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Calculate the number of broken URLs in the latest validation
  const brokenUrlCount = latestValidation?.stats?.invalidUrls || 0;
  
  // Get the most recent repair report
  const latestRepair = repairReports && repairReports.length > 0 ? repairReports[0] : null;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <WrenchIcon className="mr-2 h-5 w-5" />
          Broken URL Repair
        </CardTitle>
        <CardDescription>
          Fix broken external image and video URLs by replacing them with placeholders
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingValidation || isLoadingRepairs ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="mb-6">
              <Alert className={brokenUrlCount > 0 ? 'bg-amber-50' : 'bg-green-50'}>
                {brokenUrlCount > 0 ? (
                  <>
                    <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
                    <AlertTitle>Broken URLs Detected</AlertTitle>
                    <AlertDescription>
                      Found {brokenUrlCount} broken URLs in the latest validation report.
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    <AlertTitle>No Issues Found</AlertTitle>
                    <AlertDescription>
                      No broken URLs were detected in the latest validation report.
                    </AlertDescription>
                  </>
                )}
              </Alert>
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <Button 
                onClick={() => repairMutation.mutate()}
                disabled={repairMutation.isPending || brokenUrlCount === 0}
              >
                <HammerIcon className="mr-2 h-4 w-4" />
                {repairMutation.isPending ? 'Repairing...' : 'Repair Broken URLs'}
              </Button>
              
              <Badge variant={brokenUrlCount > 0 ? 'destructive' : 'outline'}>
                {brokenUrlCount} broken URLs
              </Badge>
            </div>
            
            {latestRepair && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Latest Repair Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">Date</p>
                      <p className="text-lg">
                        {new Date(latestRepair.createdAt.seconds * 1000).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">Results</p>
                      <p className="text-lg">
                        Fixed {latestRepair.stats.totalRepaired} of {latestRepair.stats.totalIdentified} URLs
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">Media Types</p>
                      <p className="text-lg">
                        <ImageIcon className="inline-block h-4 w-4 mr-1" /> {latestRepair.stats.imageCount} images, 
                        <VideoIcon className="inline-block h-4 w-4 mx-1" /> {latestRepair.stats.videoCount} videos
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                {latestRepair.repairedUrls.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Collection</TableHead>
                        <TableHead>Document ID</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {latestRepair.repairedUrls.slice(0, 5).map((repair, index) => (
                        <TableRow key={index}>
                          <TableCell>{repair.collection}</TableCell>
                          <TableCell className="font-mono text-xs">{repair.docId.substring(0, 12)}...</TableCell>
                          <TableCell>{repair.field}{repair.subField ? `.${repair.subField}` : ''}</TableCell>
                          <TableCell>
                            {repair.mediaType === 'video' ? (
                              <VideoIcon className="h-4 w-4" />
                            ) : (
                              <ImageIcon className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50">
                              <CheckCircleIcon className="h-3 w-3 mr-1" /> Repaired
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {latestRepair.repairedUrls.length > 5 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            ...and {latestRepair.repairedUrls.length - 5} more repairs
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          URL repair replaces broken external URLs with appropriate placeholder images or videos.
        </p>
      </CardFooter>
    </Card>
  );
}

export default BrokenUrlRepair;