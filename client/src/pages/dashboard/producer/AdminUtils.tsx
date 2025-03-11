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
import { AlertCircle, CheckCircle, Database, Wrench } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProducerSidebar } from "@/components/layout/ProducerSidebar";

export default function AdminUtils() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("data-tools");
  const [isStandardizing, setIsStandardizing] = useState(false);
  const [isAddonStandardizing, setIsAddonStandardizing] = useState(false);
  const [lastStandardization, setLastStandardization] = useState<string | null>(null);
  const [lastAddonStandardization, setLastAddonStandardization] = useState<string | null>(null);
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
          title: "Standardization Complete",
          description: `Successfully processed ${result.details.processedCount} documents and updated ${result.details.updatedCount} documents.`,
          variant: "default",
        });
        setLastStandardization(new Date().toLocaleString());
      } else {
        toast({
          title: "Standardization Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error standardizing collection:", error);
      setStandardizationResult({
        success: false,
        message: "An unexpected error occurred while standardizing the collection.",
      });
      toast({
        title: "Standardization Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStandardizing(false);
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
                </TabsContent>
                
                <TabsContent value="system-maintenance" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>System Maintenance Tools</CardTitle>
                      <CardDescription>
                        Tools for system maintenance and monitoring
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="py-10 text-center">
                      <p className="text-muted-foreground">
                        System maintenance tools will be available in a future update.
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