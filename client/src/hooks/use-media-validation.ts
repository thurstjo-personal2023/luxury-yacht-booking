import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

interface ValidationReport {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalDocuments: number;
  totalFields: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  collectionSummaries: CollectionSummary[];
  invalidResults: ValidationResult[];
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

  // Transform dates in the reports from strings to Date objects
  const transformReports = (reports: any[]): ValidationReport[] => {
    return reports.map(report => ({
      ...report,
      startTime: new Date(report.startTime),
      endTime: new Date(report.endTime)
    }));
  };

  // Fetch validation reports
  const { 
    data: reports = [],
    isLoading: isLoadingReports,
    refetch: refetchReports 
  } = useQuery({
    queryKey: ['/api/admin/media-validation-reports'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/admin/media-validation-reports');
        if (!response.ok) {
          throw new Error(`Failed to fetch validation reports: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return transformReports(data);
      } catch (error) {
        setError(`Error fetching reports: ${error instanceof Error ? error.message : String(error)}`);
        return [];
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds to get updates during validation
  });

  // Get the latest report
  const latestReport = reports.length > 0 
    ? reports.sort((a, b) => b.endTime.getTime() - a.endTime.getTime())[0]
    : null;

  // Check if validation is in progress
  const { 
    data: validationStatus,
    isLoading: isLoadingStatus,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['/api/admin/media-validation-status'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/admin/media-validation-status');
        if (!response.ok) {
          throw new Error(`Failed to fetch validation status: ${response.status} ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        setError(`Error fetching status: ${error instanceof Error ? error.message : String(error)}`);
        return { isValidating: false, isRepairing: false };
      }
    },
    refetchInterval: 2000, // Check more frequently during validation
  });

  // Start validation mutation
  const { mutate: startValidationMutation, isPending: isStartingValidation } = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/validate-media', {
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
      setError(`Failed to start validation: ${error instanceof Error ? error.message : String(error)}`);
    },
  });

  // Start repair mutation
  const { mutate: startRepairMutation, isPending: isStartingRepair } = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/fix-media-issues', {
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
      setError(`Failed to start repair: ${error instanceof Error ? error.message : String(error)}`);
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
          
          const response = await fetch(endpoint);
          if (!response.ok) return;
          
          const data = await response.json();
          
          if (validationStatus.isValidating) {
            setValidationProgress(data);
          } else {
            setRepairProgress(data);
          }
        } catch (error) {
          console.error('Error fetching progress:', error);
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