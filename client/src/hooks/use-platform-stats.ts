import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAdminApiUtils } from '@/lib/adminApiUtils';

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
  const { refreshTokenIfNeeded } = useAdminApiUtils();

  return useQuery({
    queryKey: ['/api/admin/platform-stats', period],
    queryFn: async () => {
      await refreshTokenIfNeeded();
      const response = await apiRequest.get(`/api/admin/platform-stats?period=${period}`);
      return response.data as PlatformStats;
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