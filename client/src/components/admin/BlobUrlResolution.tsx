import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangleIcon, CheckCircleIcon, LinkIcon, ImageIcon, VideoIcon, DatabaseIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface ResolvedUrl {
  docId: string;
  collection: string;
  field: string;
  arrayIndex?: number;
  oldUrl: string;
  newUrl: string;
}

interface ResolutionReport {
  id: string;
  timestamp: string;
  createdAt: { seconds: number; nanoseconds: number };
  resolvedUrls: ResolvedUrl[];
  collectionStats: Record<string, number>;
  totalIdentified: number;
  totalResolved: number;
  stats: {
    imageCount: number;
    videoCount: number;
  };
}

export function BlobUrlResolution() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get authentication token
  const getIdToken = async () => {
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken(true);
  };
  
  // Fetch resolution reports
  const { data: resolutionReports, isLoading: isLoadingReports } = useQuery({
    queryKey: ['blob-url-reports'],
    queryFn: async () => {
      try {
        const token = await getIdToken();
        const response = await fetch('/api/admin/blob-url-reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch blob URL resolution reports');
        
        const data = await response.json();
        return data.reports as ResolutionReport[];
      } catch (err) {
        console.error('Error fetching blob URL resolution reports:', err);
        throw err;
      }
    },
    enabled: !!user
  });
  
  // Mutation to resolve blob URLs
  const resolveMutation = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      const response = await fetch('/api/admin/resolve-blob-urls', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to resolve blob URLs');
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['blob-url-reports'] });
      
      toast({
        title: 'Blob URL Resolution Completed',
        description: 'Blob URLs have been replaced with permanent placeholders.',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Blob URL Resolution Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Get the most recent resolution report
  const latestReport = resolutionReports && resolutionReports.length > 0 ? resolutionReports[0] : null;
  
  // Count of blob URLs found in latest report (if any)
  const blobUrlCount = latestReport?.totalIdentified || 0;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <LinkIcon className="mr-2 h-5 w-5" />
          Blob URL Resolution
        </CardTitle>
        <CardDescription>
          Replace temporary blob:// URLs with permanent media placeholders
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingReports ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="mb-6">
              <Alert className={blobUrlCount > 0 ? 'bg-amber-50' : 'bg-green-50'}>
                {latestReport ? (
                  blobUrlCount > 0 ? (
                    <>
                      <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
                      <AlertTitle>Temporary URLs Detected</AlertTitle>
                      <AlertDescription>
                        Found {blobUrlCount} blob URLs in the latest scan that need to be resolved.
                      </AlertDescription>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      <AlertTitle>No Issues Found</AlertTitle>
                      <AlertDescription>
                        No blob URLs were detected in the latest scan.
                      </AlertDescription>
                    </>
                  )
                ) : (
                  <>
                    <AlertTriangleIcon className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Initial Scan Required</AlertTitle>
                    <AlertDescription>
                      Run a scan to detect and resolve any blob URLs in the database.
                    </AlertDescription>
                  </>
                )}
              </Alert>
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <Button 
                onClick={() => resolveMutation.mutate()}
                disabled={resolveMutation.isPending}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {resolveMutation.isPending ? 'Resolving...' : 'Resolve Blob URLs'}
              </Button>
              
              {latestReport && (
                <Badge variant={blobUrlCount > 0 ? 'outline' : 'secondary'}>
                  {blobUrlCount} blob URLs found
                </Badge>
              )}
            </div>
            
            {latestReport && latestReport.resolvedUrls.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Latest Resolution Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">Date</p>
                      <p className="text-lg">
                        {new Date(latestReport.createdAt.seconds * 1000).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">Results</p>
                      <p className="text-lg">
                        Fixed {latestReport.totalResolved} of {latestReport.totalIdentified} URLs
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">Media Types</p>
                      <p className="text-lg">
                        <ImageIcon className="inline-block h-4 w-4 mr-1" /> {latestReport.stats.imageCount} images, 
                        <VideoIcon className="inline-block h-4 w-4 mx-1" /> {latestReport.stats.videoCount} videos
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collection</TableHead>
                      <TableHead>Document ID</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestReport.resolvedUrls.slice(0, 5).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.collection}</TableCell>
                        <TableCell className="font-mono text-xs">{item.docId.substring(0, 12)}...</TableCell>
                        <TableCell>
                          {item.field}
                          {item.arrayIndex !== undefined ? `[${item.arrayIndex}]` : ''}
                        </TableCell>
                        <TableCell>
                          {item.newUrl.includes('video') ? (
                            <VideoIcon className="h-4 w-4" />
                          ) : (
                            <ImageIcon className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50">
                            <CheckCircleIcon className="h-3 w-3 mr-1" /> Resolved
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {latestReport.resolvedUrls.length > 5 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          ...and {latestReport.resolvedUrls.length - 5} more resolved URLs
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                
                {Object.keys(latestReport.collectionStats).length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold mb-2">Collection Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(latestReport.collectionStats).map(([collection, count]) => (
                        <Badge key={collection} variant="outline" className="p-2 justify-between">
                          <span className="truncate">{collection}</span>
                          <span className="ml-2 font-semibold">{count}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Blob URLs are temporary references created when users directly paste images and cannot be accessed outside the browser session.
        </p>
      </CardFooter>
    </Card>
  );
}

export default BlobUrlResolution;