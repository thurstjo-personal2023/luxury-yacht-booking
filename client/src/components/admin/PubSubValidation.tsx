/**
 * PubSub Media Validation Component
 * 
 * This component provides a UI for interacting with the PubSub media validation system.
 * It allows admins to trigger validation tasks and view the results.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  PlayCircle,
  RefreshCw,
  XCircle,
  FileText,
  Calendar
} from 'lucide-react';

// Default collections to validate
const DEFAULT_COLLECTIONS = [
  'unified_yacht_experiences',
  'yacht_profiles',
  'products_add_ons',
  'articles_and_guides',
  'event_announcements'
];

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
    case 'failed':
      return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
    case 'processing':
      return <Badge className="bg-blue-500"><RefreshCw className="w-3 h-3 mr-1" /> Processing</Badge>;
    case 'started':
      return <Badge className="bg-yellow-500"><PlayCircle className="w-3 h-3 mr-1" /> Started</Badge>;
    case 'pending':
      return <Badge className="bg-gray-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    default:
      return <Badge className="bg-gray-500"><AlertCircle className="w-3 h-3 mr-1" /> {status || 'Unknown'}</Badge>;
  }
};

// Format date helper
const formatDate = (timestamp: number | string) => {
  if (!timestamp) return 'N/A';
  const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleString();
};

// Format duration helper
const formatDuration = (ms: number) => {
  if (!ms) return 'N/A';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * PubSub Validation Dashboard
 */
