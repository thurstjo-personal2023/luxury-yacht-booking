/**
 * Media Validation Hook
 * 
 * This hook provides a way to interact with the media validation functions
 * in the Etoile Yachts platform. It includes functionality to:
 * - Fetch validation reports
 * - Fetch validation tasks
 * - Trigger validation
 * - Fix invalid URLs
 * - View validation results
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useToast } from './use-toast';

/**
 * Validation report interface
 */
interface ValidationReport {
  id: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  duration: number;
  totalDocuments: number;
  totalFields: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  collectionSummaries: CollectionSummary[];
}

/**
 * Collection summary interface
 */
interface CollectionSummary {
  collection: string;
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  validPercent: number;
  invalidPercent: number;
  missingPercent: number;
}

/**
 * Validation task interface
 */
interface ValidationTask {
  taskId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  reportId?: string;
  result?: {
    totalDocuments: number;
    validUrls: number;
    invalidUrls: number;
    missingUrls: number;
    duration: number;
  };
  metadata?: {
    triggerType: 'manual' | 'scheduled';
    triggeredBy?: string;
    triggerTime?: string;
  };
}

/**
 * Invalid URL result interface
 */
interface InvalidUrlResult {
  collection: string;
  documentId: string;
  field: string;
  url: string;
  error: string;
  status?: number;
  statusText?: string;
  isValid: boolean;
}

/**
 * Validation options interface
 */
interface ValidationOptions {
  autoFix?: boolean;
  collections?: string[];
}

/**
 * Media validation hook
 * 
 * @returns Media validation related functions and state
 */
export function useMediaValidation() {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [invalidResults, setInvalidResults] = useState<InvalidUrlResult[]>([]);
  
  // Fetch validation reports
  const { 
    data: reportsData,
    isLoading: isLoadingReports,
    error: reportsError,
    refetch: refetchReports
  } = useQuery({
    queryKey: ['validation-reports'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/admin/validate-reports');
        return response.data;
      } catch (error) {
        console.error('Error fetching validation reports:', error);
        throw error;
      }
    },
    enabled: false // Don't fetch automatically
  });
  
  // Fetch validation tasks
  const { 
    data: tasksData,
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch: refetchTasks
  } = useQuery({
    queryKey: ['validation-tasks'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/admin/validate-tasks');
        return response.data;
      } catch (error) {
        console.error('Error fetching validation tasks:', error);
        throw error;
      }
    },
    enabled: false // Don't fetch automatically
  });
  
  // Fetch invalid results for a report
  const { 
    data: invalidResultsData,
    isLoading: isLoadingInvalidResults,
    error: invalidResultsError,
    refetch: refetchInvalidResults
  } = useQuery({
    queryKey: ['validation-invalid-results', selectedReport],
    queryFn: async () => {
      if (!selectedReport) return { invalidResults: [] };
      
      try {
        const response = await axios.get(`/api/admin/validate-reports/${selectedReport}/invalid-results`);
        return response.data;
      } catch (error) {
        console.error('Error fetching invalid results:', error);
        throw error;
      }
    },
    enabled: !!selectedReport // Only fetch when a report is selected
  });
  
  // Trigger validation mutation
  const { 
    mutate: triggerValidationMutate,
    isPending: isTriggeringValidation,
    error: triggerError
  } = useMutation({
    mutationFn: async (options: ValidationOptions = {}) => {
      try {
        const response = await axios.post('/api/admin/trigger-validation', options);
        return response.data;
      } catch (error) {
        console.error('Error triggering validation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Validation triggered",
        description: `Task ID: ${data.taskId}`,
      });
      
      // Refetch tasks after triggering validation
      refetchTasks();
    },
    onError: (error) => {
      toast({
        title: "Error triggering validation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  });
  
  // Fix document URLs mutation
  const { 
    mutate: fixDocumentUrlsMutate,
    isPending: isFixingUrls,
    error: fixError
  } = useMutation({
    mutationFn: async ({ collection, documentId }: { collection: string, documentId: string }) => {
      try {
        const response = await axios.post('/api/admin/fix-urls', { collection, documentId });
        return response.data;
      } catch (error) {
        console.error('Error fixing document URLs:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Document URLs fixed",
        description: `Fixed ${data.fixedFields} invalid URLs`,
      });
      
      // Refetch invalid results after fixing URLs
      if (selectedReport) {
        refetchInvalidResults();
      }
    },
    onError: (error) => {
      toast({
        title: "Error fixing URLs",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  });
  
  // Update invalid results when data changes
  useEffect(() => {
    if (invalidResultsData?.invalidResults) {
      setInvalidResults(invalidResultsData.invalidResults);
    }
  }, [invalidResultsData]);
  
  // Initial data fetch
  useEffect(() => {
    refetchReports();
    refetchTasks();
  }, [refetchReports, refetchTasks]);
  
  // Trigger validation function
  const triggerValidation = (options: ValidationOptions = {}) => {
    triggerValidationMutate(options);
  };
  
  // Fix document URLs function
  const fixDocumentUrls = (collection: string, documentId: string) => {
    fixDocumentUrlsMutate({ collection, documentId });
  };
  
  return {
    // Data
    reports: reportsData?.reports || [],
    tasks: tasksData?.tasks || [],
    invalidResults,
    selectedReport,
    setSelectedReport,
    
    // Loading states
    isLoading: isLoadingReports || isLoadingTasks || isLoadingInvalidResults,
    isTriggeringValidation,
    isFixingUrls,
    
    // Errors
    error: reportsError || tasksError || invalidResultsError || triggerError || fixError,
    
    // Actions
    triggerValidation,
    fixDocumentUrls,
    refetchReports,
    refetchTasks,
    refetchInvalidResults
  };
}