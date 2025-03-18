import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangleIcon, CheckCircleIcon, LinkIcon, ImageIcon, VideoIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface FixedUrl {
  docId: string;
  collection: string;
  field: string;
  fieldPath: string;
  oldUrl: string;
  newUrl: string;
}

interface FixReport {
  id: string;
  timestamp: string;
  createdAt: { seconds: number; nanoseconds: number };
  fixedUrls: FixedUrl[];
  collectionStats: Record<string, number>;
  totalRelativeUrls: number;
  totalFixed: number;
}

export function RelativeUrlFixer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get authentication token
  const getIdToken = async () => {
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken(true);
  };
  
  // Fetch fix reports
  const { data: fixReports, isLoading: isLoadingReports } = useQuery({
    queryKey: ['relative-url-reports'],
    queryFn: async () => {
      try {
        const token = await getIdToken();
        const response = await fetch('/api/admin/relative-url-reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch relative URL fix reports');
        
        const data = await response.json();
        return data.reports as FixReport[];
      } catch (err) {
        console.error('Error fetching relative URL fix reports:', err);
        throw err;
      }
    },
    enabled: !!user
  });
  
  // Mutation to fix relative URLs
  const fixMutation = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      const response = await fetch('/api/admin/fix-relative-urls', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fix relative URLs');
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['relative-url-reports'] });
      queryClient.invalidateQueries({ queryKey: ['media-validation-reports'] });
      
      toast({
        title: 'Relative URL Fix Completed',
        description: 'Relative URLs have been updated to absolute URLs.',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Relative URL Fix Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Get the most recent fix report
  const latestReport = fixReports && fixReports.length > 0 ? fixReports[0] : null;
  
  // Count of relative URLs found in latest report (if any)
  const relativeUrlCount = latestReport?.totalRelativeUrls || 0;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <LinkIcon className="mr-2 h-5 w-5" />
          Relative URL Fixer
        </CardTitle>
        <CardDescription>
          Convert relative URLs to absolute URLs for proper validation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingReports ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="mb-6">
              <Alert className={relativeUrlCount > 0 ? 'bg-amber-50' : 'bg-green-50'}>
                {latestReport ? (
                  relativeUrlCount > 0 ? (
                    <>
                      <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
                      <AlertTitle>Relative URLs Detected</AlertTitle>
                      <AlertDescription>
                        Found {relativeUrlCount} relative URLs in the latest scan that need to be fixed.
                      </AlertDescription>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      <AlertTitle>No Issues Found</AlertTitle>
                      <AlertDescription>
                        No relative URLs were detected in the latest scan.
                      </AlertDescription>
                    </>
                  )
                ) : (
                  <>
                    <AlertTriangleIcon className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Initial Scan Required</AlertTitle>
                    <AlertDescription>
                      Run a scan to detect and fix any relative URLs in the database.
                    </AlertDescription>
                  </>
                )}
              </Alert>
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <Button 
                onClick={() => fixMutation.mutate()}
                disabled={fixMutation.isPending}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {fixMutation.isPending ? 'Fixing URLs...' : 'Fix Relative URLs'}
              </Button>
              
              {latestReport && (
                <Badge variant={relativeUrlCount > 0 ? 'outline' : 'secondary'}>
                  {relativeUrlCount} relative URLs found
                </Badge>
              )}
            </div>
            
            {latestReport && latestReport.fixedUrls && latestReport.fixedUrls.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Latest Fix Report</h3>
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
                        Fixed {latestReport.totalFixed} of {latestReport.totalRelativeUrls} URLs
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">Collections</p>
                      <p className="text-lg">
                        {Object.keys(latestReport.collectionStats).length} collections affected
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
                      <TableHead>Old URL</TableHead>
                      <TableHead>New URL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestReport.fixedUrls.slice(0, 5).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.collection}</TableCell>
                        <TableCell className="font-mono text-xs">{item.docId.substring(0, 12)}...</TableCell>
                        <TableCell>{item.fieldPath}</TableCell>
                        <TableCell className="font-mono text-xs">{item.oldUrl}</TableCell>
                        <TableCell>
                          {item.newUrl.includes('video') ? (
                            <span className="flex items-center">
                              <VideoIcon className="h-4 w-4 mr-1" /> Video
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <ImageIcon className="h-4 w-4 mr-1" /> Image
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {latestReport.fixedUrls.length > 5 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          ...and {latestReport.fixedUrls.length - 5} more fixed URLs
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
          Relative URLs cannot be validated properly and must be converted to absolute URLs for proper testing and display.
        </p>
      </CardFooter>
    </Card>
  );
}

export default RelativeUrlFixer;