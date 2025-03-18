/**
 * Media Validation Panel
 * 
 * This component provides a user interface for running media validation
 * and repair operations across the application.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, RefreshCw, Image, Video, Link, FileWarning, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

// Interfaces for validation reports and results
interface ValidationReport {
  id: string;
  date: string;
  collections: string[];
  errors: {
    count: number;
    details: {
      [collection: string]: {
        count: number;
        samples: string[];
      }
    }
  };
  invalid: {
    count: number;
    urls: string[];
  };
  stats: {
    totalChecked: number;
    validCount: number;
    invalidCount: number;
    errorRate: number;
  };
}

interface RepairReport {
  id: string;
  date: string;
  replacedUrls: number;
  collections: {
    [collection: string]: {
      count: number;
      samples: string[];
    }
  };
  errorDetails?: string;
}

const MediaValidationPanel: React.FC = () => {
  // State for validation operations
  const [isValidating, setIsValidating] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isResolvingBlobs, setIsResolvingBlobs] = useState(false);
  const [validationReports, setValidationReports] = useState<ValidationReport[]>([]);
  const [repairReports, setRepairReports] = useState<RepairReport[]>([]);
  const [blobReports, setBlobReports] = useState<RepairReport[]>([]);
  const [validationProgress, setValidationProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('validation');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ValidationReport | RepairReport | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if user is admin or producer role
  const isAuthorized = user && (user.role === 'producer' || user.role === 'admin');
  
  // Fetch initial reports on component mount
  useEffect(() => {
    if (isAuthorized) {
      fetchValidationReports();
      fetchRepairReports();
      fetchBlobReports();
    }
  }, [isAuthorized]);
  
  // Fetch validation reports from the API
  const fetchValidationReports = async () => {
    try {
      const response = await fetch('/api/admin/media-validation-reports');
      const data = await response.json();
      
      if (data.reports && Array.isArray(data.reports)) {
        setValidationReports(data.reports);
      }
    } catch (error) {
      console.error('Error fetching validation reports:', error);
      toast({
        title: "Error",
        description: "Failed to load validation reports",
        variant: "destructive"
      });
    }
  };
  
  // Fetch URL repair reports from the API
  const fetchRepairReports = async () => {
    try {
      const response = await fetch('/api/admin/url-repair-reports');
      const data = await response.json();
      
      if (data.reports && Array.isArray(data.reports)) {
        setRepairReports(data.reports);
      }
    } catch (error) {
      console.error('Error fetching repair reports:', error);
      toast({
        title: "Error",
        description: "Failed to load repair reports",
        variant: "destructive"
      });
    }
  };
  
  // Fetch blob URL resolution reports from the API
  const fetchBlobReports = async () => {
    try {
      const response = await fetch('/api/admin/blob-url-reports');
      const data = await response.json();
      
      if (data.reports && Array.isArray(data.reports)) {
        setBlobReports(data.reports);
      }
    } catch (error) {
      console.error('Error fetching blob resolution reports:', error);
      toast({
        title: "Error",
        description: "Failed to load blob resolution reports",
        variant: "destructive"
      });
    }
  };
  
  // Run media validation across all collections
  const runMediaValidation = async () => {
    try {
      setIsValidating(true);
      setValidationProgress(10);
      
      const response = await fetch('/api/admin/validate-media');
      const data = await response.json();
      
      setValidationProgress(100);
      
      if (data.success) {
        toast({
          title: "Validation Complete",
          description: `Media validation completed with report ID: ${data.reportId}`,
        });
        await fetchValidationReports();
      } else {
        toast({
          title: "Validation Failed",
          description: data.error || "Failed to complete media validation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error during media validation:', error);
      toast({
        title: "Error",
        description: "An error occurred during media validation",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
      setValidationProgress(0);
    }
  };
  
  // Repair broken URLs identified in validation reports
  const repairBrokenUrls = async () => {
    try {
      setIsRepairing(true);
      
      const response = await fetch('/api/admin/repair-broken-urls', {
        method: 'POST',
        body: JSON.stringify({
          // Optional parameters could be added here
          // reportId: selectedReportId, // If we want to repair based on a specific report
          replaceWith: 'placeholder', // Default behavior
          dryRun: false // Actually perform the repairs
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Repair Complete",
          description: `URL repair completed with report ID: ${data.reportId}`,
        });
        await fetchRepairReports();
        await fetchValidationReports(); // Refresh validation reports after repair
      } else {
        toast({
          title: "Repair Failed",
          description: data.error || "Failed to repair broken URLs",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error repairing broken URLs:', error);
      toast({
        title: "Error",
        description: "An error occurred while repairing broken URLs",
        variant: "destructive"
      });
    } finally {
      setIsRepairing(false);
    }
  };
  
  // Resolve blob URLs in the database
  const resolveBlobUrls = async () => {
    try {
      setIsResolvingBlobs(true);
      
      const response = await fetch('/api/admin/resolve-blob-urls', {
        method: 'POST',
        body: JSON.stringify({
          // Optional parameters
          collections: [], // Empty array means check all collections
          replaceWith: 'placeholder', // Default placeholder for blob URLs
          dryRun: false // Actually perform the replacements
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Blob URLs Resolved",
          description: `Blob URL resolution completed with report ID: ${data.reportId}`,
        });
        await fetchBlobReports();
        await fetchValidationReports(); // Refresh validation reports after resolution
      } else {
        toast({
          title: "Resolution Failed",
          description: data.error || "Failed to resolve blob URLs",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error resolving blob URLs:', error);
      toast({
        title: "Error",
        description: "An error occurred while resolving blob URLs",
        variant: "destructive"
      });
    } finally {
      setIsResolvingBlobs(false);
    }
  };
  
  // Format date string for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Filter for the most recent report
  const getLatestReport = (reports: any[]): any | null => {
    if (!reports || reports.length === 0) return null;
    
    return reports.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Sort descending (most recent first)
    })[0];
  };
  
  // Get the latest validation report
  const latestValidationReport = getLatestReport(validationReports);
  
  // If user is not authorized
  if (!isAuthorized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to access media validation tools.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Status Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Media Validation Status</CardTitle>
          <CardDescription>
            Current status of media across all collections in the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestValidationReport ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Validation:</span>
                <span className="text-sm">{formatDate(latestValidationReport.date)}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Image className="h-4 w-4" />
                    <span className="font-medium">Media URLs Checked</span>
                  </div>
                  <div className="text-2xl font-bold">{latestValidationReport.stats?.totalChecked || 0}</div>
                </div>
                
                <div className="p-4 border rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <FileWarning className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">Invalid Media URLs</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-500">
                    {latestValidationReport.invalid?.count || 0}
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Media Health Score</span>
                  <span className="text-sm">
                    {latestValidationReport.stats ? 
                      `${Math.round((1 - latestValidationReport.stats.errorRate) * 100)}%` : 
                      'N/A'}
                  </span>
                </div>
                <Progress 
                  value={latestValidationReport.stats ? 
                    Math.round((1 - latestValidationReport.stats.errorRate) * 100) : 0} 
                  className="h-2" 
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">No validation data available.</p>
              <p className="text-sm text-gray-400">Run a media validation to see results.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={fetchValidationReports}
            disabled={isValidating}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          
          <Button 
            onClick={runMediaValidation}
            disabled={isValidating}
          >
            {isValidating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Image className="mr-2 h-4 w-4" />
                Run Media Validation
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Repair Broken URLs</CardTitle>
            <CardDescription>
              Replace invalid media URLs with placeholder images.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              This operation will scan for broken image and video URLs and replace them with placeholder media.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={repairBrokenUrls}
              disabled={isRepairing || !latestValidationReport}
              className="w-full"
            >
              {isRepairing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Repairing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Repair Broken URLs
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resolve Blob URLs</CardTitle>
            <CardDescription>
              Convert temporary blob:// URLs to permanent URLs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              This operation will identify blob:// URLs in the database and replace them with placeholder images.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={resolveBlobUrls}
              disabled={isResolvingBlobs}
              className="w-full"
            >
              {isResolvingBlobs ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <Link className="mr-2 h-4 w-4" />
                  Resolve Blob URLs
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Validation Progress */}
      {isValidating && (
        <Card>
          <CardHeader>
            <CardTitle>Validation in Progress</CardTitle>
            <CardDescription>
              Checking media URLs across all collections...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={validationProgress} className="h-2 mb-2" />
            <p className="text-sm text-gray-500 text-center">
              This may take a few minutes depending on the database size.
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Reports Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
          <CardDescription>
            View historical validation and repair reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="validation" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="repair">URL Repairs</TabsTrigger>
              <TabsTrigger value="blob">Blob Resolution</TabsTrigger>
            </TabsList>
            
            <TabsContent value="validation" className="pt-4">
              {validationReports.length > 0 ? (
                <div className="space-y-4">
                  {validationReports.slice(0, 5).map((report) => (
                    <div 
                      key={report.id} 
                      className="p-4 border rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedReportId(report.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Report #{report.id.slice(0, 8)}</span>
                        <span className="text-sm text-gray-500">{formatDate(report.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={report.invalid.count > 0 ? "destructive" : "success"}>
                          {report.invalid.count > 0 ? 
                            `${report.invalid.count} issues found` : 
                            'No issues found'}
                        </Badge>
                        <Badge variant="outline">
                          {report.stats?.totalChecked || 0} URLs checked
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">No validation reports available.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="repair" className="pt-4">
              {repairReports.length > 0 ? (
                <div className="space-y-4">
                  {repairReports.slice(0, 5).map((report) => (
                    <div 
                      key={report.id} 
                      className="p-4 border rounded-md hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Repair #{report.id.slice(0, 8)}</span>
                        <span className="text-sm text-gray-500">{formatDate(report.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          {report.replacedUrls} URLs repaired
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">No repair reports available.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="blob" className="pt-4">
              {blobReports.length > 0 ? (
                <div className="space-y-4">
                  {blobReports.slice(0, 5).map((report) => (
                    <div 
                      key={report.id} 
                      className="p-4 border rounded-md hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Blob Resolution #{report.id.slice(0, 8)}</span>
                        <span className="text-sm text-gray-500">{formatDate(report.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">
                          {report.replacedUrls} blob URLs resolved
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">No blob resolution reports available.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Tips and Information */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Media Validation Tips</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
            <li>Run regular validations to identify and fix media issues</li>
            <li>Blob URLs are temporary and should be replaced with permanent storage URLs</li>
            <li>Use the repair function to automatically fix broken media links</li>
            <li>After repairs, run another validation to confirm all issues are resolved</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default MediaValidationPanel;