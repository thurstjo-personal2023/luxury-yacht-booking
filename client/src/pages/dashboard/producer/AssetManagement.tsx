import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getYachtImageProps, getAddonImageProps } from "@/lib/image-utils";
import { useAuthService } from "@/services/auth";
import { syncAuthClaims } from "@/lib/user-profile-utils";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle,
  Edit,
  Eye,
  FileEdit,
  MoreVertical,
  Plus,
  RefreshCw,
  Sailboat,
  Search,
  Trash2,
  XCircle
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth, db, getCurrentToken, isAuthenticated } from "@/lib/firebase";
import { getAuthHeader, getApiRequestHeaders } from "@/lib/auth-utils";
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { YachtExperience, YachtProfile, ProductAddOn } from "@shared/firestore-schema";

// Extended ProductAddOn interface with cache busting fields
interface ExtendedProductAddOn extends Omit<ProductAddOn, 'lastUpdatedDate'> {
  lastUpdatedDate?: any; // Make it optional for compatibility
  _lastUpdated?: string;
  updatedAt?: any;
  // Standardization tracking
  _standardized?: boolean;
  _standardizedVersion?: number;
  // Standard cover image
  mainImage?: string;
  // Additional fields for multi-standard support
  isAvailable?: boolean;
  active?: boolean;
  id?: string;
  productId: string;
}


// Extended interface to include properties from API response
interface ExtendedYachtExperience extends YachtExperience {
  imageUrl?: string;
  name?: string;
  // Additional properties to handle both naming conventions
  yachtId?: string;
  available?: boolean;
  isAvailable?: boolean;
  // Property for standardized entries
  mainImage?: string;
  // Timestamp properties for cache busting
  _lastUpdated?: string;
  updatedAt?: any; // Can be Timestamp or serialized format
  createdAt?: any;
  // Standardization tracking
  _standardized?: boolean;
  _standardizedVersion?: number;
}

// Pagination interface
interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean; // Added hasNextPage property
}

// API response interfaces
interface YachtsResponse {
  yachts: ExtendedYachtExperience[];
  pagination: PaginationData;
}

interface AddOnsResponse {
  addons: ExtendedProductAddOn[];
  pagination: PaginationData;
}

