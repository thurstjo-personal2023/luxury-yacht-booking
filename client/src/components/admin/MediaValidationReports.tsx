import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoIcon, AlertTriangleIcon, CheckCircleIcon, ImageIcon, VideoIcon, RefreshCwIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';

interface MediaStats {
  totalDocuments: number;
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  badContentTypes: number;
  imageStats: {
    total: number;
    valid: number;
    invalid: number;
  };
  videoStats: {
    total: number;
    valid: number;
    invalid: number;
  };
  byCollection: Record<string, {
    total: number;
    valid: number;
    invalid: number;
    missing: number;
  }>;
}

interface MediaValidationReport {
  id: string;
  timestamp: string;
  createdAt: { seconds: number; nanoseconds: number };
  stats: MediaStats;
  sampleIssues?: {
    invalid: Array<{
      url: string;
      docId: string;
      collection: string;
      field: string;
      subField?: string;
      mediaType: 'image' | 'video' | 'unknown';
      reason: string;
      status?: number;
      error?: string;
    }>;
    missing: Array<{
      docId: string;
      collection: string;
      field: string;
      subField?: string;
      mediaType: 'image' | 'video' | 'unknown';
    }>;
  };
}

export function MediaValidationReports() {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth(); // Get the authenticated user
  
  // Function to get the authentication token
  const getIdToken = async () => {
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken(true); // Force refresh for latest claims
  };
  
  // Fetch validation reports
  const { data: reports, isLoading, error, refetch } = useQuery({
    queryKey: ['media-validation-reports'],
    queryFn: async () => {
      try {
        // Get the auth token
        const token = await getIdToken();
        
        // Make the API request with the auth token
        const response = await fetch('/api/admin/media-validation-reports', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          console.error('API error:', response.status, await response.text());
          throw new Error(`Failed to fetch media validation reports: ${response.status}`);
        }
        
        const data = await response.json();
        return data.reports as MediaValidationReport[];
      } catch (err) {
        console.error('Error fetching media validation reports:', err);
        throw err;
      }
    },
    enabled: !!user, // Run automatically when user is authenticated
  });
  
  // Trigger a new validation run
  const runValidation = async () => {
    try {
      // Get the auth token
      const token = await getIdToken();
      
      // Make the API request with the auth token
      const response = await fetch('/api/admin/validate-media', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error('Validation API error:', response.status, await response.text());
        throw new Error(`Failed to run validation: ${response.status}`);
      }
      
      // Refresh the reports list
      refetch();
    } catch (error) {
      console.error('Error running validation:', error);
    }
  };
  
  // Get the latest report
  const latestReport = reports?.[0];
  
  // Safely access report properties with proper typing
  const hasInvalidMedia = Boolean(latestReport?.sampleIssues?.invalid?.length);
  const hasMissingMedia = Boolean(latestReport?.sampleIssues?.missing?.length);
  const invalidMedia = latestReport?.sampleIssues?.invalid || [];
  const missingMedia = latestReport?.sampleIssues?.missing || [];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <div className="flex space-x-2">
            <ImageIcon className="h-5 w-5" />
            <VideoIcon className="h-5 w-5" />
          </div>
          <span className="ml-2">Media Validation</span>
        </CardTitle>
        <CardDescription>
          Verify image and video URLs across the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-between items-center">
          <Button
            onClick={runValidation}
            className="mb-4"
            disabled={isLoading}
          >
            <RefreshCwIcon className="mr-2 h-4 w-4" />
            Run Media Validation
          </Button>
          
          {latestReport && (
            <span className="text-sm text-muted-foreground">
              Last run: {new Date(latestReport.createdAt.seconds * 1000).toLocaleString()}
            </span>
          )}
        </div>
        
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load validation reports. Please try again.
            </AlertDescription>
          </Alert>
        )}
        
        {latestReport && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm">Total URLs</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-2xl font-bold">{latestReport.stats.totalUrls}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm text-green-600">Valid</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-2xl font-bold text-green-600">
                        {latestReport.stats.validUrls} 
                        <span className="text-sm ml-1 font-normal">
                          ({latestReport.stats.totalUrls > 0 ? ((latestReport.stats.validUrls / latestReport.stats.totalUrls) * 100).toFixed(1) : 0}%)
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm text-red-600">Invalid</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-2xl font-bold text-red-600">
                        {latestReport.stats.invalidUrls}
                        <span className="text-sm ml-1 font-normal">
                          ({latestReport.stats.totalUrls > 0 ? ((latestReport.stats.invalidUrls / latestReport.stats.totalUrls) * 100).toFixed(1) : 0}%)
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm text-yellow-600">Missing</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-2xl font-bold text-yellow-600">
                        {latestReport.stats.missingUrls}
                        <span className="text-sm ml-1 font-normal">
                          ({latestReport.stats.totalUrls > 0 ? ((latestReport.stats.missingUrls / latestReport.stats.totalUrls) * 100).toFixed(1) : 0}%)
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm">Overall Health</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Progress 
                      value={latestReport.stats.totalUrls > 0 ? (latestReport.stats.validUrls / latestReport.stats.totalUrls) * 100 : 0} 
                      className="h-2"
                    />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm flex items-center">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Image Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">
                          {latestReport.stats.imageStats.valid} of {latestReport.stats.imageStats.total} valid
                        </span>
                        <span className="text-sm text-green-600">
                          {latestReport.stats.imageStats.total > 0 
                            ? ((latestReport.stats.imageStats.valid / latestReport.stats.imageStats.total) * 100).toFixed(1) 
                            : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={latestReport.stats.imageStats.total > 0 
                          ? (latestReport.stats.imageStats.valid / latestReport.stats.imageStats.total) * 100 
                          : 0} 
                        className="h-2"
                      />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm flex items-center">
                        <VideoIcon className="h-4 w-4 mr-2" />
                        Video Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">
                          {latestReport.stats.videoStats.valid} of {latestReport.stats.videoStats.total} valid
                        </span>
                        <span className="text-sm text-green-600">
                          {latestReport.stats.videoStats.total > 0 
                            ? ((latestReport.stats.videoStats.valid / latestReport.stats.videoStats.total) * 100).toFixed(1) 
                            : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={latestReport.stats.videoStats.total > 0 
                          ? (latestReport.stats.videoStats.valid / latestReport.stats.videoStats.total) * 100 
                          : 0} 
                        className="h-2"
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="images">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm flex items-center">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Image Validation Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium">Total</p>
                        <p className="text-xl font-bold">{latestReport.stats.imageStats.total}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium text-green-600">Valid</p>
                        <p className="text-xl font-bold text-green-600">{latestReport.stats.imageStats.valid}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium text-red-600">Invalid</p>
                        <p className="text-xl font-bold text-red-600">{latestReport.stats.imageStats.invalid}</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {invalidMedia.filter(item => item.mediaType === 'image').length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Sample Invalid Images:</h3>
                      {invalidMedia
                        .filter(item => item.mediaType === 'image')
                        .slice(0, 3)
                        .map((item, index) => (
                          <Card key={`invalid-image-${index}`} className="border-red-100">
                            <CardContent className="p-3">
                              <div className="flex justify-between">
                                <div>
                                  <p className="text-sm font-medium truncate">{item.collection} / {item.docId}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.field}{item.subField ? `.${item.subField}` : ''}
                                  </p>
                                </div>
                                <Badge variant="outline" className="bg-red-50">
                                  {item.reason}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <Alert className="bg-green-50">
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      <AlertTitle>All images are valid</AlertTitle>
                      <AlertDescription>
                        No invalid images were detected.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="videos">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-sm flex items-center">
                    <VideoIcon className="h-4 w-4 mr-2" />
                    Video Validation Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium">Total</p>
                        <p className="text-xl font-bold">{latestReport.stats.videoStats.total}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium text-green-600">Valid</p>
                        <p className="text-xl font-bold text-green-600">{latestReport.stats.videoStats.valid}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium text-red-600">Invalid</p>
                        <p className="text-xl font-bold text-red-600">{latestReport.stats.videoStats.invalid}</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {invalidMedia.filter(item => item.mediaType === 'video').length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Sample Invalid Videos:</h3>
                      {invalidMedia
                        .filter(item => item.mediaType === 'video')
                        .slice(0, 3)
                        .map((item, index) => (
                          <Card key={`invalid-video-${index}`} className="border-red-100">
                            <CardContent className="p-3">
                              <div className="flex justify-between">
                                <div>
                                  <p className="text-sm font-medium truncate">{item.collection} / {item.docId}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.field}{item.subField ? `.${item.subField}` : ''}
                                  </p>
                                </div>
                                <Badge variant="outline" className="bg-red-50">
                                  {item.reason}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <Alert className="bg-green-50">
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      <AlertTitle>All videos are valid</AlertTitle>
                      <AlertDescription>
                        No invalid videos were detected.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="collections">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collection</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Valid</TableHead>
                    <TableHead className="text-right">Invalid</TableHead>
                    <TableHead className="text-right">Missing</TableHead>
                    <TableHead className="text-right">Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(latestReport.stats.byCollection).map(([collection, stats]) => (
                    <TableRow key={collection}>
                      <TableCell className="font-medium">{collection}</TableCell>
                      <TableCell className="text-right">{stats.total}</TableCell>
                      <TableCell className="text-right text-green-600">{stats.valid}</TableCell>
                      <TableCell className="text-right text-red-600">{stats.invalid}</TableCell>
                      <TableCell className="text-right text-yellow-600">{stats.missing}</TableCell>
                      <TableCell className="text-right">
                        {stats.total > 0 ? (
                          <Progress 
                            value={(stats.valid / stats.total) * 100} 
                            className="h-2 w-16 ml-auto"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="issues">
              <div className="space-y-6">
                {hasInvalidMedia ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <AlertTriangleIcon className="h-4 w-4 mr-2 text-red-500" />
                      Invalid Media Items
                    </h3>
                    <div className="space-y-3">
                      {invalidMedia.map((issue, index) => (
                        <Card key={`invalid-${index}`} className="border-red-200">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="col-span-2">
                                <div className="flex items-center">
                                  {issue.mediaType === 'image' ? (
                                    <ImageIcon className="h-4 w-4 mr-2" />
                                  ) : issue.mediaType === 'video' ? (
                                    <VideoIcon className="h-4 w-4 mr-2" />
                                  ) : (
                                    <InfoIcon className="h-4 w-4 mr-2" />
                                  )}
                                  <p className="text-sm font-semibold">{issue.collection} / {issue.docId}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Field: {issue.field}{issue.subField ? `.${issue.subField}` : ''}
                                </p>
                                <p className="text-xs break-all mt-1">{issue.url}</p>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-red-600">{issue.reason}</p>
                                {issue.status && <p className="text-xs">Status: {issue.status}</p>}
                                {issue.error && <p className="text-xs break-all">{issue.error}</p>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Alert className="bg-green-50">
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    <AlertTitle>No invalid media</AlertTitle>
                    <AlertDescription>
                      All media URLs are valid and accessible.
                    </AlertDescription>
                  </Alert>
                )}
                
                {hasMissingMedia ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <InfoIcon className="h-4 w-4 mr-2 text-yellow-500" />
                      Missing Media
                    </h3>
                    <div className="space-y-3">
                      {missingMedia.map((issue, index) => (
                        <Card key={`missing-${index}`} className="border-yellow-200">
                          <CardContent className="p-4">
                            <div className="flex items-center">
                              {issue.mediaType === 'image' ? (
                                <ImageIcon className="h-4 w-4 mr-2" />
                              ) : issue.mediaType === 'video' ? (
                                <VideoIcon className="h-4 w-4 mr-2" />
                              ) : (
                                <InfoIcon className="h-4 w-4 mr-2" />
                              )}
                              <p className="text-sm font-semibold">{issue.collection} / {issue.docId}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Field: {issue.field}{issue.subField ? `.${issue.subField}` : ''}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Alert className="bg-green-50">
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    <AlertTitle>No missing media</AlertTitle>
                    <AlertDescription>
                      All media fields have values.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
        
        {!isLoading && !error && !latestReport && (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>No Reports</AlertTitle>
            <AlertDescription>
              No media validation reports found. Click "Run Media Validation" to start.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Media validation checks all media URLs across the platform to ensure they are accessible and valid.
          Images and videos are validated according to their proper MIME types.
        </p>
      </CardFooter>
    </Card>
  );
}

export default MediaValidationReports;