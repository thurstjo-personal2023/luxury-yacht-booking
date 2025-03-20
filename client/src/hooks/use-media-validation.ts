/**
 * Media Validation Hook
 * 
 * This hook provides functionality for interacting with the media validation API.
 * It allows components to run validations, view reports, and fix issues.
 */
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './use-auth';

// Type definitions
export interface ValidationReport {
  id: string;
  timestamp: number;
  stats: {
    documentCount: number;
    fieldCount: number;
    invalidFieldCount: number;
    relativeUrlCount: number;
    imageCount: number;
    videoCount: number;
    byCollection: Record<string, {
      documentCount: number;
      invalidCount: number;
      relativeCount: number;
    }>;
    validationTimeMs: number;
  };
  invalid: any[];
  relative: any[];
  invalidItemDetails?: any[];
}

export interface UrlFixReport {
  id: string;
  timestamp: number;
  stats: {
    documentCount: number;
    fixedDocumentCount: number;
    fixedFieldCount: number;
    byCollection: Record<string, {
      documentCount: number;
      fixedCount: number;
    }>;
    fixTimeMs: number;
  };
  fixes: any[];
}

export interface ValidationTask {
  id: string;
  type: 'validation' | 'fix';
  collection?: string;
  status: 'running' | 'completed' | 'failed';
  progress?: number;
  startTime: number;
  endTime?: number;
  reportId?: string;
}

export interface ValidationSchedule {
  id: string;
  name: string;
  enabled: boolean;
  intervalHours: number;
  collections: string[];
  fixRelativeUrls: boolean;
  lastRunTime?: number;
  lastStatus?: 'success' | 'error' | 'running';
}

export interface CollectionStats {
  documentCount: number;
  mediaCount: number;
  issueCount?: number;
  lastValidated?: number;
}

/**
 * Custom hook for media validation functionality
 */
