import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApiRequest, adminApiRequestWithRetry, createAdminQueryFn, handleAdminApiError } from '@/lib/adminApiUtils';

/**
 * Represents a single media validation result for an individual URL
 */
interface ValidationResult {
  field: string;
  url: string;
  isValid: boolean;
  status?: number;
  statusText?: string;
  error?: string;
  collection: string;
  documentId: string;
}

/**
 * Collection statistics in standardized format
 */
interface CollectionStats {
  total: number;
  valid: number;
  invalid: number;
  missing: number;
}

/**
 * Statistics about the validation run
 */
interface ValidationStats {
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
  byCollection: Record<string, CollectionStats>;
}

/**
 * Standard validation report format
 */
interface ValidationReport {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  
  // Primary statistics
  stats: ValidationStats;
  
  // Invalid results for detailed reporting
  invalid: ValidationResult[];
  
  // For repair reports
  errors?: string[];
  timestamp?: Date;
}

interface ProgressState {
  total: number;
  processed: number;
}

interface MediaValidationProps {
  reports: ValidationReport[];
  latestReport: ValidationReport | null;
  isValidating: boolean;
  validationProgress: ProgressState;
  isRepairing: boolean;
  repairProgress: ProgressState;
  startValidation: () => void;
  startRepair: () => void;
  error: string | null;
}

export const useMediaValidation = (): MediaValidationProps => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [validationProgress, setValidationProgress] = useState<ProgressState>({ total: 0, processed: 0 });
  const [repairProgress, setRepairProgress] = useState<ProgressState>({ total: 0, processed: 0 });

  // Transform dates in the reports from strings to Date objects with improved validation
  const transformReports = (reports: any[]): ValidationReport[] => {
    return reports.map(report => {
      // Create a safe date converter function
      const safeDate = (dateValue: any): Date | null => {
        if (!dateValue) return null;
        
        let dateObj: Date;
        if (dateValue instanceof Date) {
          dateObj = dateValue;
        } else if (typeof dateValue === 'number') {
          dateObj = new Date(dateValue);
        } else if (typeof dateValue === 'string') {
          // Try to parse the string as a date
          dateObj = new Date(dateValue);
          
          // Check if the date is valid
          if (isNaN(dateObj.getTime())) {
            console.warn(`Invalid date string encountered: ${dateValue}`);
            return null;
          }
        } else {
          console.warn(`Unsupported date format: ${typeof dateValue}`);
          return null;
        }
        
        // Final validity check
        return isNaN(dateObj.getTime()) ? null : dateObj;
      };
      
      // Create transformed report with safe dates
      const transformed = {
        ...report,
        startTime: safeDate(report.startTime) || new Date(0),  // Fallback to epoch
        endTime: safeDate(report.endTime) || new Date()        // Fallback to now
      };
      
      // If the report has a timestamp property (used in some report types)
      if (report.timestamp) {
        transformed.timestamp = safeDate(report.timestamp) || new Date();
      }
      
      return transformed;
    });
  };

  // Fetch validation reports
  const { 
    data: reportsData = { reports: [] },
    isLoading: isLoadingReports,
    refetch: refetchReports 
  } = useQuery({
    queryKey: ['/api/admin/media-validation-reports'],
    queryFn: async ({ queryKey }) => {
      try {
        const url = queryKey[0] as string;
        const response = await adminApiRequestWithRetry(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch validation reports: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        setError(`Error fetching reports: ${handleAdminApiError(error)}`);
        return { reports: [] };
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds to get updates during validation
  });

  // Transform and process the reports
  const reports: ValidationReport[] = reportsData.reports ? transformReports(reportsData.reports) : [];
  
  // Get the latest report
  const latestReport = reports.length > 0 
    ? reports.sort((a: ValidationReport, b: ValidationReport) => b.endTime.getTime() - a.endTime.getTime())[0]
    : null;

  // Check if validation is in progress
  const { 
    data: validationStatus,
    isLoading: isLoadingStatus,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['/api/admin/media-validation-status'],
    queryFn: async ({ queryKey }) => {
      try {
        const url = queryKey[0] as string;
        const response = await adminApiRequestWithRetry(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch validation status: ${response.status} ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        setError(`Error fetching status: ${handleAdminApiError(error)}`);
        return { isValidating: false, isRepairing: false };
      }
    },
    refetchInterval: 2000, // Check more frequently during validation
  });

  // Start validation mutation
  const { mutate: startValidationMutation, isPending: isStartingValidation } = useMutation({
    mutationFn: async () => {
      const response = await adminApiRequestWithRetry('/api/admin/validate-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start validation: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      setError(null);
      // Immediately refetch status to show validation is in progress
      refetchStatus();
      // Also refetch reports in case a new report was created
      refetchReports();
    },
    onError: (error) => {
      setError(`Failed to start validation: ${handleAdminApiError(error)}`);
    },
  });

  // Start repair mutation
  const { mutate: startRepairMutation, isPending: isStartingRepair } = useMutation({
    mutationFn: async () => {
      const response = await adminApiRequestWithRetry('/api/admin/fix-media-issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start repair: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      setError(null);
      refetchStatus();
      refetchReports();
    },
    onError: (error) => {
      setError(`Failed to start repair: ${handleAdminApiError(error)}`);
    },
  });

  // Poll progress while validating or repairing
  useEffect(() => {
    if (!validationStatus) return;
    
    let intervalId: NodeJS.Timeout;
    
    if (validationStatus.isValidating || validationStatus.isRepairing) {
      intervalId = setInterval(async () => {
        try {
          const endpoint = validationStatus.isValidating 
            ? '/api/admin/validation-progress' 
            : '/api/admin/repair-progress';
          
          const response = await adminApiRequestWithRetry(endpoint);
          if (!response.ok) return;
          
          const data = await response.json();
          
          if (validationStatus.isValidating) {
            setValidationProgress(data);
          } else {
            setRepairProgress(data);
          }
        } catch (error) {
          console.error('Error fetching progress:', handleAdminApiError(error));
        }
      }, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [validationStatus]);

  // Refresh data when status changes
  useEffect(() => {
    if (validationStatus) {
      const wasValidating = validationStatus.isValidating;
      const wasRepairing = validationStatus.isRepairing;
      
      // If validation or repair just completed, refetch reports
      if (!wasValidating && !wasRepairing) {
        // Reset progress
        setValidationProgress({ total: 0, processed: 0 });
        setRepairProgress({ total: 0, processed: 0 });
        
        // Small delay to ensure the reports have been updated on the server
        setTimeout(() => {
          refetchReports();
        }, 1000);
      }
    }
  }, [validationStatus, refetchReports]);

  // Start validation function
  const startValidation = useCallback(() => {
    setError(null);
    startValidationMutation();
  }, [startValidationMutation]);

  // Start repair function
  const startRepair = useCallback(() => {
    setError(null);
    startRepairMutation();
  }, [startRepairMutation]);

  // Determine if validating/repairing based on status or pending mutation
  const isValidating = !!(
    (validationStatus?.isValidating) || 
    isStartingValidation || 
    isLoadingStatus
  );
  
  const isRepairing = !!(
    (validationStatus?.isRepairing) || 
    isStartingRepair
  );

  return {
    reports,
    latestReport,
    isValidating,
    validationProgress,
    isRepairing,
    repairProgress,
    startValidation,
    startRepair,
    error
  };
};