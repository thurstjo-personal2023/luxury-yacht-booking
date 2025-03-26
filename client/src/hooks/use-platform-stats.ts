import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { adminApiRequestWithRetry } from '@/lib/adminApiUtils';

export interface PlatformStats {
  bookings: {
    total: number;
    totalInPeriod: number;
    byStatus: {
      pending: number;
      confirmed: number;
      canceled: number;
    };
    trend: Array<{
      date: string;
      count: number;
    }>;
  };
  transactions: {
    total: number;
    totalInPeriod: number;
    volume: number;
    byStatus: {
      successful: number;
      failed: number;
    };
    trend: Array<{
      date: string;
      count: number;
      volume: number;
    }>;
  };
  users: {
    total: number;
    newInPeriod: number;
    byRole: {
      consumer: number;
      producer: number;
      partner: number;
    };
    trend: Array<{
      date: string;
      count: number;
    }>;
  };
}

export function usePlatformStats(period: 'day' | 'week' | 'month' | 'year' = 'week') {
  return useQuery({
    queryKey: ['/api/admin/platform-stats', period],
    queryFn: async () => {
      try {
        // Use the admin API request with retry for better auth handling
        const response = await adminApiRequestWithRetry(`/api/admin/platform-stats?period=${period}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch platform stats: ${response.status} ${response.statusText}`);
        }
        
        return await response.json() as PlatformStats;
      } catch (error) {
        console.error('Error fetching platform stats:', error);
        
        // Return fallback empty data structure to prevent UI crashes
        return {
          bookings: {
            total: 0,
            totalInPeriod: 0,
            byStatus: {
              pending: 0,
              confirmed: 0,
              canceled: 0
            },
            trend: []
          },
          transactions: {
            total: 0,
            totalInPeriod: 0,
            volume: 0,
            byStatus: {
              successful: 0,
              failed: 0
            },
            trend: []
          },
          users: {
            total: 0,
            newInPeriod: 0,
            byRole: {
              consumer: 0,
              producer: 0,
              partner: 0
            },
            trend: []
          }
        };
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403 errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    }
  });
}