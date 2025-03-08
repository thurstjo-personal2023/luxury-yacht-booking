import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
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
  AlertCircle,
  ArrowLeft, 
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
import { collection, query, where, getDocs } from "firebase/firestore";
import { YachtExperience, YachtProfile, ProductAddOn } from "@shared/firestore-schema";

// Extended interface to include properties from API response
interface ExtendedYachtExperience extends YachtExperience {
  imageUrl?: string;
  name?: string;
}

export default function AssetManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("yachts");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Queries
  const { data: yachts, isLoading: yachtsLoading } = useQuery<ExtendedYachtExperience[]>({
    queryKey: ["/api/yachts/producer"],
  });
  
  const { data: addOns, isLoading: addOnsLoading } = useQuery<ProductAddOn[]>({
    queryKey: ["/api/addons/producer"],
  });
  
  // Filtered yachts based on search and category
  const filteredYachts = yachts?.filter(yacht => {
    const matchesSearch = !searchQuery || 
      yacht.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      yacht.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = !selectedCategory || yacht.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Filtered add-ons based on search and category
  const filteredAddOns = addOns?.filter(addon => {
    const matchesSearch = !searchQuery || 
      addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addon.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = !selectedCategory || addon.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Get unique categories
  const yachtCategories = yachts ? Array.from(new Set(yachts.map(yacht => yacht.category))).sort() : [];
  const addonCategories = addOns ? Array.from(new Set(addOns.map(addon => addon.category))).sort() : [];
  
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
  const goToEditYacht = (id: string) => setLocation(`/dashboard/producer/assets/edit-yacht/${id}`);
  const goToEditService = (id: string) => setLocation(`/dashboard/producer/assets/edit-service/${id}`);
  const goToYachtDetails = (id: string) => setLocation(`/yachts/${id}`);
  
  const handleDelete = (id: string, type: 'yacht' | 'addon') => {
    toast({
      title: "Not implemented",
      description: "Delete functionality will be implemented in a future update.",
      variant: "destructive",
    });
  };
  
  // Create status badge
  const renderStatusBadge = (status: boolean) => {
    return status ? (
      <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">
        Active
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-200">
        Inactive
      </Badge>
    );
  };
  
  return (
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
                {filteredYachts?.map(yacht => (
                  <Card key={yacht.package_id} className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      {/* Image */}
                      <div className="w-full md:w-64 h-48 md:h-auto">
                        <img 
                          src={yacht.media?.[0]?.url || yacht.imageUrl || '/yacht-placeholder.jpg'} 
                          alt={yacht.title || yacht.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = '/yacht-placeholder.jpg';
                          }}
                        />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 p-6">
                        <div className="flex flex-col md:flex-row justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold mb-1">{yacht.title}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">{yacht.category}</Badge>
                              {renderStatusBadge(yacht.availability_status)}
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
                              onClick={() => goToYachtDetails(yacht.package_id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1"
                              onClick={() => goToEditYacht(yacht.package_id)}
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
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(yacht.package_id, 'yacht')}
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
                {filteredAddOns?.map(addon => (
                  <Card key={addon.productId}>
                    <div className="relative">
                      <div className="h-40 overflow-hidden">
                        <img 
                          src={
                            (addon.media?.[0]?.url) || 
                            (typeof addon.media === 'object' && addon.media?.['0']?.url) || 
                            '/service-placeholder.jpg'
                          } 
                          alt={addon.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = '/service-placeholder.jpg';
                          }}
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
                          onClick={() => handleDelete(addon.productId, 'addon')}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}