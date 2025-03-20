/**
 * Media Validation Hook
 * 
 * This hook provides functionality for media validation operations.
 */
import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './use-auth';
import {
  MediaValidationStatus,
  InvalidMediaItem,
  RepairMediaResult
} from '../types/media-validation';
import { useToast } from './use-toast';

export function useMediaValidation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [validationReports, setValidationReports] = useState<MediaValidationStatus[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [selectedReportDetails, setSelectedReportDetails] = useState<MediaValidationStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const [repairResults, setRepairResults] = useState<RepairMediaResult | null>(null);
  
  // Check if user has admin permissions
  const isAdmin = user?.role === 'producer' || user?.role === 'partner';

  // Fetch validation reports
  const fetchValidationReports = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await axios.get('/api/admin/image-validation-reports');
      setValidationReports(response.data);
    } catch (error) {
      console.error('Failed to fetch validation reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch validation reports.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, toast]);

  // Fetch details for a specific report
  const fetchReportDetails = useCallback(async (reportId: string) => {
    if (!isAdmin || !reportId) return;
    
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/admin/image-validation/${reportId}`);
      setSelectedReportDetails(response.data);
      setSelectedReport(reportId);
    } catch (error) {
      console.error(`Failed to fetch report details for ${reportId}:`, error);
      toast({
        title: 'Error',
        description: 'Failed to fetch report details.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, toast]);

  // Start a new validation run
  const startValidation = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      setIsValidating(true);
      const response = await axios.post('/api/admin/validate-images');
      toast({
        title: 'Success',
        description: 'Media validation started successfully.',
        variant: 'default'
      });
      
      // Refresh reports to show the new one
      await fetchValidationReports();
      
      return response.data.reportId;
    } catch (error) {
      console.error('Failed to start validation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start media validation.',
        variant: 'destructive'
      });
    } finally {
      setIsValidating(false);
    }
  }, [isAdmin, fetchValidationReports, toast]);

  // Repair invalid media
  const repairInvalidMedia = useCallback(async (items: InvalidMediaItem[]) => {
    if (!isAdmin || !selectedReport) return;
    
    try {
      setIsRepairing(true);
      const response = await axios.post('/api/admin/repair-broken-urls', {
        reportId: selectedReport,
        itemsToRepair: items
      });
      
      setRepairResults(response.data);
      
      toast({
        title: 'Success',
        description: `Repaired ${response.data.repairedItemsCount} items successfully.`,
        variant: 'default'
      });
      
      // Refresh report details to show updated status
      await fetchReportDetails(selectedReport);
      
      return response.data;
    } catch (error) {
      console.error('Failed to repair media:', error);
      toast({
        title: 'Error',
        description: 'Failed to repair media items.',
        variant: 'destructive'
      });
    } finally {
      setIsRepairing(false);
    }
  }, [isAdmin, selectedReport, fetchReportDetails, toast]);

  // Repair a single invalid media item
  const repairSingleItem = useCallback(async (item: InvalidMediaItem) => {
    return repairInvalidMedia([item]);
  }, [repairInvalidMedia]);

  // Refresh reports
  const refreshReports = useCallback(async () => {
    await fetchValidationReports();
    if (selectedReport) {
      await fetchReportDetails(selectedReport);
    }
  }, [fetchValidationReports, fetchReportDetails, selectedReport]);

  // Fetch reports on initial load
  useEffect(() => {
    fetchValidationReports();
  }, [fetchValidationReports]);

  return {
    validationReports,
    selectedReportDetails,
    isLoading,
    isValidating,
    isRepairing,
    repairResults,
    startValidation,
    fetchReportDetails,
    repairInvalidMedia,
    repairSingleItem,
    refreshReports,
    setSelectedReport
  };
}