/**
 * System Alerts Hook
 * 
 * Custom hook for fetching and managing system alerts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { AlertStatus, AlertCategory, AlertSeverity, SystemAlert } from '@/types/system-alerts';

interface UseSystemAlertsOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

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
  
  // Fetch all alerts
  const {
    data: alertsData,
    isLoading: isLoadingAlerts,
    error: alertsError,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['/api/admin/alerts'],
    queryFn: () => apiRequest(`/api/admin/alerts?limit=${limit}`),
    refetchInterval: autoRefresh ? refreshInterval : false,
  });
  
  // Fetch active alerts only
  const {
    data: activeAlertsData,
    isLoading: isLoadingActiveAlerts,
    error: activeAlertsError,
    refetch: refetchActiveAlerts,
  } = useQuery({
    queryKey: ['/api/admin/alerts/active'],
    queryFn: () => apiRequest(`/api/admin/alerts/active?limit=${limit}`),
    refetchInterval: autoRefresh ? refreshInterval : false,
  });
  
  // Create a new alert
  const createAlertMutation = useMutation({
    mutationFn: (alertData: {
      title: string;
      message: string;
      severity: AlertSeverity;
      category: AlertCategory;
      relatedEntity?: {
        type: string;
        id: string;
      };
      metadata?: Record<string, any>;
    }) => apiRequest('/api/admin/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    }),
    onSuccess: () => {
      // Invalidate alert queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts/active'] });
    },
  });
  
  // Update alert status
  const updateAlertStatusMutation = useMutation({
    mutationFn: ({ alertId, status }: { alertId: string; status: AlertStatus }) =>
      apiRequest(`/api/admin/alerts/${alertId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      // Invalidate alert queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts/active'] });
    },
  });
  
  // Acknowledge an alert
  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId: string) =>
      apiRequest(`/api/admin/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      }),
    onSuccess: () => {
      // Invalidate alert queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts/active'] });
    },
  });
  
  // Resolve an alert
  const resolveAlertMutation = useMutation({
    mutationFn: (alertId: string) =>
      apiRequest(`/api/admin/alerts/${alertId}/resolve`, {
        method: 'POST',
      }),
    onSuccess: () => {
      // Invalidate alert queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts/active'] });
    },
  });
  
  // Dismiss an alert
  const dismissAlertMutation = useMutation({
    mutationFn: (alertId: string) =>
      apiRequest(`/api/admin/alerts/${alertId}/dismiss`, {
        method: 'POST',
      }),
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
  const criticalAlerts = alerts.filter((alert: SystemAlert) => alert.severity === AlertSeverity.CRITICAL);
  const errorAlerts = alerts.filter((alert: SystemAlert) => alert.severity === AlertSeverity.ERROR);
  const warningAlerts = alerts.filter((alert: SystemAlert) => alert.severity === AlertSeverity.WARNING);
  const infoAlerts = alerts.filter((alert: SystemAlert) => alert.severity === AlertSeverity.INFO);
  
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