export const useMediaValidation = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State for validation data
  const [validationReports, setValidationReports] = useState<ValidationReport[]>();
  const [urlFixReports, setUrlFixReports] = useState<UrlFixReport[]>();
  const [activeTasks, setActiveTasks] = useState<ValidationTask[]>();
  const [schedules, setSchedules] = useState<ValidationSchedule[]>();
  const [collections, setCollections] = useState<Record<string, CollectionStats>>();
  const [isLoading, setIsLoading] = useState(true);
  const [reportDetails, setReportDetails] = useState<ValidationReport>();
  
  /**
   * Calculate progress percentage for a running task
   */
  const calculateProgress = useCallback((report: ValidationReport) => {
    if (!report || !report.stats) return 0;
    
    const { documentCount, fieldCount } = report.stats;
    const total = documentCount > 0 ? documentCount : 100;
    const processed = fieldCount > 0 ? fieldCount : 0;
    
    return Math.min(Math.round((processed / total) * 100), 99);
  }, []);
  
  /**
   * Check if a task is currently running
   */
  const isTaskRunning = useCallback(() => {
    if (!activeTasks) return false;
    return activeTasks.some(task => task.status === 'running');
  }, [activeTasks]);
  
  /**
   * Fetch validation reports
   */
  const fetchValidationReports = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/media-validation-reports');
      const data = await response.json();
      
      if (data.reports) {
        setValidationReports(data.reports);
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
  }, [toast]);
  
  /**
   * Fetch URL fix reports
   */
  const fetchUrlFixReports = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/url-repair-reports');
      const data = await response.json();
      
      if (data.reports) {
        setUrlFixReports(data.reports);
      }
    } catch (error) {
      console.error('Error fetching URL fix reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch URL fix reports',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  /**
   * Fetch active tasks
   */
  const fetchActiveTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/active-validation-tasks');
      const data = await response.json();
      
      if (data.tasks) {
        setActiveTasks(data.tasks);
      }
    } catch (error) {
      console.error('Error fetching active tasks:', error);
    }
  }, []);
  
  /**
   * Run validation on all collections
   */
  const runValidation = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/validate-media', { 
        method: 'POST' 
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      toast({
        title: 'Validation Started',
        description: 'Media validation has been started. Check back soon for results.',
      });
      
      // Refresh data after a short delay
      setTimeout(() => {
        fetchActiveTasks();
        fetchValidationReports();
      }, 2000);
      
      return { taskId: data.taskId };
    } catch (error) {
      console.error('Error running validation:', error);
      toast({
        title: 'Error',
        description: 'Failed to start validation',
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast, fetchActiveTasks, fetchValidationReports]);
  
  /**
   * Run validation on a specific collection
   */
  const runCollectionValidation = useCallback(async (collection: string) => {
    try {
      const response = await fetch('/api/admin/validate-collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ collection })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      toast({
        title: 'Collection Validation Started',
        description: `Validation for ${collection} has been started.`,
      });
      
      // Refresh data after a short delay
      setTimeout(() => {
        fetchActiveTasks();
        fetchValidationReports();
      }, 2000);
      
      return { taskId: data.taskId, collection: data.collection };
    } catch (error) {
      console.error('Error running collection validation:', error);
      toast({
        title: 'Error',
        description: `Failed to validate collection ${collection}`,
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast, fetchActiveTasks, fetchValidationReports]);
  
  /**
   * Fix broken URLs
   */
  const fixBrokenUrls = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/fix-relative-urls', { 
        method: 'POST' 
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      toast({
        title: 'URL Fix Started',
        description: 'Fixing relative URLs has been started. Check back soon for results.',
      });
      
      // Refresh data after a short delay
      setTimeout(() => {
        fetchActiveTasks();
        fetchUrlFixReports();
      }, 2000);
      
      return { taskId: data.taskId };
    } catch (error) {
      console.error('Error fixing broken URLs:', error);
      toast({
        title: 'Error',
        description: 'Failed to start URL fix',
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast, fetchActiveTasks, fetchUrlFixReports]);
  
  /**
   * Update a validation schedule
   */
  const updateSchedule = useCallback(async (id: string, updates: Partial<ValidationSchedule>) => {
    try {
      const response = await fetch('/api/admin/update-validation-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, ...updates })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      toast({
        title: 'Schedule Updated',
        description: 'Validation schedule has been updated.',
      });
      
      // Update local state
      setSchedules(prev => 
        prev?.map(schedule => 
          schedule.id === id ? { ...schedule, ...updates } : schedule
        )
      );
      
      return data;
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update schedule',
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast]);
  
  /**
   * Get detailed report information
   */
  const getReportDetails = useCallback(async (reportId: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/admin/media-validation/${reportId}`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setReportDetails(data);
      
      return data;
    } catch (error) {
      console.error('Error fetching report details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch report details',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  /**
   * Fetch collection metadata
   */
  const fetchCollections = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/collections');
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.collections) {
        setCollections(data.collections);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  }, []);
  
  /**
   * Fetch validation schedules
   */
  const fetchSchedules = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/validation-schedules');
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.schedules) {
        setSchedules(data.schedules);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  }, []);
  
  /**
   * Initialize data
   */
  const initializeData = useCallback(() => {
    if (!user) return;
    
    Promise.all([
      fetchValidationReports(),
      fetchUrlFixReports(),
      fetchActiveTasks(),
      fetchCollections(),
      fetchSchedules()
    ]).catch(error => {
      console.error('Error initializing data:', error);
    });
    
    // Set up polling for active tasks
    const intervalId = setInterval(() => {
      if (isTaskRunning()) {
        fetchActiveTasks();
      }
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [
    user,
    fetchValidationReports, 
    fetchUrlFixReports, 
    fetchActiveTasks, 
    fetchCollections, 
    fetchSchedules,
    isTaskRunning
  ]);
  
  // Initialize data on mount and when user changes
  useEffect(() => {
    const cleanup = initializeData();
    return cleanup;
  }, [initializeData]);
  
  return {
    validationReports,
    urlFixReports,
    activeTasks,
    schedules,
    collections,
    reportDetails,
    isLoading,
    isTaskRunning: isTaskRunning(),
    runValidation,
    runCollectionValidation,
    fixBrokenUrls,
    updateSchedule,
    getReportDetails,
    calculateProgress
  };
};