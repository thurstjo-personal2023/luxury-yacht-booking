import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ServiceProviderProfile } from '../../../../shared/harmonized-user-schema';

/**
 * Hook for fetching partner profile data
 */
export function usePartnerProfile() {
  const { currentUser } = useAuth();
  
  return useQuery({
    queryKey: ['/api/partner/profile'],
    queryFn: async () => {
      const response = await apiRequest('/api/partner/profile');
      return response;
    },
    enabled: !!currentUser && currentUser.role === 'partner',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for updating partner profile
 */
export function useUpdatePartnerProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ core, profile }: { 
      core?: { name?: string; phone?: string; email?: string };
      profile?: Partial<ServiceProviderProfile>;
    }) => {
      const response = await apiRequest('/api/partner/profile/update', {
        method: 'POST',
        data: { core, profile },
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
  const { currentUser } = useAuth();
  
  return useQuery({
    queryKey: ['/api/partner/addons'],
    queryFn: async () => {
      const response = await apiRequest('/api/partner/addons');
      return response.addons || [];
    },
    enabled: !!currentUser && currentUser.role === 'partner',
  });
}

/**
 * Hook for creating a new add-on
 */
export function useCreateAddon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (addonData: {
      name: string;
      description?: string;
      category: string;
      pricing: number;
      media?: Array<{ type: string; url: string }>;
      availability?: boolean;
      tags?: string[];
    }) => {
      const response = await apiRequest('/api/partner/addons/create', {
        method: 'POST',
        data: addonData,
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
  const { currentUser } = useAuth();
  
  return useQuery({
    queryKey: ['/api/partner/bookings'],
    queryFn: async () => {
      const response = await apiRequest('/api/partner/bookings');
      return response.bookings || [];
    },
    enabled: !!currentUser && currentUser.role === 'partner',
  });
}

/**
 * Hook for fetching partner earnings data
 */
export function usePartnerEarnings() {
  const { currentUser } = useAuth();
  
  return useQuery({
    queryKey: ['/api/partner/earnings'],
    queryFn: async () => {
      const response = await apiRequest('/api/partner/earnings');
      return response.earnings || {
        total: 0,
        currentMonth: 0,
        previousMonth: 0,
        bookingsCount: 0,
        commissionRate: 0.8,
      };
    },
    enabled: !!currentUser && currentUser.role === 'partner',
  });
}