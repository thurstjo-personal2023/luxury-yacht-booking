import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { 
  ServiceProviderProfile, 
  PartnerProfileResponse, 
  PartnerAddon,
  PartnerBooking,
  PartnerEarnings,
  ServiceAnalyticsResponse
} from '@/types/partner';

// Define response types using the imported interfaces
interface AddonsResponse {
  addons: PartnerAddon[];
}

interface BookingsResponse {
  bookings: PartnerBooking[];
}

interface EarningsResponse {
  earnings: PartnerEarnings;
}

/**
 * Hook for fetching partner profile data
 */
export function usePartnerProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['/api/partner/profile'],
    queryFn: async () => {
      const response = await fetch('/api/partner/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch partner profile');
      }
      
      return await response.json() as PartnerProfileResponse;
    },
    enabled: !!user && user?.role === 'partner',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for updating partner profile
 */
export function useUpdatePartnerProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation<any, Error, { 
    core?: { name?: string; phone?: string; email?: string };
    profile?: Partial<ServiceProviderProfile>;
  }>({
    mutationFn: async ({ core, profile }) => {
      try {
        const response = await fetch('/api/partner/profile/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          credentials: 'include',
          body: JSON.stringify({ core, profile }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || response.statusText);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error updating partner profile:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner/profile'] });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook for fetching partner's add-ons
 */
export function usePartnerAddons() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['/api/partner/addons'],
    queryFn: async () => {
      const response = await fetch('/api/partner/addons', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch partner add-ons');
      }
      
      const typedResponse = await response.json() as AddonsResponse;
      return typedResponse.addons || [];
    },
    enabled: !!user && user?.role === 'partner',
  });
}

/**
 * Hook for creating a new add-on
 */
export function useCreateAddon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation<
    any, 
    Error,
    {
      name: string;
      description?: string;
      category: string;
      pricing: number;
      media?: Array<{ type: string; url: string }>;
      availability?: boolean;
      tags?: string[];
    }
  >({
    mutationFn: async (addonData) => {
      try {
        const response = await fetch('/api/partner/addons/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          credentials: 'include',
          body: JSON.stringify(addonData),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || response.statusText);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error creating add-on:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner/addons'] });
      toast({
        title: "Add-on created",
        description: "Your add-on has been successfully created",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create add-on",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook for fetching partner bookings
 */
export function usePartnerBookings() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['/api/partner/bookings'],
    queryFn: async () => {
      const response = await fetch('/api/partner/bookings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      
      const typedResponse = await response.json() as BookingsResponse;
      return typedResponse.bookings || [];
    },
    enabled: !!user && user?.role === 'partner',
  });
}

/**
 * Hook for fetching partner earnings data
 */
export function usePartnerEarnings() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['/api/partner/earnings'],
    queryFn: async () => {
      const response = await fetch('/api/partner/earnings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch earnings data');
      }
      
      const typedResponse = await response.json() as EarningsResponse;
      return typedResponse.earnings || {
        total: 0,
        currentMonth: 0,
        previousMonth: 0,
        bookingsCount: 0,
        commissionRate: 0.8,
      };
    },
    enabled: !!user && user?.role === 'partner',
  });
}

/**
 * Hook for fetching partner service analytics data
 * This hook fetches utilization data for partner services with filtering capabilities
 */
export function useServiceAnalytics(options?: {
  startDate?: Date;
  endDate?: Date;
  aggregateBy?: 'day' | 'week' | 'month';
}) {
  const { user } = useAuth();
  
  // Create query parameters
  const queryParams = new URLSearchParams();
  if (options?.startDate) {
    queryParams.append('startDate', options.startDate.toISOString());
  }
  if (options?.endDate) {
    queryParams.append('endDate', options.endDate.toISOString());
  }
  if (options?.aggregateBy) {
    queryParams.append('aggregateBy', options.aggregateBy);
  }
  
  const queryString = queryParams.toString();
  const endpoint = `/api/partner/service-analytics${queryString ? `?${queryString}` : ''}`;
  
  return useQuery({
    queryKey: ['/api/partner/service-analytics', options],
    queryFn: async () => {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch service analytics data');
      }
      
      const data = await response.json() as ServiceAnalyticsResponse;
      return data.analytics;
    },
    enabled: !!user && user?.role === 'partner',
  });
}