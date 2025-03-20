/**
 * Media Validation Panel Component
 * 
 * This component provides an admin interface for managing media validation tasks,
 * viewing validation reports, and initiating validation or repair operations.
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, Clock, FileImage, RefreshCw, Wrench } from 'lucide-react';

// Types for validation reports
interface ValidationReport {
  reportId: string;
  startTime: any; // Timestamp
  endTime?: any; // Timestamp
  totalDocuments: number;
  totalMediaItems: number;
  validItems: number;
  invalidItems: number;
  missingItems: number;
  collections: {
    [collectionName: string]: {
      totalUrls: number;
      valid: number;
      invalid: number;
      missing: number;
    }
  };
  invalidItemDetails?: {
    collectionName: string;
    documentId: string;
    fieldPath: string;
    url: string;
    reason: string;
    status?: number;
    error?: string;
  }[];
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

// Types for URL fix reports
interface UrlFixReport {
  reportId: string;
  startTime: any; // Timestamp
  endTime?: any; // Timestamp
  totalDocuments: number;
  fixedDocuments: number;
  totalFixedUrls: number;
  collections: {
    [collectionName: string]: {
      totalDocuments: number;
      fixedDocuments: number;
      totalFixedUrls: number;
    }
  };
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

// Types for validation tasks
interface ValidationTask {
  taskId: string;
  type: 'validate-all' | 'validate-collection' | 'fix-relative-urls';
  collectionName?: string;
  documentId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime?: any; // Timestamp
  endTime?: any; // Timestamp
  retryCount: number;
  lastUpdate: any; // Timestamp
  reportId?: string;
}

// Types for validation schedules
interface ValidationSchedule {
  id: string;
  type: 'validate-all' | 'fix-relative-urls';
  enabled: boolean;
  lastRun?: any; // Timestamp
  nextRun?: any; // Timestamp
  intervalHours?: number;
  status: 'active' | 'disabled' | 'failed';
}

/**
 * Media Validation Panel Component
 */
