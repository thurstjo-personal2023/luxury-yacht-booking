import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  AlertTriangle, 
  Bell, 
  CheckCircle2, 
  Clock,
  XCircle
} from 'lucide-react';
import { adminApiRequestWithRetry } from '@/lib/adminApiUtils';

// Define the types for system alerts
export interface SystemAlert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  source: string;
  timestamp: string;
  acknowledged: boolean;
}

export function useSystemAlerts() {
  return useQuery({
    queryKey: ['/api/admin/system-alerts'],
    queryFn: async () => {
      try {
        const response = await adminApiRequestWithRetry('/api/admin/system-alerts');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch system alerts: ${response.status} ${response.statusText}`);
        }
        
        return await response.json() as SystemAlert[];
      } catch (error) {
        console.error('Error fetching system alerts:', error);
        // Return empty array to prevent UI crashes
        return [];
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function SystemAlertsCard() {
  const { data: alerts, isLoading, isError } = useSystemAlerts();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'info':
        return <Bell className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Warning</Badge>;
      case 'info':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Info</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffMins < 1440) { // less than a day
      const hours = Math.floor(diffMins / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderAlertContent = () => {
    if (isLoading) {
      return Array(3).fill(0).map((_, i) => (
        <div key={i} className="mb-4">
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ));
    }

    if (isError) {
      return (
        <div className="flex items-center justify-center p-6 text-center">
          <div>
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Failed to load system alerts</p>
          </div>
        </div>
      );
    }

    if (!alerts || alerts.length === 0) {
      return (
        <div className="flex items-center justify-center p-6 text-center">
          <div>
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium">No active alerts</p>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className={`border-l-4 pl-4 py-2 ${
            alert.severity === 'critical' ? 'border-red-500' : 
            alert.severity === 'warning' ? 'border-amber-500' : 'border-blue-500'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {getSeverityIcon(alert.severity)}
                <span className="font-medium">{alert.title}</span>
              </div>
              {getSeverityBadge(alert.severity)}
            </div>
            <p className="text-sm text-muted-foreground">{alert.message}</p>
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
              <span>{alert.source}</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> 
                {formatTimestamp(alert.timestamp)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          System Alerts
        </CardTitle>
        <CardDescription>Active alerts and notifications</CardDescription>
      </CardHeader>
      <CardContent>{renderAlertContent()}</CardContent>
    </Card>
  );
}