const PubSubValidation = () => {
  const queryClient = useQueryClient();
  const [selectedCollections, setSelectedCollections] = useState<string[]>([...DEFAULT_COLLECTIONS]);
  const [detailedReportId, setDetailedReportId] = useState<string | null>(null);
  
  // Query for validation reports
  const { 
    data: reportsData, 
    isLoading: isLoadingReports,
    isError: isReportsError,
    error: reportsError
  } = useQuery({
    queryKey: ['/api/admin/pubsub-validation-reports'],
    queryFn: async () => {
      const response = await axios.get('/api/admin/pubsub-validation-reports');
      return response.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds when active
  });
  
  // Query for detailed report
  const { 
    data: detailedReport, 
    isLoading: isLoadingDetailedReport,
    isError: isDetailedReportError,
    error: detailedReportError
  } = useQuery({
    queryKey: ['/api/admin/pubsub-validation-reports', detailedReportId],
    queryFn: async () => {
      if (!detailedReportId) return null;
      const response = await axios.get(`/api/admin/pubsub-validation-reports/${detailedReportId}`);
      return response.data.report;
    },
    enabled: !!detailedReportId, // Only run when a report ID is selected
  });
  
  // Mutation for triggering validation
  const triggerValidation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/admin/trigger-pubsub-validation', {
        collections: selectedCollections
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pubsub-validation-reports'] });
    }
  });
  
  // Toggle collection selection
  const toggleCollection = (collection: string) => {
    setSelectedCollections(prev => 
      prev.includes(collection)
        ? prev.filter(c => c !== collection)
        : [...prev, collection]
    );
  };
  
  // Get active report (if any)
  const activeReport = reportsData?.reports?.find(r => 
    r.status === 'processing' || r.status === 'started'
  );
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>PubSub Media Validation</CardTitle>
          <CardDescription>
            Trigger media validation jobs and view results using the Google Cloud Pub/Sub system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Select Collections to Validate</h3>
                <div className="space-y-2">
                  {DEFAULT_COLLECTIONS.map(collection => (
                    <div key={collection} className="flex items-center space-x-2">
                      <Checkbox
                        id={`collection-${collection}`}
                        checked={selectedCollections.includes(collection)}
                        onCheckedChange={() => toggleCollection(collection)}
                      />
                      <label
                        htmlFor={`collection-${collection}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {collection}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Validation Status</h3>
                {activeReport ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        <StatusBadge status={activeReport.status} />
                      </span>
                      <span className="text-sm text-gray-500">
                        Started: {formatDate(activeReport.started)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>
                          {activeReport.completedCollections}/{activeReport.totalCollections} collections
                        </span>
                      </div>
                      <Progress 
                        value={activeReport.progress || 0} 
                        className="h-2" 
                      />
                    </div>
                    {activeReport.currentCollection && (
                      <div className="text-xs text-gray-500">
                        Currently processing: {activeReport.currentCollection}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    No active validation tasks
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/pubsub-validation-reports'] })}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => triggerValidation.mutate()}
            disabled={triggerValidation.isPending || !!activeReport || selectedCollections.length === 0}
          >
            {triggerValidation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Triggering...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Trigger Validation
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Show any errors */}
      {isReportsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {reportsError instanceof Error ? reportsError.message : 'Error loading validation reports'}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Validation reports table */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Reports</CardTitle>
          <CardDescription>
            Recent media validation reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingReports ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <Table>
              <TableCaption>A list of recent media validation reports</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Collections</TableHead>
                  <TableHead>Task ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsData?.reports?.length > 0 ? (
                  reportsData.reports.map((report) => (
                    <TableRow key={report.id} className={report.id === detailedReportId ? 'bg-gray-100' : ''}>
                      <TableCell><StatusBadge status={report.status} /></TableCell>
                      <TableCell>{formatDate(report.started)}</TableCell>
                      <TableCell>{report.completed ? formatDate(report.completed) : 'In progress'}</TableCell>
                      <TableCell>
                        {report.duration ? formatDuration(report.duration) : 
                         (report.started && report.status !== 'completed' ? 
                          formatDuration(Date.now() - report.started) + ' (so far)' : 'N/A')}
                      </TableCell>
                      <TableCell>{report.totalCollections || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-xs">{report.taskId || 'N/A'}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailedReportId(report.id === detailedReportId ? null : report.id)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          {report.id === detailedReportId ? 'Hide' : 'View'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">No reports found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Detailed report view */}
      {detailedReportId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Report Details</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDetailedReportId(null)}
              >
                Close
              </Button>
            </CardTitle>
            <CardDescription>
              Detailed information about validation report: {detailedReportId}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDetailedReport ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : isDetailedReportError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {detailedReportError instanceof Error ? detailedReportError.message : 'Error loading detailed report'}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-6">
                {/* Report metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Report Information</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <StatusBadge status={detailedReport?.status} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Started:</span>
                        <span>{formatDate(detailedReport?.started)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Completed:</span>
                        <span>{detailedReport?.completed ? formatDate(detailedReport.completed) : 'In progress'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Duration:</span>
                        <span>
                          {detailedReport?.duration ? formatDuration(detailedReport.duration) : 
                          (detailedReport?.started && detailedReport?.status !== 'completed' ? 
                            formatDuration(Date.now() - detailedReport.started) + ' (so far)' : 'N/A')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Task ID:</span>
                        <span className="font-mono text-xs">{detailedReport?.taskId || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Progress</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Collections Processed</span>
                        <span>
                          {detailedReport?.completedCollections || 0}/{detailedReport?.totalCollections || 0}
                        </span>
                      </div>
                      <Progress 
                        value={detailedReport?.completedCollections && detailedReport?.totalCollections ? 
                          (detailedReport.completedCollections / detailedReport.totalCollections) * 100 : 0} 
                        className="h-2" 
                      />
                      {detailedReport?.currentCollection && detailedReport?.status !== 'completed' && (
                        <div className="text-xs text-gray-500 mt-1">
                          Currently processing: {detailedReport.currentCollection}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Collection summaries */}
                {detailedReport?.collections && Object.keys(detailedReport.collections).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Collection Summaries</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Collection</TableHead>
                          <TableHead>Total URLs</TableHead>
                          <TableHead>Valid</TableHead>
                          <TableHead>Invalid</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(detailedReport.collections).map(([collectionName, collectionData]) => (
                          <TableRow key={collectionName}>
                            <TableCell>{collectionName}</TableCell>
                            <TableCell>{collectionData.totalUrls || 0}</TableCell>
                            <TableCell>{collectionData.validUrls || 0}</TableCell>
                            <TableCell>{collectionData.invalidUrls || 0}</TableCell>
                            <TableCell>
                              {collectionData.completedAt ? (
                                <Badge className="bg-green-500">Completed</Badge>
                              ) : (
                                <Badge className="bg-yellow-500">In Progress</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {/* Invalid URLs */}
                {detailedReport?.invalidUrls && detailedReport.invalidUrls.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Invalid URLs</h3>
                    <div className="overflow-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Collection</TableHead>
                            <TableHead>Document</TableHead>
                            <TableHead>Field</TableHead>
                            <TableHead>URL</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailedReport.invalidUrls.map((invalidUrl, index) => (
                            <TableRow key={index}>
                              <TableCell>{invalidUrl.collection}</TableCell>
                              <TableCell className="font-mono text-xs">{invalidUrl.documentId}</TableCell>
                              <TableCell className="font-mono text-xs">{invalidUrl.field}</TableCell>
                              <TableCell className="font-mono text-xs break-all">
                                <div className="max-w-xs truncate">
                                  {invalidUrl.url}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                                  {invalidUrl.error}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PubSubValidation;