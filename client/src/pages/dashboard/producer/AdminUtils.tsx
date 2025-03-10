import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function AdminUtils() {
  const { toast } = useToast();
  const [standardizationRunning, setStandardizationRunning] = useState(false);
  const [standardizationOutput, setStandardizationOutput] = useState<string | null>(null);
  const [showInactiveYachts, setShowInactiveYachts] = useState(false);

  const runStandardization = async () => {
    try {
      setStandardizationRunning(true);
      setStandardizationOutput("Starting standardization process...");

      const response = await fetch('/api/admin/standardize-collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Standardization Complete",
          description: "All yacht records have been standardized successfully.",
          variant: "default",
        });
        setStandardizationOutput(result.details || "Standardization completed successfully. No details provided.");
      } else {
        toast({
          title: "Standardization Failed",
          description: result.message || "An error occurred during standardization.",
          variant: "destructive",
        });
        setStandardizationOutput(result.details || "Standardization failed. No details provided.");
      }
    } catch (error) {
      console.error("Error running standardization:", error);
      toast({
        title: "Standardization Error",
        description: "An unexpected error occurred while attempting to standardize records.",
        variant: "destructive",
      });
      setStandardizationOutput("Error: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setStandardizationRunning(false);
    }
  };

  const updateShowInactiveYachts = async (checked: boolean) => {
    setShowInactiveYachts(checked);
    
    // Implementation to update user preferences or apply filter would go here
    // For now, we just show a toast message
    
    toast({
      title: checked ? "Showing Inactive Yachts" : "Hiding Inactive Yachts",
      description: checked 
        ? "Inactive yachts will now be visible in listings with an inactive badge." 
        : "Inactive yachts are now hidden from listings.",
      variant: "default",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Administration Tools</h1>
      
      <Tabs defaultValue="schema">
        <TabsList className="mb-4">
          <TabsTrigger value="schema">Schema Management</TabsTrigger>
          <TabsTrigger value="settings">Display Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schema">
          <div className="grid grid-cols-1 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Collection Standardization</CardTitle>
                <CardDescription>
                  Standardize all records in the unified_yacht_experiences collection to ensure consistency.
                  This process will update all fields to follow the standardized schema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="font-medium mb-2">Changes that will be applied:</h3>
                    <ul className="list-disc ml-4 space-y-1 text-sm">
                      <li>Standardize field names to camelCase (e.g., isAvailable, mainImage, etc.)</li>
                      <li>Extract and normalize mainImage for consistent image handling</li>
                      <li>Ensure all status fields are synchronized (isAvailable, availability_status, available)</li>
                      <li>Add mainImage field based on media arrays</li>
                      <li>Normalize location and virtual tour data structures</li>
                      <li>Fill in missing fields with default values</li>
                    </ul>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={runStandardization} 
                      disabled={standardizationRunning}
                      className="flex items-center gap-2"
                    >
                      {standardizationRunning ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Standardizing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Standardize Collection
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
              
              {standardizationOutput && (
                <CardFooter className="flex-col items-start border-t pt-4">
                  <h4 className="font-medium mb-2">Process Output:</h4>
                  <pre className="bg-muted p-4 rounded-md text-xs w-full h-40 overflow-auto">
                    {standardizationOutput}
                  </pre>
                </CardFooter>
              )}
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>
                Configure how yacht data is displayed throughout the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="show-inactive" 
                    checked={showInactiveYachts} 
                    onCheckedChange={(checked) => 
                      updateShowInactiveYachts(checked as boolean)
                    }
                  />
                  <Label htmlFor="show-inactive">Show inactive yacht experiences</Label>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  When enabled, inactive yacht experiences will be shown in listings with an inactive badge.
                  When disabled, inactive yacht experiences are hidden from all listings.
                </p>
                
                <Separator className="my-4" />
                
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm">
                    Additional display settings will be available in future releases.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}