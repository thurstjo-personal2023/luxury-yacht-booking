/**
 * Media Validation Hook
 * 
 * This hook provides functionality to interact with the media validation API.
 * It handles loading reports, running validation, and fixing invalid URLs.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

// Types
export interface ValidationReport {
  id?: string;
  startTime: string | Date;
  endTime: string | Date;
  duration: number;
  totalDocuments: number;
  totalFields: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  collectionSummaries: {
    collection: string;
    totalUrls: number;
    validUrls: number;
    invalidUrls: number;
    missingUrls: number;
    validPercent: number;
    invalidPercent: number;
    missingPercent: number;
  }[];
  invalidResults: Array<{
    field: string;
    url: string;
    isValid: boolean;
    status?: number;
    statusText?: string;
    contentType?: string;
    reason?: string;
    error?: string;
    collection?: string;
    documentId?: string;
  }>;
}

export interface ValidationOptions {
  collections?: string[];
  batchSize?: number;
  maxItems?: number;
}

export interface FixOptions {
  reportId?: string;
  collections?: string[];
}

// Hook implementation
export function useMediaValidation() {
  const queryClient = useQueryClient();
  const [validationStatus, setValidationStatus] = useState('Preparing validation...');
  const [repairStatus, setRepairStatus] = useState('Preparing repairs...');
  
  // Fetch validation reports
  const { 
    data: reports,
    isLoading: isLoadingReports,
    refetch: loadReports
  } = useQuery({
    queryKey: ['/api/admin/media-validation-reports'],
    queryFn: async () => {
      const response = await fetch('/api/admin/media-validation-reports');
      if (!response.ok) {
        throw new Error('Failed to fetch validation reports');
      }
      return await response.json() as ValidationReport[];
    },
    enabled: false, // Don't fetch automatically on mount
  });
  
  // Latest validation report
  const lastValidationReport = reports && reports.length > 0 
    ? reports[0] 
    : undefined;
  
  // Start a validation run
  const { 
    mutate: runValidation,
    isPending: isValidating
  } = useMutation({
    mutationFn: async (options?: ValidationOptions) => {
      setValidationStatus('Starting validation...');
      
      const response = await fetch('/api/admin/validate-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options || {})
      });
      
      if (!response.ok) {
        throw new Error('Validation failed');
      }
      
      setValidationStatus('Validation complete.');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/media-validation-reports'] });
      loadReports();
      toast({
        title: 'Validation Complete',
        description: 'Media validation finished successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Validation Failed',
        description: String(error),
        variant: 'destructive',
      });
    }
  });
  
  // Fix invalid URLs
  const {
    mutate: fixInvalidUrls,
    isPending: isRepairing
  } = useMutation({
    mutationFn: async (options?: FixOptions) => {
      setRepairStatus('Starting repairs...');
      
      const response = await fetch('/api/admin/fix-media-issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options || {})
      });
      
      if (!response.ok) {
        throw new Error('Fix operation failed');
      }
      
      setRepairStatus('Repairs complete.');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/media-validation-reports'] });
      loadReports();
      toast({
        title: 'Repairs Complete',
        description: 'Invalid media URLs have been fixed',
      });
    },
    onError: (error) => {
      toast({
        title: 'Repair Failed',
        description: String(error),
        variant: 'destructive',
      });
    }
  });
  
  const validationResults = useCallback((reportId?: string) => {
    // If specific report ID is provided, find that report
    if (reportId && reports) {
      return reports.find(r => r.id === reportId);
    }
    
    // Otherwise, return the latest report
    return lastValidationReport;
  }, [reports, lastValidationReport]);
  
  return {
    // Reports
    reports,
    isLoadingReports,
    loadReports,
    lastValidationReport,
    validationResults,
    
    // Validation
    runValidation,
    isValidating,
    validationStatus,
    
    // Repairs
    fixInvalidUrls,
    isRepairing,
    repairStatus,
  };
}