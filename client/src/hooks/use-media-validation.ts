/**
 * Media Validation Hook
 * 
 * This hook provides functionality for validating and fixing media URLs.
 * It's designed to be used with the MediaValidationPanel component.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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

/**
 * Hook for media validation operations
 */
export const useMediaValidation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('reports');
  
  // Fetch validation reports
  const {
    data: validationReports,
    isLoading: isLoadingReports,
    error: reportsError
  } = useQuery<ValidationReport[]>({
    queryKey: ['/api/admin/media-validation-reports'],
    enabled: activeTab === 'reports',
    refetchInterval: activeTab === 'reports' ? 30000 : false // Refresh every 30 seconds when viewing reports
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
  } = useQuery<ValidationTask[]>({
    queryKey: ['/api/admin/validation-tasks'],
    refetchInterval: activeTab === 'tasks' ? 5000 : false, // Refresh every 5 seconds when viewing tasks
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
  const validateMediaMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/admin/validate-media', { 
        method: 'POST' 
      }) as Promise<{ taskId: string }>,
    onSuccess: (data) => {
      toast({
        title: 'Validation Started',
        description: `Task ID: ${data.taskId}`,
        duration: 3000
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/validation-tasks'] });
      setActiveTab('tasks');
    },
    onError: (error: any) => {
      toast({
        title: 'Error Starting Validation',
        description: error.message || 'Unknown error',
        variant: 'destructive',
        duration: 5000
      });
    }
  });
  
  // Validate collection mutation
  const validateCollectionMutation = useMutation({
    mutationFn: (collection: string) => 
      apiRequest('/api/admin/validate-collection', {
        method: 'POST',
        body: { collection }
      }) as Promise<{ taskId: string; collection: string }>,
    onSuccess: (data) => {
      toast({
        title: 'Collection Validation Started',
        description: `Validating: ${data.collection}`,
        duration: 3000
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/validation-tasks'] });
      setActiveTab('tasks');
    },
    onError: (error: any) => {
      toast({
        title: 'Error Starting Collection Validation',
        description: error.message || 'Unknown error',
        variant: 'destructive',
        duration: 5000
      });
    }
  });
  
  // Fix relative URLs mutation
  const fixRelativeUrlsMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/admin/fix-relative-urls', { 
        method: 'POST' 
      }) as Promise<{ taskId: string }>,
    onSuccess: (data) => {
      toast({
        title: 'URL Fix Started',
        description: `Task ID: ${data.taskId}`,
        duration: 3000
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/validation-tasks'] });
      setActiveTab('tasks');
    },
    onError: (error: any) => {
      toast({
        title: 'Error Starting URL Fix',
        description: error.message || 'Unknown error',
        variant: 'destructive',
        duration: 5000
      });
    }
  });
  
  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: (schedule: { id: string; enabled?: boolean; intervalHours?: number }) => 
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
    onError: (error: any) => {
      toast({
        title: 'Error Updating Schedule',
        description: error.message || 'Unknown error',
        variant: 'destructive',
        duration: 5000
      });
    }
  });
  
  // Format timestamp for display
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
  
  // Start a validation for all collections
  const startValidation = () => {
    validateMediaMutation.mutate();
  };
  
  // Validate a specific collection
  const validateCollection = (collectionName: string) => {
    if (!collectionName) {
      toast({
        title: 'Error',
        description: 'Please select a collection to validate',
        variant: 'destructive',
        duration: 3000
      });
      return;
    }
    
    validateCollectionMutation.mutate(collectionName);
  };
  
  // Fix relative URLs
  const fixRelativeUrls = () => {
    fixRelativeUrlsMutation.mutate();
  };
  
  // Toggle schedule enabled status
  const toggleSchedule = (scheduleId: string, enabled: boolean) => {
    updateScheduleMutation.mutate({
      id: scheduleId,
      enabled: !enabled
    });
  };
  
  // Update schedule interval
  const updateScheduleInterval = (scheduleId: string, intervalHours: number) => {
    if (intervalHours < 1) {
      toast({
        title: 'Error',
        description: 'Interval must be at least 1 hour',
        variant: 'destructive',
        duration: 3000
      });
      return;
    }
    
    updateScheduleMutation.mutate({
      id: scheduleId,
      intervalHours
    });
  };
  
  return {
    // Data
    validationReports,
    urlFixReports,
    activeTasks,
    schedules,
    collections,
    
    // Loading states
    isLoading: isLoadingReports || isLoadingFixReports || isLoadingTasks || isLoadingSchedules || isLoadingCollections,
    isValidating: validateMediaMutation.isPending || validateCollectionMutation.isPending,
    isFixing: fixRelativeUrlsMutation.isPending,
    isUpdatingSchedule: updateScheduleMutation.isPending,
    
    // Errors
    reportsError,
    fixReportsError,
    tasksError,
    schedulesError,
    
    // Actions
    startValidation,
    validateCollection,
    fixRelativeUrls,
    toggleSchedule,
    updateScheduleInterval,
    
    // UI state
    activeTab,
    setActiveTab,
    
    // Helper functions
    formatTimestamp,
    calculateProgress
  };
};