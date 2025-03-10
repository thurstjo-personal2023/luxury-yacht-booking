import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getYachtImageProps, getAddonImageProps } from "@/lib/image-utils";
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
  ArrowLeft, 
  ChevronLeft,
  ChevronRight,
  Check, 
  Edit, 
  Eye, 
  FileEdit, 
  MoreVertical, 
  Plus, 
  Sailboat, 
  Search, 
  Trash2, 
  XCircle 
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { auth, db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { YachtExperience, YachtProfile, ProductAddOn } from "@shared/firestore-schema";

// Extended ProductAddOn interface with cache busting fields
interface ExtendedProductAddOn extends Omit<ProductAddOn, 'lastUpdatedDate'> {
  lastUpdatedDate?: any; // Make it optional for compatibility
  _lastUpdated?: string;
  updatedAt?: any;
}


// Extended interface to include properties from API response
interface ExtendedYachtExperience extends YachtExperience {
  imageUrl?: string;
  name?: string; 
  // Additional properties to handle both naming conventions
  yachtId?: string;
  available?: boolean;
  // Timestamp properties for cache busting
  _lastUpdated?: string;
  updatedAt?: any; // Can be Timestamp or serialized format
  createdAt?: any;
}

// Pagination interface
interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
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

export default function AssetManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  const [user] = useAuthState(auth);
  const producerId = user?.uid;
  
  // Queries with pagination - add timestamp for forcing refresh
  const currentTimestamp = useRef(Date.now()).current;
  
  const { data: yachtsResponse, isLoading: yachtsLoading } = useQuery<YachtsResponse>({
    queryKey: ["/api/producer/yachts", { page: yachtPage, pageSize, producerId, timestamp: currentTimestamp }],
    refetchOnMount: 'always', // Always refetch when component mounts
  });
  
  const { data: addOnsResponse, isLoading: addOnsLoading } = useQuery<AddOnsResponse>({
    queryKey: ["/api/addons/producer", { page: addonPage, pageSize, timestamp: currentTimestamp }],
    refetchOnMount: 'always', // Always refetch when component mounts
  });
  
  // Extract data from responses
  const yachts = yachtsResponse?.yachts || [];
  const yachtsPagination = yachtsResponse?.pagination;
  
  const addOns = addOnsResponse?.addons || [];
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
        // Delete from Firestore
        const yachtRef = doc(db, "yacht_experiences", id);
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
        queryClient.removeQueries({ queryKey: ["/api/addons/producer"] });
        
        // Then invalidate to trigger refetching
        queryClient.invalidateQueries({ 
          queryKey: ["/api/addons/producer"],
          refetchType: 'all'
        });
        
        // Explicitly invalidate all pages
        for (let page = 1; page <= 5; page++) {
          queryClient.invalidateQueries({
            queryKey: ["/api/addons/producer", { page, pageSize }],
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
      // Handle both field naming conventions
      const isActive = yacht.availability_status !== undefined 
        ? yacht.availability_status 
        : (yacht.available || false);
        
      const newStatus = !isActive;
      const docId = yacht.package_id || yacht.yachtId || yacht.id;
      
      if (!docId) {
        console.error("Cannot update yacht: Missing document ID");
        throw new Error("Missing yacht ID");
      }
      
      // First try updating in yacht_experiences collection
      const yachtCollection = collection(db, "yacht_experiences");
      const yachtRef = doc(yachtCollection, docId);
      
      // Log the document being updated
      console.log(`Attempting to update yacht document: ${docId} in yacht_experiences collection`);
      console.log(`Setting availability_status to: ${newStatus}`);
      
      try {
        // Update both field naming conventions for maximum compatibility
        // Add additional timestamp field for cache busting
        const timestamp = Date.now().toString();
        await updateDoc(yachtRef, { 
          availability_status: newStatus,
          available: newStatus,
          last_updated_date: serverTimestamp(),
          updatedAt: serverTimestamp(),
          _lastUpdated: timestamp // Used for cache busting with images
        });
        console.log(`Successfully updated yacht ${docId} in yacht_experiences collection`);
      } catch (err) {
        // If update fails, try the experience_packages collection as fallback
        console.warn(`Failed to update in yacht_experiences, trying experience_packages collection`, err);
        const expCollection = collection(db, "experience_packages");
        const expRef = doc(expCollection, docId);
        
        // Use the same timestamp for consistency across collections
        const timestamp = Date.now().toString();
        await updateDoc(expRef, { 
          availability_status: newStatus,
          available: newStatus,
          last_updated_date: serverTimestamp(),
          updatedAt: serverTimestamp(),
          _lastUpdated: timestamp // Used for cache busting with images
        });
        console.log(`Successfully updated yacht ${docId} in experience_packages collection`);
      }
      
      // Always try to update the unified collection as well
      try {
        const unifiedCollection = collection(db, "unified_yacht_experiences");
        const unifiedRef = doc(unifiedCollection, docId);
        
        // Update with both property naming conventions to ensure compatibility
        // Use the same timestamp for consistency across all collections
        const timestamp = Date.now().toString();
        await updateDoc(unifiedRef, { 
          availability_status: newStatus,
          available: newStatus,
          isAvailable: newStatus, // New unified schema field
          last_updated_date: serverTimestamp(),
          updatedAt: serverTimestamp(),
          _lastUpdated: timestamp // Used for cache busting with images
        });
        console.log(`Successfully updated yacht ${docId} in unified_yacht_experiences collection`);
      } catch (unifiedErr) {
        // Log but don't throw error if unified collection update fails
        console.warn(`Failed to update in unified_yacht_experiences collection`, unifiedErr);
      }
      
      // Use a more aggressive cache invalidation approach
      console.log('Invalidating all yacht queries to refresh data...');
      
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
      
      // Also check if this yacht might be featured, and invalidate that query too
      if (yacht.featured) {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/experiences/featured"],
          refetchType: 'all'
        });
      }
      
      const yachtTitle = yacht.title || yacht.name || '';
      
      // Update the local state to reflect the change immediately
      // This provides immediate UI feedback before the query refetches
      yacht.availability_status = newStatus;
      yacht.available = newStatus;
      
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
  
  // Pagination handlers
  const handlePreviousYachtPage = () => {
    if (yachtPage > 1) {
      setYachtPage(prev => prev - 1);
    }
  };

  const handleNextYachtPage = () => {
    if (yachtsPagination && yachtPage < yachtsPagination.totalPages) {
      setYachtPage(prev => prev + 1);
    }
  };

  const handlePreviousAddonPage = () => {
    if (addonPage > 1) {
      setAddonPage(prev => prev - 1);
    }
  };

  const handleNextAddonPage = () => {
    if (addonsPagination && addonPage < addonsPagination.totalPages) {
      setAddonPage(prev => prev + 1);
    }
  };
  
  // Create status badge
  const renderStatusBadge = (status: boolean) => {
    return status ? (
      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
        Active
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-200">
        Inactive
      </Badge>
    );
  };
  
  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete && (
                <>
                  This will permanently delete <strong>{itemToDelete.name}</strong> and 
                  cannot be undone. All associated data will also be deleted.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => itemToDelete && handleDelete(itemToDelete.id, itemToDelete.type)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <DashboardLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 mb-4" 
              onClick={goToDashboard}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
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
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <TabsList className="mb-2 md:mb-0">
                <TabsTrigger value="yachts">Yachts</TabsTrigger>
                <TabsTrigger value="services">Services & Add-ons</TabsTrigger>
              </TabsList>
              
              <div className="w-full md:w-auto flex gap-2">
                <div className="relative w-full md:w-[300px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </div>
                
                {activeTab === "yachts" && yachtCategories.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        {selectedCategory || "Filter by Category"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Select Category</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setSelectedCategory(null)}>
                        All Categories
                      </DropdownMenuItem>
                      {yachtCategories.map(category => (
                        <DropdownMenuItem 
                          key={category}
                          onClick={() => handleCategoryChange(category)}
                        >
                          {category}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {activeTab === "services" && addonCategories.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        {selectedCategory || "Filter by Category"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Select Category</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setSelectedCategory(null)}>
                        All Categories
                      </DropdownMenuItem>
                      {addonCategories.map(category => (
                        <DropdownMenuItem 
                          key={category}
                          onClick={() => handleCategoryChange(category)}
                        >
                          {category}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            
            {/* Yachts Tab Content */}
            <TabsContent value="yachts" className="space-y-6">
              {yachtsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-20 bg-muted rounded-lg"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredYachts?.length === 0 ? (
                <div className="text-center py-12">
                  <Sailboat className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Yachts Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery || selectedCategory 
                      ? "No yachts match your search criteria. Try adjusting your filters."
                      : "You haven't added any yachts yet."}
                  </p>
                  <Button onClick={goToAddYacht}>
                    Add Your First Yacht
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Yacht List */}
                  {filteredYachts?.map((yacht: ExtendedYachtExperience) => (
                    <Card key={yacht.package_id || yacht.yachtId || yacht.id} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        {/* Image */}
                        <div className="w-full md:w-64 h-48 md:h-auto">
                          <img 
                            {...getYachtImageProps(yacht)}
                            className="w-full h-full object-cover"
                            // Generate a more intelligent key based on available timestamps
                            key={`yacht-img-${yacht.id || yacht.package_id || yacht.yachtId}-${yacht._lastUpdated || yacht.last_updated_date?.seconds || yacht.updatedAt?.seconds || Date.now()}`}
                          />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 p-6">
                          <div className="flex flex-col md:flex-row justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold mb-1">{yacht.title || yacht.name}</h3>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary">{yacht.category}</Badge>
                                {renderStatusBadge(yacht.availability_status !== undefined ? !!yacht.availability_status : !!yacht.available)}
                                {yacht.featured && (
                                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                                    Featured
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-2 mt-4 md:mt-0">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center gap-1"
                                onClick={() => goToEditYacht(yacht.package_id || yacht.yachtId || yacht.id || '')}
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => toggleYachtActivation(yacht)}
                                  >
                                    {(yacht.availability_status !== undefined ? !!yacht.availability_status : !!yacht.available) ? (
                                      <>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => openDeleteConfirm(
                                      yacht.package_id || yacht.yachtId || yacht.id || '', 
                                      'yacht', 
                                      yacht.title || yacht.name || ''
                                    )}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                            {yacht.description}
                          </p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Price</p>
                              <p className="font-medium">${yacht.pricing}/day</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Capacity</p>
                              <p className="font-medium">{yacht.capacity} people</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Duration</p>
                              <p className="font-medium">{yacht.duration} hours</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Location</p>
                              <p className="font-medium">{yacht.location.port_marina}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {/* Yacht Pagination */}
                  {/* Always show pagination controls when there are results */}
                  {filteredYachts.length > 0 && (
                    <div className="flex items-center justify-center mt-6 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousYachtPage}
                        disabled={yachtPage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <span className="text-sm text-muted-foreground">
                        Page {yachtPage} of {yachtsPagination?.totalPages || 1}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextYachtPage}
                        disabled={!yachtsPagination || yachtPage === yachtsPagination.totalPages}
                        className="flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            {/* Services & Add-ons Tab Content */}
            <TabsContent value="services" className="space-y-6">
              {addOnsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-20 bg-muted rounded-lg"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredAddOns?.length === 0 ? (
                <div className="text-center py-12">
                  <FileEdit className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Services or Add-ons Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery || selectedCategory 
                      ? "No services match your search criteria. Try adjusting your filters."
                      : "You haven't added any services or add-ons yet."}
                  </p>
                  <Button onClick={goToAddService}>
                    Add Your First Service
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Add-ons List */}
                  {filteredAddOns?.map((addon: ExtendedProductAddOn) => (
                    <Card key={addon.productId}>
                      <div className="relative">
                        <div className="h-40 overflow-hidden">
                          <img 
                            {...getAddonImageProps(addon)}
                            className="w-full h-full object-cover"
                            // Generate a more intelligent key based on available timestamps
                            key={`addon-img-${addon.productId}-${addon._lastUpdated || addon.lastUpdatedDate?.seconds || addon.createdDate?.seconds || Date.now()}`}
                          />
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1">
                          {renderStatusBadge(addon.availability)}
                        </div>
                      </div>
                      
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{addon.name}</h3>
                            <Badge variant="outline" className="mt-1">
                              {addon.category}
                            </Badge>
                          </div>
                          <div className="font-bold">${addon.pricing}</div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {addon.description}
                        </p>
                      </CardContent>
                      
                      <CardFooter className="border-t p-4">
                        <div className="flex justify-between w-full">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs"
                            onClick={() => goToEditService(addon.productId)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive text-xs"
                            onClick={() => openDeleteConfirm(addon.productId, 'addon', addon.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                  
                  {/* Add-ons Pagination - Always show when there are results */}
                  {filteredAddOns.length > 0 && (
                    <div className="flex items-center justify-center col-span-1 md:col-span-2 lg:col-span-3 mt-6 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousAddonPage}
                        disabled={addonPage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <span className="text-sm text-muted-foreground">
                        Page {addonPage} of {addonsPagination?.totalPages || 1}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextAddonPage}
                        disabled={!addonsPagination || addonPage === addonsPagination.totalPages}
                        className="flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </>
  );
}