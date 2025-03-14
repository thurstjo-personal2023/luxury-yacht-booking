import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Database, Wrench, Link } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProducerSidebar } from "@/components/layout/ProducerSidebar";
import { setProducerIdForAllYachts } from "@/lib/producer-utils";

export default function AdminUtils() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("data-tools");
  const [isStandardizing, setIsStandardizing] = useState(false);
  const [isAddonStandardizing, setIsAddonStandardizing] = useState(false);
  const [isSettingProducerId, setIsSettingProducerId] = useState(false);
  const [lastStandardization, setLastStandardization] = useState<string | null>(null);
  const [lastAddonStandardization, setLastAddonStandardization] = useState<string | null>(null);
  const [lastProducerIdUpdate, setLastProducerIdUpdate] = useState<string | null>(null);
  const [standardizationResult, setStandardizationResult] = useState<{
    success: boolean;
    message: string;
    details?: {
      processedCount: number;
      updatedCount: number;
      errors: string[];
    };
  } | null>(null);
  const [addonStandardizationResult, setAddonStandardizationResult] = useState<{
    success: boolean;
    message: string;
    details?: {
      processedCount: number;
      updatedCount: number;
      errors: string[];
    };
  } | null>(null);
  const [producerIdResult, setProducerIdResult] = useState<{
    success: boolean;
    message: string;
    producerId?: string;
  } | null>(null);

  const runStandardization = async () => {
    setIsStandardizing(true);
    setStandardizationResult(null);
    
    try {
      const response = await apiRequest(
        'POST',
        '/api/admin/standardize-collection',
        {
          collection: 'unified_yacht_experiences'
        }
      );
      
      const result = await response.json();
      
      setStandardizationResult({
        success: result.success,
        message: result.message,
        details: result.details
      });
      
      if (result.success) {
        toast({
          title: "Yacht Standardization Complete",
          description: `Successfully processed ${result.details.processedCount} documents and updated ${result.details.updatedCount} documents.`,
          variant: "default",
        });
        setLastStandardization(new Date().toLocaleString());
      } else {
        toast({
          title: "Yacht Standardization Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error standardizing yacht collection:", error);
      setStandardizationResult({
        success: false,
        message: "An unexpected error occurred while standardizing the yacht collection.",
      });
      toast({
        title: "Yacht Standardization Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStandardizing(false);
    }
  };
  
  const runAddonStandardization = async () => {
    setIsAddonStandardizing(true);
    setAddonStandardizationResult(null);
    
    try {
      const response = await apiRequest(
        'POST',
        '/api/admin/standardize-collection',
        {
          collection: 'products_add_ons'
        }
      );
      
      const result = await response.json();
      
      setAddonStandardizationResult({
        success: result.success,
        message: result.message,
        details: result.details
      });
      
      if (result.success) {
        toast({
          title: "Add-on Standardization Complete",
          description: `Successfully processed ${result.details.processedCount} documents and updated ${result.details.updatedCount} documents.`,
          variant: "default",
        });
        setLastAddonStandardization(new Date().toLocaleString());
      } else {
        toast({
          title: "Add-on Standardization Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error standardizing add-on collection:", error);
      setAddonStandardizationResult({
        success: false,
        message: "An unexpected error occurred while standardizing the add-on collection.",
      });
      toast({
        title: "Add-on Standardization Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddonStandardizing(false);
    }
  };
  
  // Function to associate producer ID with all yachts
  const runSetProducerId = async () => {
    setIsSettingProducerId(true);
    setProducerIdResult(null);
    
    try {
      // Use the default producer ID (V4aiP9ihPbdnWNO6UbiZKEt1GoCZ)
      const result = await setProducerIdForAllYachts();
      
      setProducerIdResult(result);
      
      if (result.success) {
        toast({
          title: "Producer ID Assignment Complete",
          description: `Successfully associated producer ID with all yachts: ${result.producerId}`,
          variant: "default",
        });
        setLastProducerIdUpdate(new Date().toLocaleString());
      } else {
        toast({
          title: "Producer ID Assignment Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error setting producer ID:", error);
      setProducerIdResult({
        success: false,
        message: "An unexpected error occurred while setting producer ID."
      });
      toast({
        title: "Producer ID Assignment Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSettingProducerId(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden md:block w-64 border-r bg-background">
          <ProducerSidebar />
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex flex-col space-y-6 max-w-5xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Admin Utilities</h1>
                  <p className="text-muted-foreground">
                    Advanced tools for system maintenance and data management
                  </p>
                </div>
                <Badge variant="outline" className="px-3 py-1 text-xs">Admin Access</Badge>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid grid-cols-2 gap-2">
                  <TabsTrigger value="data-tools">
                    <Database className="h-4 w-4 mr-2" /> Data Tools
                  </TabsTrigger>
                  <TabsTrigger value="system-maintenance">
                    <Wrench className="h-4 w-4 mr-2" /> System Maintenance
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="data-tools" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Yacht Collection Standardization</CardTitle>
                      <CardDescription>
                        Standardize all documents in the unified yacht experiences collection to ensure
                        consistent field naming and data structure.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Important</AlertTitle>
                        <AlertDescription>
                          This operation will standardize field names and data structure across all yacht experience documents.
                          It will normalize availability statuses, standardize location data, and ensure proper virtual tour structures.
                          This operation is safe and does not delete data, but make sure to back up your database before proceeding.
                        </AlertDescription>
                      </Alert>
                      
                      {standardizationResult && (
                        <Alert variant={standardizationResult.success ? "default" : "destructive"}>
                          {standardizationResult.success ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          <AlertTitle>
                            {standardizationResult.success ? "Standardization Complete" : "Standardization Failed"}
                          </AlertTitle>
                          <AlertDescription>
                            {standardizationResult.message}
                            {standardizationResult.details && (
                              <div className="mt-2">
                                <p>Processed: {standardizationResult.details.processedCount} documents</p>
                                <p>Updated: {standardizationResult.details.updatedCount} documents</p>
                                {standardizationResult.details.errors.length > 0 && (
                                  <div className="mt-2">
                                    <p className="font-semibold">Errors:</p>
                                    <ul className="list-disc list-inside text-sm">
                                      {standardizationResult.details.errors.slice(0, 5).map((error, index) => (
                                        <li key={index}>{error}</li>
                                      ))}
                                      {standardizationResult.details.errors.length > 5 && (
                                        <li>...and {standardizationResult.details.errors.length - 5} more errors</li>
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between border-t px-6 py-4">
                      <div className="text-sm text-muted-foreground">
                        {lastStandardization ? `Last run: ${lastStandardization}` : "Never run"}
                      </div>
                      <Button onClick={runStandardization} disabled={isStandardizing}>
                        {isStandardizing ? "Standardizing..." : "Run Standardization"}
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Add-on Collection Standardization</CardTitle>
                      <CardDescription>
                        Standardize all documents in the products add-ons collection to ensure
                        consistent field naming and data structure across all product add-ons.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Important</AlertTitle>
                        <AlertDescription>
                          This operation will standardize field names and data structure across all product add-on documents.
                          It will normalize availability status fields, ensure consistent naming conventions, and add standardization tracking.
                          This standardization ensures compatibility with the unified schema and image utilities.
                        </AlertDescription>
                      </Alert>
                      
                      {addonStandardizationResult && (
                        <Alert variant={addonStandardizationResult.success ? "default" : "destructive"}>
                          {addonStandardizationResult.success ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          <AlertTitle>
                            {addonStandardizationResult.success ? "Add-on Standardization Complete" : "Add-on Standardization Failed"}
                          </AlertTitle>
                          <AlertDescription>
                            {addonStandardizationResult.message}
                            {addonStandardizationResult.details && (
                              <div className="mt-2">
                                <p>Processed: {addonStandardizationResult.details.processedCount} documents</p>
                                <p>Updated: {addonStandardizationResult.details.updatedCount} documents</p>
                                {addonStandardizationResult.details.errors.length > 0 && (
                                  <div className="mt-2">
                                    <p className="font-semibold">Errors:</p>
                                    <ul className="list-disc list-inside text-sm">
                                      {addonStandardizationResult.details.errors.slice(0, 5).map((error, index) => (
                                        <li key={index}>{error}</li>
                                      ))}
                                      {addonStandardizationResult.details.errors.length > 5 && (
                                        <li>...and {addonStandardizationResult.details.errors.length - 5} more errors</li>
                                      )}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between border-t px-6 py-4">
                      <div className="text-sm text-muted-foreground">
                        {lastAddonStandardization ? `Last run: ${lastAddonStandardization}` : "Never run"}
                      </div>
                      <Button onClick={runAddonStandardization} disabled={isAddonStandardizing}>
                        {isAddonStandardizing ? "Standardizing..." : "Run Add-on Standardization"}
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                <TabsContent value="system-maintenance" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Producer ID Association</CardTitle>
                      <CardDescription>
                        Associate all yacht experiences with a producer ID to ensure proper functionality
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert>
                        <Link className="h-4 w-4" />
                        <AlertTitle>Important</AlertTitle>
                        <AlertDescription>
                          This operation will associate all yacht experiences with the default producer ID (V4aiP9ihPbdnWNO6UbiZKEt1GoCZ).
                          This ensures that all yachts appear in the producer dashboard and can be properly managed.
                          This operation is safe and does not delete any data.
                        </AlertDescription>
                      </Alert>
                      
                      {producerIdResult && (
                        <Alert variant={producerIdResult.success ? "default" : "destructive"}>
                          {producerIdResult.success ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          <AlertTitle>
                            {producerIdResult.success ? "Producer ID Association Complete" : "Producer ID Association Failed"}
                          </AlertTitle>
                          <AlertDescription>
                            {producerIdResult.message}
                            {producerIdResult.producerId && (
                              <div className="mt-2">
                                <p>Producer ID: <code className="bg-muted p-1 rounded">{producerIdResult.producerId}</code></p>
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between border-t px-6 py-4">
                      <div className="text-sm text-muted-foreground">
                        {lastProducerIdUpdate ? `Last run: ${lastProducerIdUpdate}` : "Never run"}
                      </div>
                      <Button onClick={runSetProducerId} disabled={isSettingProducerId}>
                        {isSettingProducerId ? "Associating..." : "Associate Producer ID"}
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Other System Maintenance Tools</CardTitle>
                      <CardDescription>
                        Additional tools for system maintenance and monitoring
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="py-10 text-center">
                      <p className="text-muted-foreground">
                        Additional system maintenance tools will be available in a future update.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}