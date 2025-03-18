import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { useAuth } from '@/hooks/use-auth';

/**
 * Media Validation Panel Component
 * 
 * This component provides a UI for running media validation and repair tools.
 * It's intended for use in the admin dashboard.
 */
const MediaValidationPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState<{
    validation: boolean;
    repair: boolean;
    blobFix: boolean;
    relativeFix: boolean;
    test: boolean;
  }>({
    validation: false,
    repair: false,
    blobFix: false,
    relativeFix: false,
    test: false
  });
  
  const [results, setResults] = useState<{
    validation: any;
    repair: any;
    blobFix: any;
    relativeFix: any;
    test: any;
  }>({
    validation: null,
    repair: null,
    blobFix: null,
    relativeFix: null,
    test: null
  });
  
  const [reports, setReports] = useState<{
    validation: any[];
    repair: any[];
    blobFix: any[];
    relativeFix: any[];
    test: any[];
  }>({
    validation: [],
    repair: [],
    blobFix: [],
    relativeFix: [],
    test: []
  });
  
  // Check if user has admin privileges
  const isAdmin = user?.role === 'producer'; // Currently using 'producer' as admin
  
  useEffect(() => {
    // Load reports when component mounts
    if (isAdmin) {
      loadReports();
    }
  }, [isAdmin]);
  
  /**
   * Load all report types
   */
  const loadReports = async () => {
    try {
      // Load media validation reports
      const validationRes = await axios.get('/api/admin/media-validation-reports');
      
      // Load URL repair reports
      const repairRes = await axios.get('/api/admin/url-repair-reports');
      
      // Load blob URL resolution reports
      const blobRes = await axios.get('/api/admin/blob-url-reports');
      
      // Load relative URL fix reports
      const relativeRes = await axios.get('/api/admin/relative-url-reports');
      
      // Load test reports
      const testRes = await axios.get('/api/admin/media-validation-tests');
      
      setReports({
        validation: validationRes.data.reports || [],
        repair: repairRes.data.reports || [],
        blobFix: blobRes.data.reports || [],
        relativeFix: relativeRes.data.reports || [],
        test: testRes.data.tests || []
      });
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load validation reports',
        variant: 'destructive'
      });
    }
  };
  
  /**
   * Run media validation
   */
  const runValidation = async () => {
    try {
      setLoading(prev => ({ ...prev, validation: true }));
      
      const response = await axios.get('/api/admin/validate-media');
      
      setResults(prev => ({ ...prev, validation: response.data }));
      
      toast({
        title: 'Validation Complete',
        description: `Media validation completed successfully.`,
        variant: 'default'
      });
      
      // Refresh reports
      loadReports();
    } catch (error) {
      console.error('Error running validation:', error);
      toast({
        title: 'Validation Failed',
        description: 'Failed to run media validation',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, validation: false }));
    }
  };
  
  /**
   * Run broken URL repair
   */
  const runRepair = async () => {
    try {
      setLoading(prev => ({ ...prev, repair: true }));
      
      const response = await axios.post('/api/admin/repair-broken-urls');
      
      setResults(prev => ({ ...prev, repair: response.data }));
      
      toast({
        title: 'Repair Complete',
        description: 'Broken URLs have been repaired successfully.',
        variant: 'default'
      });
      
      // Refresh reports
      loadReports();
    } catch (error) {
      console.error('Error repairing URLs:', error);
      toast({
        title: 'Repair Failed',
        description: 'Failed to repair broken URLs',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, repair: false }));
    }
  };
  
  /**
   * Run blob URL resolution
   */
  const runBlobResolution = async () => {
    try {
      setLoading(prev => ({ ...prev, blobFix: true }));
      
      const response = await axios.post('/api/admin/resolve-blob-urls');
      
      setResults(prev => ({ ...prev, blobFix: response.data }));
      
      toast({
        title: 'Resolution Complete',
        description: 'Blob URLs have been resolved successfully.',
        variant: 'default'
      });
      
      // Refresh reports
      loadReports();
    } catch (error) {
      console.error('Error resolving blob URLs:', error);
      toast({
        title: 'Resolution Failed',
        description: 'Failed to resolve blob URLs',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, blobFix: false }));
    }
  };
  
  /**
   * Run relative URL fix
   */
  const runRelativeFix = async () => {
    try {
      setLoading(prev => ({ ...prev, relativeFix: true }));
      
      const response = await axios.post('/api/admin/fix-relative-urls');
      
      setResults(prev => ({ ...prev, relativeFix: response.data }));
      
      toast({
        title: 'Fix Complete',
        description: 'Relative URLs have been fixed successfully.',
        variant: 'default'
      });
      
      // Refresh reports
      loadReports();
    } catch (error) {
      console.error('Error fixing relative URLs:', error);
      toast({
        title: 'Fix Failed',
        description: 'Failed to fix relative URLs',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, relativeFix: false }));
    }
  };
  
  /**
   * Run media validation test
   */
  const runTest = async () => {
    try {
      setLoading(prev => ({ ...prev, test: true }));
      
      const response = await axios.post('/api/admin/test-media-validation');
      
      setResults(prev => ({ ...prev, test: response.data }));
      
      toast({
        title: 'Test Complete',
        description: `Media validation test completed with ${response.data.results?.successRate || 0}% success rate.`,
        variant: 'default'
      });
      
      // Refresh reports
      loadReports();
    } catch (error) {
      console.error('Error running test:', error);
      toast({
        title: 'Test Failed',
        description: 'Failed to run media validation test',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, test: false }));
    }
  };
  
  /**
   * Format date for display
   */
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    let date;
    
    if (timestamp._seconds) {
      // Firestore timestamp
      date = new Date(timestamp._seconds * 1000);
    } else if (typeof timestamp === 'string') {
      // ISO string
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return 'Invalid date';
    }
    
    return date.toLocaleString();
  };
  
  if (!isAdmin) {
    return (
      <Alert>
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to access this page.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Media Validation Tools</h2>
      <p className="text-muted-foreground">
        These tools help you validate and fix media URLs in your database.
      </p>
      
      <Tabs defaultValue="tools">
        <TabsList>
          <TabsTrigger value="tools">Validation Tools</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="test">Test Suite</TabsTrigger>
        </TabsList>
        
        {/* Tools Tab */}
        <TabsContent value="tools">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Media Validation Card */}
            <Card>
              <CardHeader>
                <CardTitle>Media Validation</CardTitle>
                <CardDescription>
                  Validate all media URLs in the database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  This tool checks all image and video URLs in the database to ensure they are
                  accessible and match their declared content type.
                </p>
                
                {results.validation && (
                  <Alert className="mt-4">
                    <AlertTitle>Validation Complete</AlertTitle>
                    <AlertDescription>
                      <p>Validated {results.validation.stats?.totalUrls || 0} URLs</p>
                      <p>Found {results.validation.stats?.invalidUrls || 0} invalid URLs</p>
                      <p>Report ID: {results.validation.reportId || 'N/A'}</p>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={runValidation} 
                  disabled={loading.validation}
                  className="w-full"
                >
                  {loading.validation ? 'Running...' : 'Run Validation'}
                </Button>
              </CardFooter>
            </Card>
            
            {/* Repair Broken URLs Card */}
            <Card>
              <CardHeader>
                <CardTitle>Repair Broken URLs</CardTitle>
                <CardDescription>
                  Fix broken or inaccessible URLs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  This tool replaces broken or inaccessible URLs with appropriate placeholders
                  based on their expected content type.
                </p>
                
                {results.repair && (
                  <Alert className="mt-4">
                    <AlertTitle>Repair Complete</AlertTitle>
                    <AlertDescription>
                      <p>Scanned {results.repair.stats?.totalDocs || 0} documents</p>
                      <p>Repaired {results.repair.stats?.totalRepaired || 0} URLs</p>
                      <p>Report ID: {results.repair.reportId || 'N/A'}</p>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={runRepair} 
                  disabled={loading.repair}
                  className="w-full"
                >
                  {loading.repair ? 'Running...' : 'Repair Broken URLs'}
                </Button>
              </CardFooter>
            </Card>
            
            {/* Resolve Blob URLs Card */}
            <Card>
              <CardHeader>
                <CardTitle>Resolve Blob URLs</CardTitle>
                <CardDescription>
                  Replace blob:// URLs with placeholders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  This tool replaces blob:// URLs (which are client-side only) with appropriate
                  placeholders to ensure they are accessible server-side.
                </p>
                
                {results.blobFix && (
                  <Alert className="mt-4">
                    <AlertTitle>Resolution Complete</AlertTitle>
                    <AlertDescription>
                      <p>Scanned {results.blobFix.stats?.totalDocs || 0} documents</p>
                      <p>Resolved {results.blobFix.stats?.totalResolved || 0} blob URLs</p>
                      <p>Report ID: {results.blobFix.reportId || 'N/A'}</p>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={runBlobResolution} 
                  disabled={loading.blobFix}
                  className="w-full"
                >
                  {loading.blobFix ? 'Running...' : 'Resolve Blob URLs'}
                </Button>
              </CardFooter>
            </Card>
            
            {/* Fix Relative URLs Card */}
            <Card>
              <CardHeader>
                <CardTitle>Fix Relative URLs</CardTitle>
                <CardDescription>
                  Convert relative URLs to absolute URLs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  This tool converts relative URLs (e.g., /images/photo.jpg) to absolute URLs
                  that include the base domain, ensuring they are accessible from anywhere.
                </p>
                
                {results.relativeFix && (
                  <Alert className="mt-4">
                    <AlertTitle>Fix Complete</AlertTitle>
                    <AlertDescription>
                      <p>Scanned {results.relativeFix.stats?.totalDocs || 0} documents</p>
                      <p>Fixed {results.relativeFix.stats?.totalFixed || 0} relative URLs</p>
                      <p>Report ID: {results.relativeFix.reportId || 'N/A'}</p>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={runRelativeFix} 
                  disabled={loading.relativeFix}
                  className="w-full"
                >
                  {loading.relativeFix ? 'Running...' : 'Fix Relative URLs'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="space-y-6 mt-6">
            {/* Validation Reports */}
            <Card>
              <CardHeader>
                <CardTitle>Media Validation Reports</CardTitle>
                <CardDescription>
                  Recent media validation results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reports.validation.length > 0 ? (
                  <div className="space-y-4">
                    {reports.validation.map((report, index) => (
                      <div key={report.id || index} className="border p-4 rounded-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">Report {index + 1}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(report.timestamp || report.createdAt)}
                            </p>
                          </div>
                          <Badge variant={
                            report.invalidUrls > 0 ? 'destructive' : 'success'
                          }>
                            {report.invalidUrls > 0 ? 'Issues Found' : 'All Valid'}
                          </Badge>
                        </div>
                        <Separator className="my-2" />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p>Total URLs: {report.totalUrls || 0}</p>
                          <p>Valid: {report.validUrls || 0}</p>
                          <p>Invalid: {report.invalidUrls || 0}</p>
                          <p>Execution Time: {(report.executionTime / 1000).toFixed(2)}s</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No validation reports available
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Repair Reports */}
            <Card>
              <CardHeader>
                <CardTitle>URL Repair Reports</CardTitle>
                <CardDescription>
                  Recent URL repair results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reports.repair.length > 0 ? (
                  <div className="space-y-4">
                    {reports.repair.map((report, index) => (
                      <div key={report.id || index} className="border p-4 rounded-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">Report {index + 1}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(report.timestamp || report.createdAt)}
                            </p>
                          </div>
                          <Badge variant={
                            report.totalRepaired > 0 ? 'default' : 'outline'
                          }>
                            {report.totalRepaired > 0 ? `${report.totalRepaired} Fixed` : 'No Fixes'}
                          </Badge>
                        </div>
                        <Separator className="my-2" />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p>Total Docs: {report.totalDocs || 0}</p>
                          <p>Fixed URLs: {report.totalRepaired || 0}</p>
                          <p>Failed: {report.totalFailed || 0}</p>
                          <p>Execution Time: {(report.executionTime / 1000).toFixed(2)}s</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No repair reports available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Test Suite Tab */}
        <TabsContent value="test">
          <div className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Media Validation Test Suite</CardTitle>
                <CardDescription>
                  Run a comprehensive test of all validation and repair tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">
                  This tool runs a comprehensive test of all media validation and repair tools
                  using a test collection populated with various problematic media URLs.
                </p>
                
                {results.test && (
                  <div className="space-y-4">
                    <Alert>
                      <AlertTitle>Test Complete</AlertTitle>
                      <AlertDescription>
                        <p>Initial issues: {results.test.results?.initialIssues || 0}</p>
                        <p>Issues fixed: {results.test.results?.fixedIssues || 0}</p>
                        <p>Remaining issues: {results.test.results?.remainingIssues || 0}</p>
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Success Rate</p>
                      <Progress 
                        value={results.test.results?.successRate || 0} 
                        className="h-2"
                      />
                      <p className="text-sm text-right">{results.test.results?.successRate || 0}%</p>
                    </div>
                  </div>
                )}
                
                {/* Test Reports */}
                {reports.test.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Test Reports</h3>
                    <div className="space-y-4">
                      {reports.test.map((report, index) => (
                        <div key={report.id || index} className="border p-4 rounded-md">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">Test {index + 1}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(report.timestamp)}
                              </p>
                            </div>
                            <Badge variant={
                              report.successRate >= 80 ? 'success' : 
                              report.successRate >= 50 ? 'default' : 'destructive'
                            }>
                              {report.successRate}% Success
                            </Badge>
                          </div>
                          <Separator className="my-2" />
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p>Initial issues: {report.initialIssues || 0}</p>
                            <p>Fixed issues: {report.fixedIssues || 0}</p>
                            <p>Remaining: {report.remainingIssues || 0}</p>
                            <p>Test ID: {report.id}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={runTest} 
                  disabled={loading.test}
                  className="w-full"
                >
                  {loading.test ? 'Running...' : 'Run Test Suite'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MediaValidationPanel;