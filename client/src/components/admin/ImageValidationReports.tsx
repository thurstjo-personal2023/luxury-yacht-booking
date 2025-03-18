import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoIcon, AlertTriangleIcon, CheckCircleIcon, ImageIcon, RefreshCwIcon } from 'lucide-react';

interface ValidationStats {
  totalDocuments: number;
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  badContentTypes: number;
  byCollection: Record<string, {
    total: number;
    valid: number;
    invalid: number;
    missing: number;
  }>;
}

interface ValidationReport {
  id: string;
  timestamp: string;
  createdAt: { seconds: number; nanoseconds: number };
  stats: ValidationStats;
  sampleIssues: {
    invalid: Array<{
      url: string;
      docId: string;
      collection: string;
      field: string;
      subField?: string;
      reason: string;
      status?: number;
      error?: string;
    }>;
    missing: Array<{
      docId: string;
      collection: string;
      field: string;
      subField?: string;
    }>;
  };
}

export function ImageValidationReports() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch validation reports
  const { data: reports, isLoading, error, refetch } = useQuery({
    queryKey: ['image-validation-reports'],
    queryFn: async () => {
      const response = await fetch('/api/admin/image-validation-reports');
      if (!response.ok) {
        throw new Error('Failed to fetch validation reports');
      }
      const data = await response.json();
      return data.reports as ValidationReport[];
    },
    enabled: false,
  });
  
  // Trigger a new validation run
  const runValidation = async () => {
    try {
      await fetch('/api/admin/validate-images');
      refetch();
    } catch (error) {
      console.error('Error running validation:', error);
    }
  };
  
  // Get the latest report
  const latestReport = reports?.[0];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ImageIcon className="mr-2 h-5 w-5" />
          Image Validation
        </CardTitle>
        <CardDescription>
          Verify all image URLs across the platform
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
            Run Image Validation
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
              <TabsTrigger value="collections">Collections</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm">Total Images</CardTitle>
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
                          ({((latestReport.stats.validUrls / latestReport.stats.totalUrls) * 100).toFixed(1)}%)
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
                          ({((latestReport.stats.invalidUrls / latestReport.stats.totalUrls) * 100).toFixed(1)}%)
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
                          ({((latestReport.stats.missingUrls / latestReport.stats.totalUrls) * 100).toFixed(1)}%)
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
                      value={(latestReport.stats.validUrls / latestReport.stats.totalUrls) * 100} 
                      className="h-2"
                    />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                {latestReport.sampleIssues.invalid.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <AlertTriangleIcon className="h-4 w-4 mr-2 text-red-500" />
                      Invalid Images
                    </h3>
                    <div className="space-y-3">
                      {latestReport.sampleIssues.invalid.map((issue, index) => (
                        <Card key={`invalid-${index}`} className="border-red-200">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="col-span-2">
                                <p className="text-sm font-semibold">{issue.collection} / {issue.docId}</p>
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
                    <AlertTitle>No invalid images</AlertTitle>
                    <AlertDescription>
                      All image URLs are valid and accessible.
                    </AlertDescription>
                  </Alert>
                )}
                
                {latestReport.sampleIssues.missing.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <InfoIcon className="h-4 w-4 mr-2 text-yellow-500" />
                      Missing Images
                    </h3>
                    <div className="space-y-3">
                      {latestReport.sampleIssues.missing.map((issue, index) => (
                        <Card key={`missing-${index}`} className="border-yellow-200">
                          <CardContent className="p-4">
                            <p className="text-sm font-semibold">{issue.collection} / {issue.docId}</p>
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
                    <AlertTitle>No missing images</AlertTitle>
                    <AlertDescription>
                      All image fields have values.
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
              No image validation reports found. Click "Run Image Validation" to start.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Image validation checks all image URLs across the platform to ensure they are accessible and valid.
        </p>
      </CardFooter>
    </Card>
  );
}

export default ImageValidationReports;