// Role Debug Component to help diagnose auth and role issues
function RoleDebugSection({ user, authHeader }: { user: any, authHeader: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const [tokenData, setTokenData] = useState<any>(null);
  const [syncingRole, setSyncingRole] = useState(false);
  const { toast } = useToast();
  const { profileData } = useAuthService();
  const { harmonizedUser } = profileData;

  const decodeJwt = (token: string) => {
    try {
      // Get the payload part of the JWT (second part)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to decode JWT token:', e);
      return { error: 'Invalid token format' };
    }
  };

  useEffect(() => {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = decodeJwt(token);
      setTokenData(decoded);
    }
  }, [authHeader]);

  const handleSyncRole = async () => {
    if (syncingRole) return;

    setSyncingRole(true);
    try {
      const result = await syncAuthClaims();

      if (result.success) {
        toast({
          title: "Role synchronized",
          description: result.message || "Your role has been synchronized successfully.",
          variant: "default",
        });

        // Force page reload to apply new permissions
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: "Synchronization failed",
          description: result.message || "Failed to synchronize your role. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Role sync error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during role synchronization.",
        variant: "destructive",
      });
    } finally {
      setSyncingRole(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mb-6 p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <h3 className="text-lg font-semibold">Role Debug Information</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? 'Hide' : 'Show'} Details
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSyncRole();
              }}
              disabled={syncingRole}
              className="mr-2"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncingRole ? 'animate-spin' : ''}`} />
              {syncingRole ? 'Syncing...' : 'Sync Role with Firestore'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">User Information</h4>
              <div className="text-sm rounded bg-gray-50 p-2">
                <p><strong>User ID:</strong> {user.uid}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</p>
                <p><strong>Firestore Role:</strong> {harmonizedUser?.role || 'Not found in Firestore'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">JWT Token Claims</h4>
              <div className="text-sm rounded bg-gray-50 p-2">
                {tokenData ? (
                  <>
                    <p><strong>Role Claim:</strong> {tokenData.role || 'Not set'}</p>
                    <p><strong>Admin:</strong> {tokenData.admin ? 'Yes' : 'No'}</p>
                    <p><strong>Issued At:</strong> {new Date(tokenData.iat * 1000).toLocaleString()}</p>
                    <p><strong>Expires:</strong> {new Date(tokenData.exp * 1000).toLocaleString()}</p>
                  </>
                ) : (
                  <p>No token data available</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded text-amber-800">
            {harmonizedUser?.role !== tokenData?.role ? (
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <p><strong>Role Mismatch Detected:</strong> Your Firebase Auth role ({tokenData?.role || 'none'})
                does not match your Firestore role ({harmonizedUser?.role || 'none'}). Click "Sync Role" to fix this issue.</p>
              </div>
            ) : (
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                <p><strong>Roles Match:</strong> Your Firebase Auth and Firestore roles are in sync.</p>
              </div>
            )}
          </div>

          <div className="mt-2 text-sm text-gray-500">
            <p>If you're experiencing permission issues, try using the "Sync Role" button to synchronize your Firebase Auth claims with your Firestore role.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssetManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuthService();
  const [activeTab, setActiveTab] = useState("yachts");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Dialog state for delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'yacht' | 'addon', name: string} | null>(null);

  // Pagination state
  const [yachtPage, setYachtPage] = useState(1);
  const [addonPage, setAddonPage] = useState(1);
  const pageSize = 10; // Items per page

  // Get current user to determine producer ID
  const [firebaseUser] = useAuthState(auth);
  const [producerData, setProducerData] = useState<{
    producerId: string;
    providerId: string;
  } | null>(null);

  // Query timestamp for cache busting
  const [queryTimestamp, setQueryTimestamp] = useState(Date.now());

  // Yacht query configuration
  const { data: yachtsResponse, isLoading: yachtsLoading } = useQuery<YachtsResponse>({
    queryKey: ["/api/producer/yachts", {
      page: yachtPage,
      pageSize,
      producerId: producerData?.producerId || firebaseUser?.uid,
      timestamp: queryTimestamp
    }],
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // Add-on query configuration
  const { data: addOnsResponse, isLoading: addOnsLoading } = useQuery<AddOnsResponse>({
    queryKey: ["/api/producer/addons", {
      page: addonPage,
      pageSize,
      producerId: producerData?.producerId || firebaseUser?.uid,
      timestamp: queryTimestamp
    }],
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });


  // Extract data from responses and create state for direct manipulation
  const [yachts, setYachts] = useState<ExtendedYachtExperience[]>([]);
  const [addOns, setAddOns] = useState<ExtendedProductAddOn[]>([]);

  // Update state whenever response changes
  useEffect(() => {
    if (yachtsResponse?.yachts) {
      setYachts(yachtsResponse.yachts);
    }
  }, [yachtsResponse]);

  useEffect(() => {
    if (addOnsResponse?.addons) {
      setAddOns(addOnsResponse.addons);
    }
  }, [addOnsResponse]);

  const yachtsPagination = yachtsResponse?.pagination;
  const addonsPagination = addOnsResponse?.pagination;

  // Filtered yachts based on search and category
  const filteredYachts = yachts?.filter((yacht: ExtendedYachtExperience) => {
    // Handle both title and name for search
    const yachtTitle = yacht.title || yacht.name || '';
    const yachtDesc = yacht.description || '';

    const matchesSearch = !searchQuery ||
      yachtTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      yachtDesc.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || yacht.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Filtered add-ons based on search and category
  const filteredAddOns = addOns?.filter((addon: ExtendedProductAddOn) => {
    const matchesSearch = !searchQuery ||
      addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addon.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || addon.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const yachtCategories = yachts ? Array.from(new Set(yachts.map((yacht: ExtendedYachtExperience) => yacht.category))).sort() : [];
  const addonCategories = addOns ? Array.from(new Set(addOns.map((addon: ExtendedProductAddOn) => addon.category))).sort() : [];

  // Handlers
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  // Navigation
  const goToDashboard = () => setLocation("/dashboard/producer");
  const goToAddYacht = () => setLocation("/dashboard/producer/assets/new-yacht");
  const goToAddService = () => setLocation("/dashboard/producer/assets/new-service");
  const goToEditYacht = (id: string | undefined) => {
    if (!id) {
      console.error("Cannot navigate to edit yacht: Missing ID");
      toast({
        title: "Navigation Error",
        description: "Unable to edit this yacht due to missing ID",
        variant: "destructive"
      });
      return;
    }
    setLocation(`/dashboard/producer/assets/edit-yacht/${id}`);
  };
  const goToEditService = (id: string) => setLocation(`/dashboard/producer/assets/edit-service/${id}`);
  const goToYachtDetails = (id: string | undefined) => {
    if (!id) {
      console.error("Cannot navigate to yacht details: Missing ID");
      toast({
        title: "Navigation Error",
        description: "Unable to view this yacht due to missing ID",
        variant: "destructive"
      });
      return;
    }
    setLocation(`/yacht/${id}`);
  };

  // Show delete confirmation dialog
  const openDeleteConfirm = (id: string, type: 'yacht' | 'addon', name: string) => {
    setItemToDelete({ id, type, name });
    setDeleteConfirmOpen(true);
  };

  // Delete yacht or addon
  const handleDelete = async (id: string, type: 'yacht' | 'addon') => {
    if (!id) return;

    try {
      if (type === 'yacht') {
        // Delete from Firestore (unified collection)
        const yachtRef = doc(db, "unified_yacht_experiences", id);
        await deleteDoc(yachtRef);

        // Use a more aggressive cache invalidation approach
        console.log('Invalidating all yacht queries after deletion...');

        // First, remove all yacht producer queries from cache to ensure fresh data
        queryClient.removeQueries({ queryKey: ["/api/producer/yachts"] });

        // Then invalidate to trigger refetching
        queryClient.invalidateQueries({
          queryKey: ["/api/producer/yachts"],
          refetchType: 'all'
        });

        // Explicitly invalidate all pages to ensure complete refresh
        for (let page = 1; page <= 5; page++) { // Assume maximum of 5 pages for safety
          queryClient.invalidateQueries({
            queryKey: ["/api/producer/yachts", { page, pageSize }],
            refetchType: 'all'
          });
        }

        // Also invalidate experiences endpoint as it might contain the same data
        queryClient.invalidateQueries({
          queryKey: ["/api/experiences"],
          refetchType: 'all'
        });

        // Invalidate featured experiences
        queryClient.invalidateQueries({
          queryKey: ["/api/experiences/featured"],
          refetchType: 'all'
        });

        toast({
          title: "Yacht Deleted",
          description: "The yacht has been successfully deleted.",
        });
      } else {
        // Delete addon from Firestore
        const addonRef = doc(db, "products_add_ons", id);
        await deleteDoc(addonRef);

        // Use a more aggressive cache invalidation for add-ons as well
        queryClient.removeQueries({ queryKey: ["/api/producer/addons"] });

        // Then invalidate to trigger refetching
        queryClient.invalidateQueries({
          queryKey: ["/api/producer/addons"],
          refetchType: 'all'
        });

        // Explicitly invalidate all pages
        for (let page = 1; page <= 5; page++) {
          queryClient.invalidateQueries({
            queryKey: ["/api/producer/addons", { page, pageSize }],
            refetchType: 'all'
          });
        }

        toast({
          title: "Service Add-on Deleted",
          description: "The service add-on has been successfully deleted.",
        });
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      toast({
        title: "Deletion Failed",
        description: `Failed to delete the ${type}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  // Toggle yacht activation status
  const toggleYachtActivation = async (yacht: ExtendedYachtExperience) => {
    try {
      // Use our consistent helper function to get the status
      const isActive = getYachtActiveStatus(yacht);

      console.log('Current availability status:', {
        isAvailable: yacht.isAvailable,
        availability_status: yacht.availability_status,
        available: yacht.available,
        computed: isActive
      });

      const newStatus = !isActive;
      const docId = yacht.package_id || yacht.yachtId || yacht.id;

      if (!docId) {
        console.error("Cannot update yacht: Missing document ID");
        throw new Error("Missing yacht ID");
      }

      // Generate a timestamp for cache busting
      const timestamp = Date.now().toString();

      // Find the index of the yacht in the array before modification
      // This will help us update the UI more reliably
      const yachtIndex = yachts.findIndex(y =>
        (y.package_id === docId) || (y.yachtId === docId) || (y.id === docId)
      );

      if (yachtIndex === -1) {
        console.warn(`Could not find yacht with ID ${docId} in local state`);
      }

      // Immediately update the UI for responsive feedback
      // This provides an instant visual update even before the API call succeeds
      const updatedYachts = [...yachts];
      if (yachtIndex !== -1) {
        console.log(`Updating yacht at index ${yachtIndex} in local state to isActive=${newStatus}`);
        // Create a new object with updated status to ensure React detects the change
        updatedYachts[yachtIndex] = {
          ...updatedYachts[yachtIndex],
          availability_status: newStatus,
          available: newStatus,
          isAvailable: newStatus,
          _lastUpdated: timestamp
        };
        setYachts(updatedYachts);
      }

      // Log debugging information for current yacht data
      if (yachtIndex !== -1) {
        console.log('Current yacht data:', JSON.stringify(updatedYachts[yachtIndex], null, 2));
      }

      console.log(`Toggling activation for yacht ${docId}: ${isActive} → ${newStatus}`);

      // Use a direct API call to server to ensure consistent update
      try {
        // Updated endpoint URL to match server routes
        console.log(`Sending API request to /api/yachts/${docId}/activate with active=${newStatus}`);

        // Get fresh authentication headers using our improved utilities
        let authHeader = {};
        try {
          // Use our improved auth utilities to get a fresh token
          authHeader = await getApiRequestHeaders(true);
          console.log('Successfully obtained fresh auth headers for yacht activation');
        } catch (tokenError) {
          console.error('Could not get fresh auth headers:', tokenError);
        }

        // Force a random cache-busting query param to avoid cached responses
        const cacheBuster = Math.random().toString(36).substring(2);

        const response = await fetch(`/api/yachts/${docId}/activate?cb=${cacheBuster}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...authHeader
          },
          body: JSON.stringify({
            active: newStatus,
            timestamp: timestamp
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`Successfully updated yacht ${docId} via API:`, result);

          // Update timestamp from server response if available
          if (result.timestamp) {
            console.log(`Updating yacht with server timestamp: ${result.timestamp}`);
            const updatedYachts = [...yachts];
            const yachtIndex = updatedYachts.findIndex(y =>
              (y.package_id === docId) || (y.yachtId === docId) || (y.id === docId)
            );
            if (yachtIndex !== -1) {
              updatedYachts[yachtIndex] = {
                ...updatedYachts[yachtIndex],
                _lastUpdated: result.timestamp
              };
              setYachts(updatedYachts);
            }
          }

          console.log(`Successfully activated/deactivated yacht ${docId} via API`);
        } else {
          const errorText = await response.text();
          console.error(`Server returned ${response.status}: ${response.statusText}`, errorText);
          throw new Error(`Server returned ${response.status}: ${errorText}`);
        }
      } catch (apiError) {
        console.error('API activation failed, falling back to direct Firestore update', apiError);

        // Fall back to direct Firestore updates if API fails
        // Use writeBatch for atomic updates across collections
        console.log('API call failed, using batch update across all collections');

        try {
          // Define update object once to ensure consistency
          const updateData = {
            // Standardize on isAvailable as the primary field
            isAvailable: newStatus,
            // Keep backwards compatibility fields
            availability_status: newStatus,
            available: newStatus,
            // Add timestamp fields for tracking
            last_updated_date: serverTimestamp(),
            updatedAt: serverTimestamp(),
            // Add explicit string timestamp for cache busting with images
            _lastUpdated: timestamp
          };

          console.log('Update payload:', JSON.stringify(updateData, null, 2));

          // Create a batch for atomic updates
          const batch = writeBatch(db);

          // Reference ONLY the unified collection - we're standardizing on this one
          const unifiedRef = doc(db, "unified_yacht_experiences", docId);

          console.log(`Adding batch update for yacht ${docId} to unified collection only`);

          // Add update operation to the batch
          try {
            // Safe batch update
            console.log(`Adding update operation to batch for yacht ${docId}`);

            // Add update to the batch
            batch.update(unifiedRef, updateData);
            console.log(`Added unified_yacht_experiences document to batch update`);

            // Commit the batch
            await batch.commit();
            console.log(`Successfully updated yacht ${docId} in unified collection`);
          } catch (error) {
            const err = error as Error;
            console.error(`Failed to commit batch update: ${err.message}`);
            throw error; // Re-throw to be caught by outer catch
          }
        } catch (batchErr) {
          console.error('Batch update failed:', batchErr);

          // If batch fails, try individual update as fallback
          console.log('Attempting individual update as fallback...');

          let updateSucceeded = false;

          // Try only the unified collection
          try {
            const unifiedRef = doc(db, "unified_yacht_experiences", docId);
            await updateDoc(unifiedRef, {
              isAvailable: newStatus,
              availability_status: newStatus,
              available: newStatus,
              last_updated_date: serverTimestamp(),
              updatedAt: serverTimestamp(),
              _lastUpdated: timestamp
            });
            console.log(`Updated yacht in unified_yacht_experiences collection`);
            updateSucceeded = true;
          } catch (unifiedErr) {
            console.warn(`Failed to update in unified_yacht_experiences:`, unifiedErr);
          }

          if (!updateSucceeded) {
            throw new Error('Failed to update in unified collection');
          }
        }
      }

      // Force reload with a fresh timestamp
      setQueryTimestamp(Date.now());

      // Perform more aggressive cache invalidation
      console.log('Performing aggressive cache invalidation...');

      // First reset the entire query cache
      queryClient.resetQueries();

      // Then specifically invalidate producer yachts
      queryClient.invalidateQueries({
        queryKey: ["/api/producer/yachts"],
        refetchType: 'all'
      });

      // Explicitly invalidate all pages to ensure complete refresh
      for (let page = 1; page <= 5; page++) {
        queryClient.invalidateQueries({
          queryKey: ["/api/producer/yachts", { page, pageSize }],
          refetchType: 'all'
        });
      }

      // Invalidate all other yacht-related endpoints
      queryClient.invalidateQueries({
        queryKey: ["/api/experiences"],
        refetchType: 'all'
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/experiences/featured"],
        refetchType: 'all'
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/yacht", docId],
        refetchType: 'all'
      });

      // Ensure our local state object is also updated (double-check)
      if (yachtIndex === -1) {
        // Direct modification of the yacht object is a fallback in case we couldn't find it by index
        yacht.availability_status = newStatus;
        yacht.available = newStatus;
        yacht.isAvailable = newStatus;
        yacht._lastUpdated = timestamp;

        // Force component update using the spread operator to create a new array
        setYachts(prev => {
          if (!prev) return prev;
          return [...prev];
        });
      }

      const yachtTitle = yacht.title || yacht.name || '';

      toast({
        title: newStatus ? "Yacht Activated" : "Yacht Deactivated",
        description: `${yachtTitle} is now ${newStatus ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      console.error("Error toggling yacht activation:", error);
      toast({
        title: "Action Failed",
        description: "Failed to update yacht status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Toggle addon activation status
  const toggleAddonActivation = async (addon: ExtendedProductAddOn) => {
    try {
      // Use our consistent helper function to get the status
      const isActive = getAddonActiveStatus(addon);

      console.log('Current add-on availability status:', {
        availability: addon.availability,
        computed: isActive
      });

      const newStatus = !isActive;
      const docId = addon.productId;

      if (!docId) {
        console.error("Cannot update add-on: Missing product ID");
        throw new Error("Missing product ID");
      }

      // Generate a timestamp for cache busting
      const timestamp = Date.now().toString();

      // Find the index of the add-on in the array before modification
      const addonIndex = addOns.findIndex(a => a.productId === docId);

      if (addonIndex === -1) {
        console.warn(`Could not find add-on with ID ${docId} in local state`);
      }

      // Immediately update the UI for responsive feedback
      const updatedAddOns = [...addOns];
      if (addonIndex !== -1) {
        console.log(`Updating add-on at index ${addonIndex} in local state to availability=${newStatus}`);
        // Create a new object with updated status to ensure React detects the change
        updatedAddOns[addonIndex] = {
          ...updatedAddOns[addonIndex],
          availability: newStatus,
          _lastUpdated: timestamp
        };
        setAddOns(updatedAddOns);
      }

      // Log debugging information for current add-on data
      if (addonIndex !== -1) {
        console.log('Current add-on data:', JSON.stringify(updatedAddOns[addonIndex], null, 2));
      }

      try {
        // First try updating via API
        // Get fresh authentication headers using our improved utilities
        let authHeader = {};
        try {
          // Use our improved auth utilities to get a fresh token
          authHeader = await getApiRequestHeaders(true);
          console.log('Successfully obtained fresh auth headers for addon activation');
        } catch (tokenError) {
          console.error('Could not get fresh auth headers:', tokenError);
        }

        // Force a random cache-busting query param to avoid cached responses
        const cacheBuster = Math.random().toString(36).substring(2);

        const response = await fetch(`/api/addon/${docId}/activate?cb=${cacheBuster}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            ...authHeader
          },
          body: JSON.stringify({
            isActive: newStatus,
            timestamp: timestamp
          }),
        });

        if (response.ok) {
          const responseData = await response.json();
          console.log(`Successfully updated add-on ${docId} via API:`, responseData);

          // Force query refetching to ensure consistency
          queryClient.invalidateQueries({
            queryKey: ["/api/producer/addons"],
            refetchType: 'all'
          });

          // Update timestamp from server response if available
          if (responseData.timestamp) {
            console.log(`Updating addon with server timestamp: ${responseData.timestamp}`);
            const updatedAddOns = [...addOns];
            const addonIndex = updatedAddOns.findIndex(a => a.productId === docId);
            if (addonIndex !== -1) {
              updatedAddOns[addonIndex] = {
                ...updatedAddOns[addonIndex],
                _lastUpdated: responseData.timestamp
              };
              setAddOns(updatedAddOns);
            }
          }
        } else {
          const errorText = await response.text();
          console.error(`API call failed: ${response.status}`, errorText);
          throw new Error(`API call failed: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.warn("API call failed, falling back to direct Firestore update", error);

        try {
          // Define update object once to ensure consistency
          const updateData = {
            // Standardize on availability field
            availability: newStatus,
            // Add timestamp fields for tracking
            lastUpdatedDate: serverTimestamp(),
            // Add explicit string timestamp for cache busting with images
            _lastUpdated: timestamp
          };

          console.log('Update payload:', JSON.stringify(updateData, null, 2));

          // Reference the collection where add-ons exist
          const addonRef = doc(db, "products_add_ons", docId);

          // Update the document
          await updateDoc(addonRef, updateData);
          console.log(`Successfully updated add-on ${docId} in Firestore`);

          // Force query refetching to ensure consistency
          queryClient.invalidateQueries({
            queryKey: ["/api/producer/addons"],
            refetchType: 'all'
          });
        } catch (fbError) {
          console.error("Firestore update attempt failed:", fbError);
          throw fbError;
        }
      }

      // Force query cache invalidation
      queryClient.invalidateQueries({
        queryKey: ["/api/producer/addons"],
        refetchType: 'all'
      });

      // Explicitly invalidate all pages
      for (let page = 1; page <= 5; page++) {
        queryClient.invalidateQueries({
          queryKey: ["/api/producer/addons", { page, pageSize }],
          refetchType: 'all'
        });
      }

      // Ensure our local state object is also updated (double-check)
      if (addonIndex === -1) {
        // Direct modification of the addon object is a fallback
        addon.availability = newStatus;
        addon._lastUpdated = timestamp;

        // Force component update using the spread operator to create a new array
        setAddOns(prev => {
          if (!prev) return prev;
          return [...prev];
        });
      }

      toast({
        title: newStatus ? "Add-on Activated" : "Add-on Deactivated",
        description: `${addon.name} is now ${newStatus ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      console.error("Error toggling add-on activation:", error);
      toast({
        title: "Action Failed",
        description: "Failed to update add-on status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle pagination
  const handleNextYachtPage = () => {
    if (yachtsResponse && yachtsResponse.pagination.hasNextPage) {
      setYachtPage(prev => prev + 1);
    }
  };

  const handlePreviousYachtPage = () => {
    if (yachtPage > 1) {
      setYachtPage(prev => prev - 1);
    }
  };

  const handleNextAddonPage = () => {
    if (addOnsResponse && addOnsResponse.pagination.hasNextPage) {
      setAddonPage(prev => prev + 1);
    }
  };

  const handlePreviousAddonPage = () => {
    if (addonPage > 1) {
      setAddonPage(prev => prev - 1);
    }
  };

  // Refresh data
  const refreshData = () => {
    setQueryTimestamp(Date.now());
    queryClient.invalidateQueries(["/api/producer/yachts"]);
    queryClient.invalidateQueries(["/api/producer/addons"]);
  };

  // Navigation handlers
  const goToAddYacht = () => setLocation("/dashboard/producer/add-yacht");
  const goToAddService = () => setLocation("/dashboard/producer/add-service");

  // Helper to consistently get the active status across the component
  const getYachtActiveStatus = (yacht: ExtendedYachtExperience): boolean => {
    // Prioritize isAvailable (newer field) but fall back to others for compatibility
    // Force typecast status fields to boolean with !! to handle various truthy/falsy values
    return yacht.isAvailable !== undefined
      ? !!yacht.isAvailable
      : (yacht.availability_status !== undefined
          ? !!yacht.availability_status
          : !!yacht.available);
  };

  // Helper to get the addon availability status with improved standardization
  const getAddonActiveStatus = (addon: ExtendedProductAddOn): boolean => {
    // Standardize availability/active status
    // Check for all possible field names with consistent boolean conversion
    if (addon.availability !== undefined) {
      return !!addon.availability;
    }
    // Fall back to other possible field names if they exist
    if (addon.isAvailable !== undefined) {
      return !!addon.isAvailable;
    }
    if (addon.active !== undefined) {
      return !!addon.active;
    }
    // Default to false if no availability field is found
    return false;
  };

  // Create status badge for yachts
  const renderStatusBadge = (yacht: ExtendedYachtExperience) => {
    // Get all available status fields for logging
    const availFields = {
      isAvailable: yacht.isAvailable,
      availability_status: yacht.availability_status,
      available: yacht.available
    };

    // Get active status consistently
    const isActive = getYachtActiveStatus(yacht);

    // Check for standardization using explicit marker or fallback to mainImage presence
    const isStandardized = yacht._standardized === true || !!yacht.mainImage;

    // Get standardization version if available
    const standardVersion = yacht._standardizedVersion || (isStandardized ? 1 : 0);

    // Log the state to help debug status inconsistencies
    const yachtId = yacht.id || yacht.package_id || yacht.yachtId;
    const yachtName = yacht.title || yacht.name;
    console.log(`Status badge for yacht ${yachtName} (${yachtId}): `,
      availFields,
      `computed=${isActive}, standardized=${isStandardized}, version=${standardVersion}`
    );

    return (
      <div className="flex flex-wrap gap-1.5">
        {isActive ? (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-200">
            Inactive
          </Badge>
        )}

        {isStandardized && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
            {standardVersion > 1 ? `Standardized v${standardVersion}` : 'Standardized'}
          </Badge>
        )}

        {!isStandardized && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
            Legacy Format
          </Badge>
        )}
      </div>
    );
  };

  // Create status badge for addons with enhanced logging and display
  const renderAddonStatusBadge = (addon: ExtendedProductAddOn) => {
    // Get active status consistently
    const isActive = getAddonActiveStatus(addon);

    // Check standardization status
    const isStandardized = addon._standardized === true || !!addon.mainImage;

    // Get standardization version if available
    const standardVersion = addon._standardizedVersion || (isStandardized ? 1 : 0);

    // Get all available status fields for detailed logging
    const availFields = {
      availability: addon.availability,
      isAvailable: addon.isAvailable,
      active: addon.active
    };

    // Log detailed information for debugging
    console.log(`Status badge for addon ${addon.name} (${addon.productId}): `,
      availFields,
      `computed=${isActive}, standardized=${isStandardized}, version=${standardVersion}`,
      `lastUpdated=${addon._lastUpdated || addon.lastUpdatedDate?.seconds || addon.updatedAt?.seconds}`
    );

    return (
      <div className="flex flex-wrap gap-1.5">
        {isActive ? (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-200">
            Inactive
          </Badge>
        )}

        {isStandardized && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
            {standardVersion > 1 ? `Standardized v${standardVersion}` : 'Standardized'}
          </Badge>
        )}

        {!isStandardized && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
            Legacy Format
          </Badge>
        )}

        {addon._lastUpdated && (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 text-xs">
            Updated: {new Date(parseInt(addon._lastUpdated)).toLocaleTimeString()}
          </Badge>
        )}
      </div>
    );
  };

  // Placeholder components
  const YachtList = ({ yachts, onDelete, onRefresh }: { yachts: ExtendedYachtExperience[], onDelete: (yacht: ExtendedYachtExperience) => void, onRefresh: () => void }) => (
    <div>
      {/* Implement Yacht List here */}
      {yachts.map(yacht => (
        <div key={yacht.id}>
          <h3>{yacht.title || yacht.name}</h3>
          <Button onClick={() => onDelete(yacht)}>Delete</Button>
        </div>
      ))}
      <Button onClick={onRefresh}>Refresh</Button>
      <div>
        <Button onClick={handlePreviousYachtPage}>Previous Page</Button>
        <Button onClick={handleNextYachtPage}>Next Page</Button>
      </div>
    </div>
  );
  const ServiceList = ({ services, onDelete, onRefresh }: { services: ExtendedProductAddOn[], onDelete: (service: ExtendedProductAddOn) => void, onRefresh: () => void }) => (
    <div>
      {/* Implement Service List here */}
      <Button onClick={onRefresh}>Refresh</Button>
      <div>
        <Button onClick={handlePreviousAddonPage}>Previous Page</Button>
        <Button onClick={handleNextAddonPage}>Next Page</Button>
      </div>
    </div>
  );

  const DeleteConfirmDialog = ({ open, onOpenChange, item, onConfirm }: { open: boolean, onOpenChange: (value: boolean) => void, item: { id: string; type: 'yacht' | 'addon'; name: string } | null, onConfirm: () => Promise<void> }) => (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {item && (
              <>
                This will permanently delete <strong>{item.name}</strong> and
                cannot be undone. All associated data will also be deleted.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <>
      <RoleDebugSection
        user={firebaseUser}
        authHeader={null} // Removed authHeader from here -  it's not needed anymore
      />

      <DashboardLayout>
        <div className="container mx-auto p-4">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 mb-4"
                  onClick={goToDashboard}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>

                <h1 className="text-3xl font-bold">Asset Management</h1>
                <p className="text-muted-foreground">
                  Manage your yachts, services, and add-ons
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={goToAddYacht} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Yacht
                </Button>
                <Button onClick={goToAddService} variant="outline" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Service
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList>
                <TabsTrigger value="yachts">Yachts</TabsTrigger>
                <TabsTrigger value="services">Services & Add-ons</TabsTrigger>
              </TabsList>

              <TabsContent value="yachts">
                {yachtsLoading ? (
                  <div>Loading yachts...</div>
                ) : (
                  <YachtList
                    yachts={yachtsResponse?.yachts || []}
                    onDelete={(yacht) => {
                      setItemToDelete({
                        id: yacht.id,
                        type: 'yacht',
                        name: yacht.title
                      });
                      setDeleteConfirmOpen(true);
                    }}
                    onRefresh={refreshData}
                  />
                )}
              </TabsContent>

              <TabsContent value="services">
                <ServiceList
                  services={addOnsResponse?.addons || []}
                  onDelete={(addon) => {
                    setItemToDelete({
                      id: addon.productId,
                      type: 'addon',
                      name: addon.name
                    });
                    setDeleteConfirmOpen(true);
                  }}
                  onRefresh={refreshData}
                />
              </TabsContent>
            </Tabs>
          </div>

          <DeleteConfirmDialog
            open={deleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
            item={itemToDelete}
            onConfirm={async () => {
              if (!itemToDelete) return;

              try {
                if (itemToDelete.type === 'yacht') {
                  await fetch(`/api/producer/yachts/${itemToDelete.id}`, {
                    method: 'DELETE'
                  });
                } else {
                  await fetch(`/api/producer/addons/${itemToDelete.id}`, {
                    method: 'DELETE'
                  });
                }

                refreshData();
                toast({
                  title: "Success",
                  description: `${itemToDelete.name} was deleted successfully.`
                });
              } catch (error) {
                console.error('Delete failed:', error);
                toast({
                  title: "Error",
                  description: "Failed to delete item. Please try again.",
                  variant: "destructive"
                });
              }

              setDeleteConfirmOpen(false);
              setItemToDelete(null);
            }}
          />
        </div>
      </DashboardLayout>
    </>
  );
}