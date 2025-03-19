/**
 * Media Validation Panel
 * 
 * This component provides an admin interface for managing media validation,
 * viewing validation reports, and fixing media issues.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  RefreshCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Image,
  Film,
  FileWarning,
  FileSearch
} from 'lucide-react';
import axios from 'axios';

// Types for media validation
interface MediaValidationReport {
  id: string;
  status: 'running' | 'completed' | 'error';
  started: any; // Timestamp
  completed?: any; // Timestamp
  collections: Record<string, CollectionValidationStats>;
  completedCollections: number;
  totalCollections: number;
  error?: string;
}

interface CollectionValidationStats {
  processed: number;
  fixed: number;
  errors: number;
  invalidUrls: number;
  batchErrors: number;
  started: any; // Timestamp
  completed?: any; // Timestamp
  batches?: number;
}

interface InvalidMediaUrl {
  id: string;
  collection: string;
  documentId: string;
  fieldPath: string;
  url: string;
  reason: string;
  status?: string;
  error?: string;
  contentType?: string;
  timestamp: any; // Timestamp
}

// Helper function to format timestamps
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  
  // Handle Firestore timestamp
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000).toLocaleString();
  }
  
  // Handle regular Date object
  if (timestamp instanceof Date) {
    return timestamp.toLocaleString();
  }
  
  // Handle string date
  return new Date(timestamp).toLocaleString();
};

// Helper function to format duration
const formatDuration = (start: any, end: any): string => {
  if (!start || !end) return 'N/A';
  
  // Convert to milliseconds
  const startMs = start._seconds ? start._seconds * 1000 : new Date(start).getTime();
  const endMs = end._seconds ? end._seconds * 1000 : new Date(end).getTime();
  
  // Calculate duration in seconds
  const durationSec = Math.floor((endMs - startMs) / 1000);
  
  // Format as minutes and seconds
  if (durationSec < 60) {
    return `${durationSec} seconds`;
  } else {
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    return `${minutes} min ${seconds} sec`;
  }
};

/**
 * Media Validation Panel Component
 */
const MediaValidationPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for reports and UI
  const [reports, setReports] = useState<MediaValidationReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<MediaValidationReport | null>(null);
  const [invalidUrls, setInvalidUrls] = useState<InvalidMediaUrl[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  
  // Fetch validation reports
  const fetchReports = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get authentication token
      const token = await user.getIdToken();
      
      // Call the Firebase Function endpoint
      const response = await axios.get(
        'https://us-central1-etoile-yachts.cloudfunctions.net/mediaValidationStatus', 
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setReports(response.data.reports);
      } else {
        throw new Error(response.data.error || 'Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching validation reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch validation reports',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch detailed report
  const fetchReportDetails = async (reportId: string) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get authentication token
      const token = await user.getIdToken();
      
      // Call the Firebase Function endpoint
      const response = await axios.get(
        `https://us-central1-etoile-yachts.cloudfunctions.net/mediaValidationStatus?reportId=${reportId}`, 
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setSelectedReport(response.data.report);
        setInvalidUrls(response.data.report.invalidUrls || []);
      } else {
        throw new Error(response.data.error || 'Failed to fetch report details');
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch report details',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Trigger validation for all media
  const triggerFullValidation = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get authentication token
      const token = await user.getIdToken();
      
      // Call the Firebase Function endpoint
      const response = await axios.post(
        'https://us-central1-etoile-yachts.cloudfunctions.net/validateSingleDocument',
        {
          collectionName: 'all',
          documentId: 'all'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Full media validation triggered successfully',
        });
        
        // Fetch updated reports
        setTimeout(fetchReports, 3000);
      } else {
        throw new Error(response.data.error || 'Failed to trigger validation');
      }
    } catch (error) {
      console.error('Error triggering validation:', error);
      toast({
        title: 'Error',
        description: 'Failed to trigger media validation',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Repair all media issues
  const repairAllMediaIssues = async () => {
    if (!user) return;
    
    try {
      setIsRepairing(true);
      
      // Get authentication token
      const token = await user.getIdToken();
      
      // Call the admin endpoint to fix media issues
      const response = await axios.post(
        '/api/admin/fix-media-issues',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: `Fixed ${response.data.fixedCount} media issues`,
        });
        
        // Fetch updated reports
        fetchReports();
      } else {
        throw new Error(response.data.error || 'Failed to repair media issues');
      }
    } catch (error) {
      console.error('Error repairing media issues:', error);
      toast({
        title: 'Error',
        description: 'Failed to repair media issues',
        variant: 'destructive'
      });
    } finally {
      setIsRepairing(false);
    }
  };
  
  // Calculate overall completion percentage
  const getCompletionPercentage = (report: MediaValidationReport): number => {
    if (!report) return 0;
    if (report.status === 'completed') return 100;
    
    return Math.floor((report.completedCollections / report.totalCollections) * 100);
  };
  
  // Auto-fetch reports on component mount
  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);
  
  // Render the validation status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock size={14} /> Running</Badge>;
      case 'completed':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 size={14} /> Completed</Badge>;
      case 'error':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle size={14} /> Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Render report list
  const renderReportList = () => {
    if (reports.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileSearch size={48} className="mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No validation reports found</h3>
          <p className="text-muted-foreground mb-6">
            Run a validation to check for media issues
          </p>
          <Button onClick={triggerFullValidation} disabled={isLoading}>
            {isLoading ? 'Triggering...' : 'Run Media Validation'}
          </Button>
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map(report => (
            <TableRow key={report.id}>
              <TableCell className="font-mono text-xs">{report.id}</TableCell>
              <TableCell>{renderStatusBadge(report.status)}</TableCell>
              <TableCell>{formatTimestamp(report.started)}</TableCell>
              <TableCell>{formatTimestamp(report.completed)}</TableCell>
              <TableCell>
                <div className="w-full">
                  <Progress value={getCompletionPercentage(report)} className="h-2" />
                  <span className="text-xs text-muted-foreground">
                    {report.completedCollections}/{report.totalCollections} collections
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchReportDetails(report.id)}
                >
                  View Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  // Render report details
  const renderReportDetails = () => {
    if (!selectedReport) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileSearch size={48} className="mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No report selected</h3>
          <p className="text-muted-foreground">
            Select a report to view its details
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Report Details</h3>
            <p className="text-sm text-muted-foreground">ID: {selectedReport.id}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedReport(null);
              setInvalidUrls([]);
            }}
          >
            Close Details
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{renderStatusBadge(selectedReport.status)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedReport.error && (
                  <span className="text-destructive">{selectedReport.error}</span>
                )}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(selectedReport.started, selectedReport.completed || new Date())}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Started: {formatTimestamp(selectedReport.started)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedReport.completedCollections}/{selectedReport.totalCollections}
              </div>
              <Progress 
                value={getCompletionPercentage(selectedReport)} 
                className="h-2 mt-2" 
              />
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="collections">
          <TabsList>
            <TabsTrigger value="collections">Collection Results</TabsTrigger>
            <TabsTrigger value="invalid-urls">Invalid URLs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="collections" className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collection</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Fixed</TableHead>
                  <TableHead>Invalid URLs</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(selectedReport.collections || {}).map(([name, stats]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>{stats.processed}</TableCell>
                    <TableCell>{stats.fixed}</TableCell>
                    <TableCell>
                      {stats.invalidUrls > 0 ? (
                        <Badge variant="destructive">{stats.invalidUrls}</Badge>
                      ) : (
                        stats.invalidUrls
                      )}
                    </TableCell>
                    <TableCell>
                      {stats.errors > 0 ? (
                        <Badge variant="destructive">{stats.errors}</Badge>
                      ) : (
                        stats.errors
                      )}
                    </TableCell>
                    <TableCell>{formatDuration(stats.started, stats.completed)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          
          <TabsContent value="invalid-urls" className="space-y-4">
            {invalidUrls.length === 0 ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>No invalid URLs found</AlertTitle>
                <AlertDescription>
                  All media URLs passed validation.
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collection</TableHead>
                    <TableHead>Document ID</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invalidUrls.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.collection}</TableCell>
                      <TableCell className="font-mono text-xs">{item.documentId}</TableCell>
                      <TableCell>{item.fieldPath}</TableCell>
                      <TableCell className="font-mono text-xs max-w-xs truncate">
                        {item.url}
                      </TableCell>
                      <TableCell>{item.reason}</TableCell>
                      <TableCell>
                        {item.contentType?.includes('video') ? (
                          <Badge className="flex items-center gap-1" variant="secondary">
                            <Film size={12} /> Video
                          </Badge>
                        ) : (
                          <Badge className="flex items-center gap-1" variant="outline">
                            <Image size={12} /> Image
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {invalidUrls.length > 0 && (
              <div className="flex justify-end">
                <Button
                  onClick={repairAllMediaIssues}
                  disabled={isRepairing}
                  variant="destructive"
                >
                  {isRepairing ? 'Repairing...' : 'Repair All Media Issues'}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Media Validation</h2>
          <p className="text-muted-foreground">
            Monitor and repair media URLs across all collections
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchReports}
            disabled={isLoading}
          >
            <RefreshCcw size={16} className="mr-2" />
            Refresh
          </Button>
          
          <Button 
            size="sm" 
            onClick={triggerFullValidation}
            disabled={isLoading}
          >
            Run Validation
          </Button>
        </div>
      </div>
      
      <Separator />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">
              Validation report history
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter(r => r.status === 'running').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently running validations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invalid Media</CardTitle>
            <FileWarning className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedReport 
                ? invalidUrls.length 
                : reports.reduce((count, report) => {
                    // Sum invalid URLs across all collections
                    if (report.collections) {
                      Object.values(report.collections).forEach(stats => {
                        count += stats.invalidUrls || 0;
                      });
                    }
                    return count;
                  }, 0)
              }
            </div>
            <p className="text-xs text-muted-foreground">
              URLs needing repair
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Run</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.length > 0 
                ? formatTimestamp(reports[0]?.started || 'Never') 
                : 'Never'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {reports.length > 0 && reports[0]?.status
                ? `Status: ${reports[0]?.status}`
                : 'No recent validations'
              }
            </p>
          </CardContent>
        </Card>
      </div>
      
      {selectedReport ? renderReportDetails() : renderReportList()}
    </div>
  );
};

export default MediaValidationPanel;