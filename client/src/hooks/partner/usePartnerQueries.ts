import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ServiceProviderProfile } from '../../../../shared/harmonized-user-schema';

// Define response types to fix type errors
interface PartnerProfileResponse {
  core: any;
  profile: ServiceProviderProfile | null;
}

interface AddonsResponse {
  addons: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    pricing: number;
    media?: Array<{ type: string; url: string }>;
    availability: boolean;
    tags: string[];
    partnerId: string;
    createdDate: any;
    lastUpdatedDate: any;
  }>;
}

interface BookingsResponse {
  bookings: Array<{
    id: string;
    yachtId?: string;
    userId?: string;
    status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    startDate?: string | Date;
    endDate?: string | Date;
    totalPrice?: number;
    addOns?: Array<{
      id?: string;
      productId?: string;
      name?: string;
      price?: number;
    }>;
    partnerAddons?: Array<{
      id?: string;
      productId?: string;
      name?: string;
      price?: number;
    }>;
    createdAt?: any;
  }>;
}

interface EarningsResponse {
  earnings: {
    total: number;
    currentMonth: number;
    previousMonth: number;
    bookingsCount: number;
    commissionRate: number;
  };
}

/**
 * Hook for fetching partner profile data
 */
export function usePartnerProfile() {
  const { currentUser } = useAuth();
  
  return useQuery<PartnerProfileResponse>({
    queryKey: ['/api/partner/profile'],
    queryFn: async () => {
      const response = await apiRequest<PartnerProfileResponse>('/api/partner/profile');
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
  const { currentUser } = useAuth();
  
  return useQuery<AddonsResponse['addons']>({
    queryKey: ['/api/partner/addons'],
    queryFn: async () => {
      const response = await apiRequest<AddonsResponse>('/api/partner/addons');
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
  const { currentUser } = useAuth();
  
  return useQuery<BookingsResponse['bookings']>({
    queryKey: ['/api/partner/bookings'],
    queryFn: async () => {
      const response = await apiRequest<BookingsResponse>('/api/partner/bookings');
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
  
  return useQuery<EarningsResponse['earnings']>({
    queryKey: ['/api/partner/earnings'],
    queryFn: async () => {
      const response = await apiRequest<EarningsResponse>('/api/partner/earnings');
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