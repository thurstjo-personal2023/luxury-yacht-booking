import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { 
  ServiceProviderProfile, 
  PartnerProfileResponse, 
  PartnerAddon,
  PartnerBooking,
  PartnerEarnings
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
      const response = await apiRequest('/api/partner/profile');
      return response as unknown as PartnerProfileResponse;
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
      const response = await apiRequest<{ success: boolean }>('/api/partner/profile/update', {
        method: 'POST',
        body: JSON.stringify({ core, profile }),
      });
      return response;
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
      const response = await apiRequest('/api/partner/addons');
      const typedResponse = response as unknown as AddonsResponse;
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
      const response = await apiRequest<{ success: boolean; addon: any }>('/api/partner/addons/create', {
        method: 'POST',
        body: JSON.stringify(addonData),
      });
      return response;
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
      const response = await apiRequest('/api/partner/bookings');
      const typedResponse = response as unknown as BookingsResponse;
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
      const response = await apiRequest('/api/partner/earnings');
      const typedResponse = response as unknown as EarningsResponse;
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