export const MediaValidationPanel: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('reports');
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  
  // Fetch validation reports
  const {
    data: validationReports,
    isLoading: isLoadingReports,
    error: reportsError
  } = useQuery({
    queryKey: ['/api/admin/media-validation-reports'],
    enabled: activeTab === 'reports'
  });
  
  // Fetch URL fix reports
  const {
    data: urlFixReports,
    isLoading: isLoadingFixReports,
    error: fixReportsError
  } = useQuery({
    queryKey: ['/api/admin/url-fix-reports'],
    enabled: activeTab === 'reports'
  });
  
  // Fetch active tasks
  const {
    data: activeTasks,
    isLoading: isLoadingTasks,
    error: tasksError
  } = useQuery({
    queryKey: ['/api/admin/validation-tasks'],
    refetchInterval: 5000, // Refresh every 5 seconds
    enabled: activeTab === 'tasks'
  });
  
  // Fetch validation schedules
  const {
    data: schedules,
    isLoading: isLoadingSchedules,
    error: schedulesError
  } = useQuery({
    queryKey: ['/api/admin/schedules'],
    enabled: activeTab === 'schedules'
  });
  
  // Fetch available collections
  const {
    data: collections,
    isLoading: isLoadingCollections
  } = useQuery({
    queryKey: ['/api/admin/collections']
  });
  
  // Start validation mutation
  const startValidation = useMutation({
    mutationFn: () => apiRequest('/api/admin/validate-media', { method: 'POST' }),
    onSuccess: (data) => {
      toast({
        title: 'Validation Started',
        description: `Task ID: ${data.taskId}`,
        duration: 3000
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/validation-tasks'] });
      setActiveTab('tasks');
    },
    onError: (error) => {
      toast({
        title: 'Error Starting Validation',
        description: error.message || 'Unknown error',
        variant: 'destructive',
        duration: 5000
      });
    }
  });
  
  // Validate collection mutation
  const validateCollection = useMutation({
    mutationFn: (collection: string) => apiRequest('/api/admin/validate-collection', {
      method: 'POST',
      body: { collection }
    }),
    onSuccess: (data) => {
      toast({
        title: 'Collection Validation Started',
        description: `Validating: ${data.collection}`,
        duration: 3000
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/validation-tasks'] });
      setActiveTab('tasks');
    },
    onError: (error) => {
      toast({
        title: 'Error Starting Collection Validation',
        description: error.message || 'Unknown error',
        variant: 'destructive',
        duration: 5000
      });
    }
  });
  
  // Fix relative URLs mutation
  const fixRelativeUrls = useMutation({
    mutationFn: () => apiRequest('/api/admin/fix-relative-urls', { method: 'POST' }),
    onSuccess: (data) => {
      toast({
        title: 'URL Fix Started',
        description: `Task ID: ${data.taskId}`,
        duration: 3000
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/validation-tasks'] });
      setActiveTab('tasks');
    },
    onError: (error) => {
      toast({
        title: 'Error Starting URL Fix',
        description: error.message || 'Unknown error',
        variant: 'destructive',
        duration: 5000
      });
    }
  });
  
  // Update schedule mutation
  const updateSchedule = useMutation({
    mutationFn: (schedule: Partial<ValidationSchedule> & { id: string }) => 
      apiRequest(`/api/admin/schedules/${schedule.id}`, {
        method: 'PUT',
        body: schedule
      }),
    onSuccess: () => {
      toast({
        title: 'Schedule Updated',
        description: 'Validation schedule has been updated',
        duration: 3000
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schedules'] });
    },
    onError: (error) => {
      toast({
        title: 'Error Updating Schedule',
        description: error.message || 'Unknown error',
        variant: 'destructive',
        duration: 5000
      });
    }
  });
  
  // Format timestamp
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    
    try {
      // Check if it's a Firestore timestamp
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleString();
      }
      
      // Check if it's a seconds/nanoseconds object
      if (timestamp._seconds) {
        return new Date(timestamp._seconds * 1000).toLocaleString();
      }
      
      // Regular Date
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };
  
  // Calculate validation progress percentage
  const calculateProgress = (report: ValidationReport): number => {
    if (report.status === 'completed') return 100;
    if (report.status === 'failed') return 0;
    
    // Calculate progress based on processed items
    const totalItems = report.totalMediaItems;
    if (totalItems === 0) return 0;
    
    const processedItems = report.validItems + report.invalidItems + report.missingItems;
    return Math.min(Math.round((processedItems / totalItems) * 100), 99); // Cap at 99% until completed
  };
  
  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'running':
      case 'processing':
        return 'text-blue-500';
      case 'pending':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'running':
      case 'processing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };
  
  // Handle start validation click
  const handleStartValidation = () => {
    startValidation.mutate();
  };
  
  // Handle validate collection click
  const handleValidateCollection = () => {
    if (selectedCollection) {
      validateCollection.mutate(selectedCollection);
    } else {
      toast({
        title: 'Error',
        description: 'Please select a collection to validate',
        variant: 'destructive',
        duration: 3000
      });
    }
  };
  
  // Handle fix URLs click
  const handleFixUrls = () => {
    fixRelativeUrls.mutate();
  };
  
  // Handle toggle schedule click
  const handleToggleSchedule = (schedule: ValidationSchedule) => {
    updateSchedule.mutate({
      id: schedule.id,
      enabled: !schedule.enabled
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Media Validation</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleStartValidation}
            disabled={startValidation.isPending}
            className="flex items-center gap-2"
          >
            <FileImage className="h-4 w-4" />
            {startValidation.isPending ? 'Starting...' : 'Validate All Media'}
          </Button>
          <Button
            size="sm"
            onClick={handleFixUrls}
            disabled={fixRelativeUrls.isPending}
            className="flex items-center gap-2"
          >
            <Wrench className="h-4 w-4" />
            {fixRelativeUrls.isPending ? 'Starting...' : 'Fix Relative URLs'}
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="reports" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports">Validation Reports</TabsTrigger>
          <TabsTrigger value="tasks">Active Tasks</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports" className="space-y-4 mt-4">
          {isLoadingReports ? (
            <div className="flex justify-center py-8">Loading reports...</div>
          ) : reportsError ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800">
              Error loading reports: {(reportsError as Error).message}
            </div>
          ) : validationReports?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No validation reports found. Start a validation to generate reports.
            </div>
          ) : (
            <div className="space-y-4">
              {validationReports?.map((report: ValidationReport) => (
                <Card key={report.reportId}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Report {report.reportId.substring(0, 8)}</CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(report.status)}
                        <span className={getStatusColor(report.status)}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <CardDescription>
                      Started: {formatTimestamp(report.startTime)}
                      {report.endTime && ` • Completed: ${formatTimestamp(report.endTime)}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{calculateProgress(report)}%</span>
                        </div>
                        <Progress value={calculateProgress(report)} />
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <div className="text-xl font-semibold">{report.totalDocuments}</div>
                          <div className="text-xs text-muted-foreground">Documents</div>
                        </div>
                        <div>
                          <div className="text-xl font-semibold">{report.totalMediaItems}</div>
                          <div className="text-xs text-muted-foreground">Media Items</div>
                        </div>
                        <div>
                          <div className="text-xl font-semibold text-green-500">{report.validItems}</div>
                          <div className="text-xs text-muted-foreground">Valid</div>
                        </div>
                        <div>
                          <div className="text-xl font-semibold text-red-500">{report.invalidItems}</div>
                          <div className="text-xs text-muted-foreground">Invalid</div>
                        </div>
                      </div>
                      
                      {report.invalidItemDetails && report.invalidItemDetails.length > 0 && (
                        <div className="mt-4">
                          <div className="font-medium text-sm mb-2">Invalid Media Items:</div>
                          <ScrollArea className="h-[150px] w-full rounded-md border p-2">
                            <div className="space-y-2">
                              {report.invalidItemDetails.slice(0, 10).map((item, index) => (
                                <div key={index} className="text-xs border-b pb-2">
                                  <div className="font-medium">{item.collectionName}/{item.documentId}</div>
                                  <div className="text-muted-foreground">Field: {item.fieldPath}</div>
                                  <div className="truncate max-w-full">URL: {item.url}</div>
                                  <div className="text-red-500">{item.reason}: {item.error}</div>
                                </div>
                              ))}
                              {report.invalidItemDetails.length > 10 && (
                                <div className="text-xs text-muted-foreground text-center">
                                  {report.invalidItemDetails.length - 10} more items not shown
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
                      <div>ID: {report.reportId}</div>
                      {report.error && (
                        <div className="text-red-500">{report.error}</div>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
          
          <h3 className="text-lg font-medium mt-8 mb-4">URL Fix Reports</h3>
          
          {isLoadingFixReports ? (
            <div className="flex justify-center py-8">Loading URL fix reports...</div>
          ) : fixReportsError ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800">
              Error loading URL fix reports: {(fixReportsError as Error).message}
            </div>
          ) : !urlFixReports || urlFixReports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No URL fix reports found. Fix relative URLs to generate reports.
            </div>
          ) : (
            <div className="space-y-4">
              {urlFixReports.map((report: UrlFixReport) => (
                <Card key={report.reportId}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">URL Fix {report.reportId.substring(0, 8)}</CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(report.status)}
                        <span className={getStatusColor(report.status)}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <CardDescription>
                      Started: {formatTimestamp(report.startTime)}
                      {report.endTime && ` • Completed: ${formatTimestamp(report.endTime)}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-xl font-semibold">{report.totalDocuments}</div>
                        <div className="text-xs text-muted-foreground">Documents Scanned</div>
                      </div>
                      <div>
                        <div className="text-xl font-semibold">{report.fixedDocuments}</div>
                        <div className="text-xs text-muted-foreground">Documents Fixed</div>
                      </div>
                      <div>
                        <div className="text-xl font-semibold">{report.totalFixedUrls}</div>
                        <div className="text-xs text-muted-foreground">URLs Fixed</div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
                      <div>ID: {report.reportId}</div>
                      {report.error && (
                        <div className="text-red-500">{report.error}</div>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="tasks" className="space-y-4 mt-4">
          <div className="flex gap-4 mb-6">
            <div className="w-2/3">
              <div className="flex gap-2 items-center">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  disabled={isLoadingCollections || !collections}
                >
                  <option value="">Select a collection</option>
                  {collections?.map((collection: string) => (
                    <option key={collection} value={collection}>
                      {collection}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleValidateCollection}
                  disabled={!selectedCollection || validateCollection.isPending}
                >
                  {validateCollection.isPending ? 'Starting...' : 'Validate Collection'}
                </Button>
              </div>
            </div>
          </div>
          
          {isLoadingTasks ? (
            <div className="flex justify-center py-8">Loading tasks...</div>
          ) : tasksError ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800">
              Error loading tasks: {(tasksError as Error).message}
            </div>
          ) : !activeTasks || activeTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active validation tasks found.
            </div>
          ) : (
            <div className="space-y-4">
              {activeTasks.map((task: ValidationTask) => (
                <Card key={task.taskId}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">
                        {task.type === 'validate-all' ? 'Validate All Media' :
                          task.type === 'validate-collection' ? `Validate Collection: ${task.collectionName}` :
                          'Fix Relative URLs'}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className={getStatusColor(task.status)}>
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <CardDescription>
                      Task ID: {task.taskId.substring(0, 8)}
                      {task.startTime && ` • Started: ${formatTimestamp(task.startTime)}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium">Status</div>
                        <div className="text-sm">
                          {task.status === 'pending' ? 'Waiting to be processed' :
                           task.status === 'processing' ? 'Currently processing' :
                           task.status === 'completed' ? 'Completed successfully' :
                           'Failed to process'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Last Updated</div>
                        <div className="text-sm">{formatTimestamp(task.lastUpdate)}</div>
                      </div>
                    </div>
                    
                    {task.reportId && (
                      <div className="mt-4">
                        <div className="text-sm font-medium">Report ID</div>
                        <div className="text-sm">{task.reportId}</div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
                      <div>Retry Count: {task.retryCount}</div>
                      {task.endTime && (
                        <div>Completed: {formatTimestamp(task.endTime)}</div>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="schedules" className="space-y-4 mt-4">
          {isLoadingSchedules ? (
            <div className="flex justify-center py-8">Loading schedules...</div>
          ) : schedulesError ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800">
              Error loading schedules: {(schedulesError as Error).message}
            </div>
          ) : !schedules || schedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No validation schedules found.
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule: ValidationSchedule) => (
                <Card key={schedule.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">
                        {schedule.type === 'validate-all' ? 'Regular Media Validation' : 'Regular URL Fixing'}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className={schedule.enabled ? 'text-green-500' : 'text-red-500'}>
                          {schedule.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    <CardDescription>
                      Runs every {schedule.intervalHours} hours
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium">Last Run</div>
                        <div className="text-sm">
                          {schedule.lastRun ? formatTimestamp(schedule.lastRun) : 'Never'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Next Run</div>
                        <div className="text-sm">
                          {schedule.nextRun ? formatTimestamp(schedule.nextRun) : 'Not scheduled'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant={schedule.enabled ? 'outline' : 'default'}
                      onClick={() => handleToggleSchedule(schedule)}
                      disabled={updateSchedule.isPending}
                    >
                      {schedule.enabled ? 'Disable Schedule' : 'Enable Schedule'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};