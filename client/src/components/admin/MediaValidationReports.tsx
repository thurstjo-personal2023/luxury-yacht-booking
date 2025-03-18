import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ImageIcon, 
  VideoIcon, 
  AlertTriangleIcon, 
  CheckCircleIcon, 
  RefreshCwIcon, 
  FileWarningIcon,
  ExternalLinkIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface ValidationError {
  collection: string;
  docId: string;
  field: string;
  url: string;
  reason: string;
  status?: string;
  errorMessage?: string;
}

interface ValidationReport {
  id: string;
  timestamp: string;
  createdAt: { seconds: number; nanoseconds: number };
  // Fields from server response
  invalid?: ValidationError[];  // Server uses 'invalid' instead of 'errors'
  errors?: ValidationError[];   // For backward compatibility
  stats: {
    totalChecked?: number;
    totalUrls?: number;         // Server uses this
    invalidUrls: number;
    totalCollections?: number;
    totalDocuments?: number;    // Server uses this
    imageCount?: number;
    videoCount?: number;
    imageStats?: { total: number; valid: number; invalid: number };
    videoStats?: { total: number; valid: number; invalid: number };
    byCollection: Record<string, any>;
    errorTypes?: Record<string, number>;
  };
}

export function MediaValidationReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get authentication token
  const getIdToken = async () => {
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken(true);
  };
  
  // Fetch validation reports
  const { data: validationReports, isLoading: isLoadingReports } = useQuery({
    queryKey: ['media-validation-reports'],
    queryFn: async () => {
      try {
        const token = await getIdToken();
        const response = await fetch('/api/admin/media-validation-reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch validation reports');
        
        const data = await response.json();
        return data.reports as ValidationReport[];
      } catch (err) {
        console.error('Error fetching validation reports:', err);
        throw err;
      }
    },
    enabled: !!user
  });
  
  // Mutation to run validation
  const validationMutation = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      const response = await fetch('/api/admin/validate-media', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to run media validation');
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['media-validation-reports'] });
      
      toast({
        title: 'Media Validation Complete',
        description: 'The system has validated all media URLs across collections.',
        variant: 'default'
      });
    },
    onError: (error) => {
      toast({
        title: 'Media Validation Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  // Get the most recent validation report
  const latestReport = validationReports && validationReports.length > 0 ? validationReports[0] : null;
  
  // Calculate issue counts - handle both field naming conventions
  const invalidUrlCount = latestReport?.stats?.invalidUrls || 0;
  const totalChecked = latestReport?.stats?.totalChecked || latestReport?.stats?.totalUrls || 0;
  const issuePercentage = totalChecked ? Math.round((invalidUrlCount / totalChecked) * 100) : 0;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileWarningIcon className="mr-2 h-5 w-5" />
          Media Validation
        </CardTitle>
        <CardDescription>
          Validate media URLs and content types across all collections
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingReports ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="mb-6">
              <Alert className={invalidUrlCount > 0 ? 'bg-amber-50' : 'bg-green-50'}>
                {latestReport ? (
                  invalidUrlCount > 0 ? (
                    <>
                      <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
                      <AlertTitle>Issues Detected</AlertTitle>
                      <AlertDescription>
                        Found {invalidUrlCount} media issues out of {totalChecked} URLs checked ({issuePercentage}%).
                      </AlertDescription>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      <AlertTitle>All Media Valid</AlertTitle>
                      <AlertDescription>
                        All {totalChecked} media URLs are valid and accessible.
                      </AlertDescription>
                    </>
                  )
                ) : (
                  <>
                    <AlertTriangleIcon className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Initial Validation Required</AlertTitle>
                    <AlertDescription>
                      Run your first media validation scan by clicking the button below.
                    </AlertDescription>
                  </>
                )}
              </Alert>
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <Button 
                onClick={() => validationMutation.mutate()}
                disabled={validationMutation.isPending}
              >
                <RefreshCwIcon className={`mr-2 h-4 w-4 ${validationMutation.isPending ? 'animate-spin' : ''}`} />
                {validationMutation.isPending ? 'Validating...' : 'Run Validation'}
              </Button>
              
              {latestReport && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <ImageIcon className="mr-1 h-3 w-3" /> 
                    {latestReport.stats.imageCount || 
                     (latestReport.stats.imageStats ? latestReport.stats.imageStats.total : 0)} Images
                  </Badge>
                  <Badge variant="outline">
                    <VideoIcon className="mr-1 h-3 w-3" /> 
                    {latestReport.stats.videoCount || 
                     (latestReport.stats.videoStats ? latestReport.stats.videoStats.total : 0)} Videos
                  </Badge>
                  <Badge variant={invalidUrlCount > 0 ? 'destructive' : 'outline'}>
                    {invalidUrlCount} Issues
                  </Badge>
                </div>
              )}
            </div>
            
            {latestReport && invalidUrlCount > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Latest Validation Issues</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collection</TableHead>
                      <TableHead>Document ID</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Use either errors or invalid array based on which one exists */}
                    {/* Map validation errors, using either "errors" or "invalid" field */}
                    {(latestReport.errors || latestReport.invalid || []).slice(0, 5).map((error, index) => (
                      <TableRow key={index}>
                        <TableCell>{error.collection}</TableCell>
                        <TableCell className="font-mono text-xs">{error.docId.substring(0, 12)}...</TableCell>
                        <TableCell>{error.field}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {error.reason === 'Invalid content type' ? (
                              <>
                                Content type mismatch
                                {error.errorMessage && (
                                  <span className="block italic">{error.errorMessage}</span>
                                )}
                              </>
                            ) : error.reason === 'HTTP error' ? (
                              <>
                                HTTP error
                                {error.status && (
                                  <span className="block italic">{error.status}</span>
                                )}
                              </>
                            ) : (
                              error.reason
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangleIcon className="h-3 w-3" />
                            <span>Failed</span>
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Show count of additional errors */}
                    {(() => {
                      const errorList = latestReport.errors || latestReport.invalid || [];
                      return errorList.length > 5 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            ...and {errorList.length - 5} more issues
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
                
                {/* Display error types if available */}
                {latestReport.stats.errorTypes && Object.keys(latestReport.stats.errorTypes).length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold mb-2">Error Types</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {(() => {
                        // Handle TypeScript type safely
                        const errorTypes = latestReport.stats.errorTypes || {};
                        return Object.entries(errorTypes as Record<string, number>).map(([type, count]) => (
                          <Badge key={type} variant="outline" className="p-2 justify-between">
                            <span className="truncate">{type}</span>
                            <span className="ml-2 font-semibold">{count}</span>
                          </Badge>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground flex items-center">
          <ExternalLinkIcon className="mr-1 h-3 w-3" />
          Last validation: {latestReport ? new Date(latestReport.createdAt.seconds * 1000).toLocaleString() : 'Never'}
        </p>
      </CardFooter>
    </Card>
  );
}

export default MediaValidationReports;