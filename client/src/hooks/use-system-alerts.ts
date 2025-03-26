/**
 * System Alerts Hook
 * 
 * Custom hook for fetching and managing system alerts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Alert severity levels
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Alert categories
export enum AlertCategory {
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  STORAGE = 'storage',
  DATABASE = 'database',
  MEDIA = 'media',
  USER = 'user',
  PAYMENT = 'payment',
  BOOKING = 'booking',
  OTHER = 'other'
}

// Alert status
export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

// System alert type
export interface SystemAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  status: AlertStatus;
  createdAt: string | Date;
  updatedAt?: string | Date;
  acknowledgedBy?: string;
  acknowledgedAt?: string | Date;
  resolvedBy?: string;
  resolvedAt?: string | Date;
  relatedEntity?: {
    type: string;
    id: string;
  };
  metadata?: Record<string, any>;
  actions?: Array<{
    label: string;
    action: string;
    url?: string;
    confirmationMessage?: string;
  }>;
}

// Define interfaces for the API responses
interface AlertsResponse {
  alerts: SystemAlert[];
  total: number;
}

interface UseSystemAlertsOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// For development, we'll use mock data until the backend is connected
const MOCK_ALERTS: SystemAlert[] = [
  {
    id: 'alert-1',
    title: 'Media validation detected invalid URLs',
    message: 'The recent media validation detected 21 invalid URLs in yacht listings.',
    severity: AlertSeverity.WARNING,
    category: AlertCategory.MEDIA,
    status: AlertStatus.ACTIVE,
    createdAt: new Date(Date.now() - 3600000), // 1 hour ago
    relatedEntity: {
      type: 'validation_report',
      id: 'EfHOE9zBPAfCd16An410',
    }
  },
  {
    id: 'alert-2',
    title: 'Database backup completed',
    message: 'Scheduled database backup completed successfully.',
    severity: AlertSeverity.INFO,
    category: AlertCategory.DATABASE,
    status: AlertStatus.ACTIVE,
    createdAt: new Date(Date.now() - 7200000), // 2 hours ago
  },
];

/**
 * Custom hook for fetching and managing system alerts
 */
export function useSystemAlerts(options: UseSystemAlertsOptions = {}) {
  const {
    limit = 10,
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute by default
  } = options;
  
  const queryClient = useQueryClient();
  
  // Mock function for fetching alerts until the backend is implemented
  const fetchAlerts = async (activeOnly = false): Promise<AlertsResponse> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Filter alerts if activeOnly
    const filteredAlerts = activeOnly 
      ? MOCK_ALERTS.filter(alert => alert.status === AlertStatus.ACTIVE)
      : MOCK_ALERTS;
    
    return {
      alerts: filteredAlerts.slice(0, limit),
      total: filteredAlerts.length
    };
  };
  
  // Fetch all alerts
  const {
    data: alertsData,
    isLoading: isLoadingAlerts,
    error: alertsError,
    refetch: refetchAlerts,
  } = useQuery<AlertsResponse>({
    queryKey: ['/api/admin/alerts', limit],
    queryFn: () => fetchAlerts(false),
    refetchInterval: autoRefresh ? refreshInterval : false,
  });
  
  // Fetch active alerts only
  const {
    data: activeAlertsData,
    isLoading: isLoadingActiveAlerts,
    error: activeAlertsError,
    refetch: refetchActiveAlerts,
  } = useQuery<AlertsResponse>({
    queryKey: ['/api/admin/alerts/active', limit],
    queryFn: () => fetchAlerts(true),
    refetchInterval: autoRefresh ? refreshInterval : false,
  });
  
  // Create a new alert
  const createAlertMutation = useMutation({
    mutationFn: async (alertData: {
      title: string;
      message: string;
      severity: AlertSeverity;
      category: AlertCategory;
      relatedEntity?: {
        type: string;
        id: string;
      };
      metadata?: Record<string, any>;
    }) => {
      // This is a mock implementation until backend is connected
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Creating alert:', alertData);
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate alert queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts/active'] });
    },
  });
  
  // Update alert status
  const updateAlertStatusMutation = useMutation({
    mutationFn: async ({ alertId, status }: { alertId: string; status: AlertStatus }) => {
      // This is a mock implementation until backend is connected
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`Updating alert ${alertId} status to ${status}`);
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate alert queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts/active'] });
    },
  });
  
  // Acknowledge an alert
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      // This is a mock implementation until backend is connected
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`Acknowledging alert ${alertId}`);
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate alert queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts/active'] });
    },
  });
  
  // Resolve an alert
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      // This is a mock implementation until backend is connected
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`Resolving alert ${alertId}`);
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate alert queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts/active'] });
    },
  });
  
  // Dismiss an alert
  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      // This is a mock implementation until backend is connected
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`Dismissing alert ${alertId}`);
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate alert queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts/active'] });
    },
  });
  
  // Format the alerts data
  const alerts = alertsData?.alerts || [];
  const activeAlerts = activeAlertsData?.alerts || [];
  
  // Categorize alerts by severity
  const criticalAlerts = alerts.filter(alert => alert.severity === AlertSeverity.CRITICAL);
  const errorAlerts = alerts.filter(alert => alert.severity === AlertSeverity.ERROR);
  const warningAlerts = alerts.filter(alert => alert.severity === AlertSeverity.WARNING);
  const infoAlerts = alerts.filter(alert => alert.severity === AlertSeverity.INFO);
  
  return {
    // Alerts data
    alerts,
    activeAlerts,
    criticalAlerts,
    errorAlerts,
    warningAlerts,
    infoAlerts,
    
    // Loading and error states
    isLoadingAlerts,
    alertsError,
    isLoadingActiveAlerts,
    activeAlertsError,
    
    // Refetch functions
    refetchAlerts,
    refetchActiveAlerts,
    
    // Mutation functions
    createAlert: createAlertMutation.mutate,
    isCreatingAlert: createAlertMutation.isPending,
    createAlertError: createAlertMutation.error,
    
    updateAlertStatus: updateAlertStatusMutation.mutate,
    isUpdatingAlertStatus: updateAlertStatusMutation.isPending,
    updateAlertStatusError: updateAlertStatusMutation.error,
    
    acknowledgeAlert: acknowledgeAlertMutation.mutate,
    isAcknowledgingAlert: acknowledgeAlertMutation.isPending,
    acknowledgeAlertError: acknowledgeAlertMutation.error,
    
    resolveAlert: resolveAlertMutation.mutate,
    isResolvingAlert: resolveAlertMutation.isPending,
    resolveAlertError: resolveAlertMutation.error,
    
    dismissAlert: dismissAlertMutation.mutate,
    isDismissingAlert: dismissAlertMutation.isPending,
    dismissAlertError: dismissAlertMutation.error,
  };
}