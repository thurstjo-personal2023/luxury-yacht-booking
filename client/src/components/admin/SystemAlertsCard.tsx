/**
 * System Alerts Card Component
 * 
 * Displays and manages system alerts for the admin dashboard.
 */

import React, { useState } from 'react';
import { useSystemAlerts, AlertSeverity, AlertStatus, SystemAlert } from '@/hooks/use-system-alerts';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertCircle, 
  AlertTriangle, 
  Bell, 
  CheckCircle2, 
  Info, 
  Loader2, 
  RefreshCw, 
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SystemAlertsCardProps {
  limit?: number;
  showHeader?: boolean;
  showFooter?: boolean;
  maxHeight?: string;
  className?: string;
}

/**
 * System Alerts Card Component
 */
export function SystemAlertsCard({
  limit = 5,
  showHeader = true,
  showFooter = true,
  maxHeight = '400px',
  className = '',
}: SystemAlertsCardProps) {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch alerts using our custom hook
  const {
    activeAlerts,
    isLoadingActiveAlerts,
    refetchActiveAlerts,
    acknowledgeAlert,
    isAcknowledgingAlert,
    resolveAlert,
    isResolvingAlert,
    dismissAlert,
    isDismissingAlert,
  } = useSystemAlerts({ limit });
  
  // Get alert icon based on severity
  const getAlertIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case AlertSeverity.ERROR:
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case AlertSeverity.WARNING:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case AlertSeverity.INFO:
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };
  
  // Get alert badge color based on severity
  const getAlertBadgeClass = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'bg-destructive text-destructive-foreground';
      case AlertSeverity.ERROR:
        return 'bg-destructive/80 text-destructive-foreground';
      case AlertSeverity.WARNING:
        return 'bg-yellow-500 text-yellow-50';
      case AlertSeverity.INFO:
      default:
        return 'bg-blue-500 text-blue-50';
    }
  };
  
  // Format date
  const formatDate = (dateStr: string | Date) => {
    try {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown date';
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchActiveAlerts();
      toast({
        title: 'Alerts refreshed',
        description: 'The system alerts have been refreshed.',
      });
    } catch (error) {
      toast({
        title: 'Refresh failed',
        description: 'Failed to refresh alerts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Handle acknowledge
  const handleAcknowledge = async (alert: SystemAlert) => {
    try {
      await acknowledgeAlert(alert.id);
      toast({
        title: 'Alert acknowledged',
        description: 'The alert has been acknowledged.',
      });
    } catch (error) {
      toast({
        title: 'Action failed',
        description: 'Failed to acknowledge the alert. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle resolve
  const handleResolve = async (alert: SystemAlert) => {
    try {
      await resolveAlert(alert.id);
      toast({
        title: 'Alert resolved',
        description: 'The alert has been marked as resolved.',
      });
    } catch (error) {
      toast({
        title: 'Action failed',
        description: 'Failed to resolve the alert. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle dismiss
  const handleDismiss = async (alert: SystemAlert) => {
    try {
      await dismissAlert(alert.id);
      toast({
        title: 'Alert dismissed',
        description: 'The alert has been dismissed.',
      });
    } catch (error) {
      toast({
        title: 'Action failed',
        description: 'Failed to dismiss the alert. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // Loading state
  const isLoading = isLoadingActiveAlerts || isRefreshing;
  
  // Action being performed on an alert
  const isActionInProgress = isAcknowledgingAlert || isResolvingAlert || isDismissingAlert;
  
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">System Alerts</CardTitle>
              <CardDescription>
                {activeAlerts?.length
                  ? `${activeAlerts.length} active alert${activeAlerts.length !== 1 ? 's' : ''} requiring attention`
                  : 'No active alerts at this time'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isActionInProgress}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="px-4">
        <div 
          className="space-y-3 overflow-auto" 
          style={{ maxHeight }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading alerts...</span>
            </div>
          ) : activeAlerts?.length ? (
            activeAlerts.map((alert: SystemAlert) => (
              <div
                key={alert.id}
                className="flex items-start gap-4 rounded-lg border p-4 transition-all hover:bg-accent/50"
              >
                <div className="flex-shrink-0 pt-1">
                  {getAlertIcon(alert.severity)}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{alert.title}</h4>
                      <Badge className={getAlertBadgeClass(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline">{alert.category}</Badge>
                    </div>
                    
                    <DropdownMenu>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0" 
                                disabled={isActionInProgress}
                              >
                                <span className="sr-only">Actions</span>
                                <Bell className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Alert actions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAcknowledge(alert)}>
                          <Bell className="mr-2 h-4 w-4" />
                          <span>Acknowledge</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleResolve(alert)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          <span>Resolve</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDismiss(alert)}>
                          <X className="mr-2 h-4 w-4" />
                          <span>Dismiss</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  
                  <div className="flex items-center text-xs text-muted-foreground">
                    <span>Created {formatDate(alert.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium">All clear!</h3>
              <p className="text-muted-foreground mt-1">
                No active system alerts at this time.
              </p>
            </div>
          )}
        </div>
      </CardContent>
      
      {showFooter && activeAlerts?.length > 0 && (
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''}
          </p>
          <Button
            variant="link"
            size="sm"
            className="text-sm text-muted-foreground"
            onClick={() => {
              // This would navigate to a full alerts page in the future
              toast({
                title: "View all alerts",
                description: "This will be linked to the full alerts management page in the future.",
              });
            }}
          >
            View all alerts
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}