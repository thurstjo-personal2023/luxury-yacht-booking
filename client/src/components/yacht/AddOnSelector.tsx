import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertCircle, PackageOpen, ChefHat, Anchor, Utensils } from "lucide-react";
import { Loader2 } from "lucide-react";
import { AddOnReference } from "@shared/unified-schema";
import AddOnCard, { AddOnCardProps } from "./AddOnCard";

// Interface for add-on data from the API
export interface ProductAddOn {
  productId: string;
  name: string;
  description: string;
  category: string;
  pricing: number;
  media: { type: string; url: string }[];
  availability: boolean;
  tags: string[];
  partnerId: string;
  createdDate: any;
  lastUpdatedDate: any;
  mainImage?: string;
}

// Interface for the available add-ons response
interface AvailableAddOnsResponse {
  producerAddOns: ProductAddOn[];
  partnerAddOns: ProductAddOn[];
}

// Props for the AddOnSelector component
interface AddOnSelectorProps {
  includedAddOns: AddOnReference[];
  optionalAddOns: AddOnReference[];
  onIncludedAddOnsChange: (addOns: AddOnReference[]) => void;
  onOptionalAddOnsChange: (addOns: AddOnReference[]) => void;
  producerId: string;
  disabled?: boolean;
}

// Component to select and configure add-ons for a yacht experience
export default function AddOnSelector({
  includedAddOns,
  optionalAddOns,
  onIncludedAddOnsChange,
  onOptionalAddOnsChange,
  producerId,
  disabled = false
}: AddOnSelectorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [commissionRates, setCommissionRates] = useState<Record<string, number>>({});

  // Fetch available add-ons from the API
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/producer/available-addons'],
    retry: 1,
    staleTime: 30000,
  });

  // Initialize commission rates when add-ons change
  useEffect(() => {
    const rates: Record<string, number> = {};
    
    // Set default rates for included add-ons (15%)
    includedAddOns.forEach(addon => {
      rates[addon.addOnId] = addon.commissionRate || 15;
    });
    
    // Set default rates for optional add-ons (10%)
    optionalAddOns.forEach(addon => {
      rates[addon.addOnId] = addon.commissionRate || 10;
    });
    
    setCommissionRates(rates);
  }, [includedAddOns, optionalAddOns]);

  // Handle error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading add-ons</AlertTitle>
        <AlertDescription>
          We couldn't load the available add-ons. Please try again or contact support.
        </AlertDescription>
      </Alert>
    );
  }

  // Organize add-ons by category
  const addOnsByCategory: Record<string, ProductAddOn[]> = {};
  const availableAddOns: AvailableAddOnsResponse = data as AvailableAddOnsResponse || { producerAddOns: [], partnerAddOns: [] };
  
  // Combine producer and partner add-ons
  const allAddOns = [
    ...availableAddOns.producerAddOns.map(addOn => ({ ...addOn, isProducerOwned: true })),
    ...availableAddOns.partnerAddOns.map(addOn => ({ ...addOn, isProducerOwned: false }))
  ];
  
  // Group add-ons by category
  allAddOns.forEach(addOn => {
    const category = addOn.category || "Other";
    if (!addOnsByCategory[category]) {
      addOnsByCategory[category] = [];
    }
    addOnsByCategory[category].push(addOn);
  });
  
  // Get unique categories for tabs
  const categories = Object.keys(addOnsByCategory).sort();

  // Filter add-ons based on search query
  const filterAddOns = (addOns: ProductAddOn[]) => {
    if (!searchQuery) return addOns;
    
    return addOns.filter(addOn => 
      addOn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addOn.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addOn.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  // Check if an add-on is included
  const isAddOnIncluded = (addOnId: string) => {
    return includedAddOns.some(addon => addon.addOnId === addOnId);
  };

  // Check if an add-on is optional
  const isAddOnOptional = (addOnId: string) => {
    return optionalAddOns.some(addon => addon.addOnId === addOnId);
  };

  // Add an add-on to included list
  const addToIncluded = (addOn: ProductAddOn) => {
    // Remove from optional if it exists there
    if (isAddOnOptional(addOn.productId)) {
      onOptionalAddOnsChange(optionalAddOns.filter(a => a.addOnId !== addOn.productId));
    }
    
    // Add to included if it's not already there
    if (!isAddOnIncluded(addOn.productId)) {
      const addOnRef: AddOnReference = {
        addOnId: addOn.productId,
        partnerId: addOn.partnerId !== producerId ? addOn.partnerId : undefined,
        name: addOn.name,
        description: addOn.description,
        pricing: addOn.pricing,
        isRequired: true,
        commissionRate: commissionRates[addOn.productId] || 15, // Default to 15% for included
        category: addOn.category,
        mediaUrl: addOn.mainImage || (addOn.media && addOn.media.length > 0 ? addOn.media[0].url : undefined)
      };
      
      onIncludedAddOnsChange([...includedAddOns, addOnRef]);
      
      toast({
        title: "Add-on Included",
        description: `${addOn.name} added as a required add-on`,
      });
    }
  };

  // Add an add-on to optional list
  const addToOptional = (addOn: ProductAddOn) => {
    // Remove from included if it exists there
    if (isAddOnIncluded(addOn.productId)) {
      onIncludedAddOnsChange(includedAddOns.filter(a => a.addOnId !== addOn.productId));
    }
    
    // Add to optional if it's not already there
    if (!isAddOnOptional(addOn.productId)) {
      const addOnRef: AddOnReference = {
        addOnId: addOn.productId,
        partnerId: addOn.partnerId !== producerId ? addOn.partnerId : undefined,
        name: addOn.name,
        description: addOn.description,
        pricing: addOn.pricing,
        isRequired: false,
        commissionRate: commissionRates[addOn.productId] || 10, // Default to 10% for optional
        category: addOn.category,
        mediaUrl: addOn.mainImage || (addOn.media && addOn.media.length > 0 ? addOn.media[0].url : undefined)
      };
      
      onOptionalAddOnsChange([...optionalAddOns, addOnRef]);
      
      toast({
        title: "Add-on Added",
        description: `${addOn.name} added as an optional add-on`,
      });
    }
  };

  // Remove an add-on from both lists
  const removeAddOn = (addOnId: string) => {
    if (isAddOnIncluded(addOnId)) {
      onIncludedAddOnsChange(includedAddOns.filter(a => a.addOnId !== addOnId));
    }
    
    if (isAddOnOptional(addOnId)) {
      onOptionalAddOnsChange(optionalAddOns.filter(a => a.addOnId !== addOnId));
    }
    
    toast({
      title: "Add-on Removed",
      description: "Add-on removed from your yacht experience",
    });
  };

  // Update commission rate for an add-on
  const updateCommissionRate = (addOnId: string, rate: number) => {
    // Update the state
    setCommissionRates({
      ...commissionRates,
      [addOnId]: rate
    });
    
    // Update the included add-ons list if the add-on is there
    if (isAddOnIncluded(addOnId)) {
      const updatedAddOns = includedAddOns.map(addon => 
        addon.addOnId === addOnId ? { ...addon, commissionRate: rate } : addon
      );
      onIncludedAddOnsChange(updatedAddOns);
    }
    
    // Update the optional add-ons list if the add-on is there
    if (isAddOnOptional(addOnId)) {
      const updatedAddOns = optionalAddOns.map(addon => 
        addon.addOnId === addOnId ? { ...addon, commissionRate: rate } : addon
      );
      onOptionalAddOnsChange(updatedAddOns);
    }
  };

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'water sports':
        return <Anchor className="h-4 w-4" />;
      case 'dining':
        return <ChefHat className="h-4 w-4" />;
      case 'food':
      case 'catering':
        return <Utensils className="h-4 w-4" />;
      default:
        return <PackageOpen className="h-4 w-4" />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading available add-ons...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Search add-ons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* No add-ons found message */}
      {allAddOns.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No add-ons available</AlertTitle>
          <AlertDescription>
            No add-ons are available for bundling. Create your own add-ons or contact partners to offer their services.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Partner add-ons explanation */}
      {availableAddOns.partnerAddOns && availableAddOns.partnerAddOns.length > 0 && (
        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle>Partner Add-ons Available</AlertTitle>
          <AlertDescription>
            <p className="mb-1">You can bundle partner-created add-ons with your yacht experiences. The commission slider lets you control how much of the add-on price goes to the partner.</p>
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
              <li key="commission-1">Required add-ons default to 15% commission</li>
              <li key="commission-2">Optional add-ons default to 10% commission</li>
              <li key="commission-3">Commission rates can be adjusted between 5-30%</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Selected add-ons summary */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Selected Add-ons</h3>
        <div className="flex flex-wrap gap-2">
          {includedAddOns.map(addon => (
            <Badge key={addon.addOnId} variant="secondary" className="bg-green-100">
              {addon.name} (Required)
            </Badge>
          ))}
          {optionalAddOns.map(addon => (
            <Badge key={addon.addOnId} variant="outline">
              {addon.name} (Optional)
            </Badge>
          ))}
          {includedAddOns.length === 0 && optionalAddOns.length === 0 && (
            <span className="text-sm text-muted-foreground">No add-ons selected yet</span>
          )}
        </div>
      </div>

      {/* Category tabs and add-on cards */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Add-ons</TabsTrigger>
          {categories.map(category => (
            <TabsTrigger key={category} value={category}>
              <span className="flex items-center">
                {getCategoryIcon(category)}
                <span className="ml-1">{category}</span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All add-ons tab */}
        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filterAddOns(allAddOns).map(addOn => (
              <AddOnCard
                key={addOn.productId}
                addOn={addOn}
                isIncluded={isAddOnIncluded(addOn.productId)}
                isOptional={isAddOnOptional(addOn.productId)}
                onInclude={() => addToIncluded(addOn)}
                onMakeOptional={() => addToOptional(addOn)}
                onRemove={() => removeAddOn(addOn.productId)}
                commissionRate={commissionRates[addOn.productId] || (isAddOnIncluded(addOn.productId) ? 15 : 10)}
                onCommissionChange={(rate) => updateCommissionRate(addOn.productId, rate)}
                isProducerOwned={addOn.partnerId === producerId}
                producerId={producerId}
                disabled={disabled}
              />
            ))}
          </div>
          
          {filterAddOns(allAddOns).length === 0 && (
            <div className="text-center p-6 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">No add-ons found matching your search criteria</p>
            </div>
          )}
        </TabsContent>

        {/* Category-specific tabs */}
        {categories.map(category => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filterAddOns(addOnsByCategory[category] || []).map(addOn => (
                <AddOnCard
                  key={addOn.productId}
                  addOn={addOn}
                  isIncluded={isAddOnIncluded(addOn.productId)}
                  isOptional={isAddOnOptional(addOn.productId)}
                  onInclude={() => addToIncluded(addOn)}
                  onMakeOptional={() => addToOptional(addOn)}
                  onRemove={() => removeAddOn(addOn.productId)}
                  commissionRate={commissionRates[addOn.productId] || (isAddOnIncluded(addOn.productId) ? 15 : 10)}
                  onCommissionChange={(rate) => updateCommissionRate(addOn.productId, rate)}
                  isProducerOwned={addOn.partnerId === producerId}
                  producerId={producerId}
                  disabled={disabled}
                />
              ))}
            </div>
            
            {filterAddOns(addOnsByCategory[category] || []).length === 0 && (
              <div className="text-center p-6 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">No {category} add-ons found matching your search criteria</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}