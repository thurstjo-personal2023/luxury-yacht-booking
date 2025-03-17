import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { AddOnReference } from "@shared/unified-schema";

// Type definitions for the data we'll receive from the API
interface Yacht {
  id: string;
  title: string;
  description: string;
  isAvailable: boolean;
  includedAddOns?: AddOnReference[];
  optionalAddOns?: AddOnReference[];
  [key: string]: any;
}

interface YachtsResponse {
  yachts: Yacht[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

interface AddonData {
  productId: string;
  name: string;
  description: string;
  category: string;
  pricing: number;
  media: { type: string; url: string }[];
  mainImage?: string;
  availability: boolean;
  tags: string[];
  partnerId: string;
  createdDate: any;
  lastUpdatedDate: any;
  [key: string]: any;
}

interface AddonsResponse {
  producerAddOns: AddonData[];
  partnerAddOns: AddonData[];
}

/**
 * Test page for partner add-on bundling
 * 
 * This page allows manual testing of the add-on bundling feature
 * by displaying partner add-ons and producer's yachts.
 */
export default function TestBundlingPage() {
  const { user, signIn, signOut } = useAuth();
  const [testMessage, setTestMessage] = useState<string>("");
  const [testResults, setTestResults] = useState<string[]>([]);
  
  // Fetch producer's yachts
  const { data: yachtsData, isLoading: isLoadingYachts } = useQuery<YachtsResponse>({
    queryKey: ['/api/producer/yachts'],
    enabled: !!user,
  });
  
  // Fetch available add-ons (both producer and partner)
  const { data: addonsData, isLoading: isLoadingAddons } = useQuery<AddonsResponse>({
    queryKey: ['/api/producer/available-addons'],
    enabled: !!user,
  });
  
  // Handle login with test producer credentials
  const handleLoginAsProducer = async () => {
    try {
      await signIn("ally.gee@hotmail.com", "password1234");
      setTestMessage("Successfully logged in as producer");
    } catch (error) {
      setTestMessage(`Login error: ${error}`);
    }
  };
  
  // Test bundling add-ons with a yacht
  const testBundling = async () => {
    if (!yachts?.yachts?.length || !addons) {
      setTestMessage("No yachts or add-ons available for testing");
      return;
    }
    
    try {
      // Get the first yacht
      const yacht = yachts.yachts[0];
      
      // Get some partner add-ons
      const partnerAddons = addons.partnerAddOns || [];
      if (partnerAddons.length === 0) {
        setTestMessage("No partner add-ons available for testing");
        return;
      }
      
      // Create add-on references
      const includedAddOns: AddOnReference[] = partnerAddons.slice(0, 2).map(addon => ({
        addOnId: addon.productId,
        partnerId: addon.partnerId,
        name: addon.name,
        description: addon.description,
        pricing: addon.pricing,
        isRequired: true,
        commissionRate: 15,
        category: addon.category,
        mediaUrl: addon.mainImage || (addon.media && addon.media.length > 0 ? addon.media[0].url : undefined)
      }));
      
      const optionalAddOns: AddOnReference[] = partnerAddons.slice(2, 4).map(addon => ({
        addOnId: addon.productId,
        partnerId: addon.partnerId,
        name: addon.name,
        description: addon.description,
        pricing: addon.pricing,
        isRequired: false,
        commissionRate: 10,
        category: addon.category,
        mediaUrl: addon.mainImage || (addon.media && addon.media.length > 0 ? addon.media[0].url : undefined)
      }));
      
      // Update the yacht with the add-ons
      const response = await fetch(`/api/producer/yacht/update/${yacht.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...yacht,
          includedAddOns,
          optionalAddOns
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setTestMessage(`Successfully bundled ${includedAddOns.length} required and ${optionalAddOns.length} optional add-ons with yacht: ${yacht.title}`);
        setTestResults([
          `Yacht: ${yacht.title} (${yacht.id})`,
          `Required add-ons: ${includedAddOns.map(a => a.name).join(", ")}`,
          `Optional add-ons: ${optionalAddOns.map(a => a.name).join(", ")}`,
        ]);
      } else {
        const error = await response.text();
        setTestMessage(`Error updating yacht: ${error}`);
      }
    } catch (error) {
      setTestMessage(`Test error: ${error}`);
    }
  };
  
  // Effect to log available data when it changes
  useEffect(() => {
    if (yachts && addons) {
      console.log("Available yachts:", yachts);
      console.log("Available add-ons:", addons);
    }
  }, [yachts, addons]);
  
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Add-on Bundling Test Page</h1>
      
      {/* Authentication section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">User</Badge>
                <span>{user.email} ({user.role})</span>
              </div>
              <Button onClick={logout} variant="destructive">Log Out</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">Not logged in</p>
              <Button onClick={handleLoginAsProducer}>Log in as Test Producer</Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Test status section */}
      {testMessage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={testMessage.includes("Error") ? "text-red-500" : "text-green-500"}>
              {testMessage}
            </p>
            {testResults.length > 0 && (
              <div className="mt-4 space-y-2 border-t pt-4">
                <h3 className="font-semibold">Results:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {testResults.map((result, i) => (
                    <li key={i}>{result}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Available data section */}
      {user && (
        <>
          {/* Partner add-ons */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Partner Add-ons</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAddons ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="animate-spin mr-2" />
                  <span>Loading add-ons...</span>
                </div>
              ) : addons && addons.partnerAddOns ? (
                <div className="space-y-4">
                  {addons.partnerAddOns.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {addons.partnerAddOns.map((addon) => (
                        <div key={addon.productId} className="border rounded-md p-3 space-y-2">
                          <div className="flex justify-between">
                            <h3 className="font-semibold">{addon.name}</h3>
                            <Badge variant="secondary">{addon.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{addon.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">${addon.pricing.toFixed(2)}</span>
                            <Badge variant="outline">Partner: {addon.partnerId.substring(0, 6)}...</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No partner add-ons available</p>
                  )}
                  <Button onClick={testBundling} disabled={!yachts || !addons.partnerAddOns || addons.partnerAddOns.length === 0}>
                    Test Bundling with Yacht
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">No add-ons data available</p>
              )}
            </CardContent>
          </Card>
          
          {/* Producer's yachts */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Producer's Yachts</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingYachts ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="animate-spin mr-2" />
                  <span>Loading yachts...</span>
                </div>
              ) : yachts && yachts.yachts ? (
                <div className="space-y-4">
                  {yachts.yachts.length > 0 ? (
                    <div className="space-y-4">
                      {yachts.yachts.slice(0, 3).map((yacht) => (
                        <div key={yacht.id} className="border rounded-md p-3 space-y-2">
                          <div className="flex justify-between">
                            <h3 className="font-semibold">{yacht.title}</h3>
                            <Badge variant="outline" className={yacht.isAvailable ? "bg-green-100" : "bg-red-100"}>
                              {yacht.isAvailable ? "Available" : "Unavailable"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{yacht.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {yacht.includedAddOns && yacht.includedAddOns.length > 0 && (
                              <Badge variant="secondary" className="bg-green-100">
                                {yacht.includedAddOns.length} Required Add-ons
                              </Badge>
                            )}
                            {yacht.optionalAddOns && yacht.optionalAddOns.length > 0 && (
                              <Badge variant="outline">
                                {yacht.optionalAddOns.length} Optional Add-ons
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No yachts available</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No yacht data available</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}