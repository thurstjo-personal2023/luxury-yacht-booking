/**
 * Media Validation Panel Component
 * 
 * This component provides an administration interface for media validation
 * in the Etoile Yachts platform. It includes functionality to:
 * - View validation reports
 * - Trigger validation tasks
 * - Fix invalid URLs
 * - Monitor validation progress
 */

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, AlertTriangle, Search, RefreshCw, Loader2 } from "lucide-react";
import { useMediaValidation } from "@/hooks/use-media-validation";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

/**
 * Format a date for display
 * 
 * @param dateString ISO date string
 * @returns Formatted date string
 */
const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString();
};

/**
 * Format a duration in milliseconds to a human-readable string
 * 
 * @param ms Duration in milliseconds
 * @returns Formatted duration string
 */
const formatDuration = (ms: number) => {
  if (!ms) return "N/A";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

/**
 * Media Validation Panel Component
 */
export function MediaValidationPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("reports");
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  
  const { 
    reports, 
    tasks, 
    isLoading, 
    error, 
    triggerValidation, 
    fixDocumentUrls,
    selectedReport,
    setSelectedReport,
    invalidResults,
    isTriggeringValidation,
    isFixingUrls
  } = useMediaValidation();
  
  // Collections available for validation
  const collections = [
    { id: "all", name: "All Collections" },
    { id: "unified_yacht_experiences", name: "Yacht Experiences" },
    { id: "yacht_profiles", name: "Yacht Profiles" },
    { id: "products_add_ons", name: "Products & Add-ons" },
    { id: "promotions_and_offers", name: "Promotions & Offers" },
    { id: "articles_and_guides", name: "Articles & Guides" },
    { id: "event_announcements", name: "Event Announcements" },
    { id: "user_profiles_service_provider", name: "Service Provider Profiles" },
    { id: "user_profiles_tourist", name: "Tourist Profiles" }
  ];
  
  // Check if user is authorized to access this panel
  const isAuthorized = user && (
    user.role === "producer" || 
    user.email?.includes("@etoile-yachts.com") || 
    user.email === "admin@example.com"
  );
  
  // Handle triggering validation
  const handleTriggerValidation = async () => {
    const collectionsToValidate = selectedCollection === "all" ? 
      undefined : 
      [selectedCollection];
      
    await triggerValidation({
      autoFix: true,
      collections: collectionsToValidate
    });
  };
  
  // Handle fixing URLs for a specific document
  const handleFixUrls = async (collection: string, documentId: string) => {
    await fixDocumentUrls(collection, documentId);
  };
  
  if (!isAuthorized) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Media Validation</CardTitle>
          <CardDescription>Administrator access required</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You do not have permission to access the media validation panel.
              Please contact an administrator for assistance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Media Validation Panel</CardTitle>
        <CardDescription>
          Manage and monitor media validation across Etoile Yachts platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Select value={selectedCollection} onValueChange={setSelectedCollection}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select Collection" />
              </SelectTrigger>
              <SelectContent>
                {collections.map(collection => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={handleTriggerValidation} disabled={isTriggeringValidation}>
              {isTriggeringValidation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Trigger Validation
                </>
              )}
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="reports" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="reports">Validation Reports</TabsTrigger>
            <TabsTrigger value="tasks">Validation Tasks</TabsTrigger>
            {selectedReport && <TabsTrigger value="issues">Invalid URLs</TabsTrigger>}
          </TabsList>
          
          {/* Reports Tab */}
          <TabsContent value="reports">
            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading reports...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No validation reports found
              </div>
            ) : (
              <Table>
                <TableCaption>Media validation reports</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Valid URLs</TableHead>
                    <TableHead>Invalid URLs</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-mono text-xs">{report.id}</TableCell>
                      <TableCell>{formatDate(report.createdAt)}</TableCell>
                      <TableCell>{report.totalDocuments}</TableCell>
                      <TableCell>
                        <span className="text-green-600">{report.validUrls}</span>
                        {" "}
                        <span className="text-xs text-muted-foreground">
                          ({Math.round((report.validUrls / (report.validUrls + report.invalidUrls + report.missingUrls)) * 100)}%)
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600">{report.invalidUrls + report.missingUrls}</span>
                        {" "}
                        <span className="text-xs text-muted-foreground">
                          ({Math.round(((report.invalidUrls + report.missingUrls) / (report.validUrls + report.invalidUrls + report.missingUrls)) * 100)}%)
                        </span>
                      </TableCell>
                      <TableCell>{formatDuration(report.duration)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedReport(report.id);
                            setActiveTab("issues");
                          }}
                        >
                          <Search className="h-4 w-4 mr-1" /> 
                          View Issues
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          
          {/* Tasks Tab */}
          <TabsContent value="tasks">
            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading tasks...</span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No validation tasks found
              </div>
            ) : (
              <Table>
                <TableCaption>Media validation tasks</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Queued At</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Completed At</TableHead>
                    <TableHead>Trigger Type</TableHead>
                    <TableHead>Report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.taskId}>
                      <TableCell className="font-mono text-xs">{task.taskId}</TableCell>
                      <TableCell>
                        {task.status === 'completed' ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Check className="h-3 w-3 mr-1" /> Completed
                          </Badge>
                        ) : task.status === 'running' ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" /> Running
                          </Badge>
                        ) : task.status === 'failed' ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Failed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Queued
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(task.queuedAt)}</TableCell>
                      <TableCell>{formatDate(task.startedAt)}</TableCell>
                      <TableCell>{formatDate(task.completedAt)}</TableCell>
                      <TableCell>
                        {task.metadata?.triggerType === 'manual' ? 'Manual' : 'Scheduled'}
                        {task.metadata?.triggeredBy && (
                          <span className="block text-xs text-muted-foreground">
                            by {task.metadata.triggeredBy}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.reportId ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedReport(task.reportId);
                              setActiveTab("issues");
                            }}
                          >
                            <Search className="h-4 w-4 mr-1" /> 
                            View Report
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          
          {/* Invalid URLs Tab */}
          <TabsContent value="issues">
            {!selectedReport ? (
              <div className="text-center p-8 text-muted-foreground">
                Select a report to view issues
              </div>
            ) : isLoading ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading issues...</span>
              </div>
            ) : invalidResults.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No invalid URLs found in this report
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <Badge variant="outline" className="mb-2">
                    Report: {selectedReport}
                  </Badge>
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Found {invalidResults.length} invalid URLs</AlertTitle>
                    <AlertDescription>
                      You can fix these issues by clicking the "Fix URL" button for each document.
                    </AlertDescription>
                  </Alert>
                </div>
                
                <Table>
                  <TableCaption>Invalid URLs in selected report</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collection</TableHead>
                      <TableHead>Document ID</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invalidResults.map((result, index) => (
                      <TableRow key={`${result.collection}-${result.documentId}-${index}`}>
                        <TableCell>{result.collection}</TableCell>
                        <TableCell className="font-mono text-xs">{result.documentId}</TableCell>
                        <TableCell className="font-mono text-xs">{result.field}</TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate font-mono text-xs">
                            {result.url}
                          </div>
                        </TableCell>
                        <TableCell className="text-red-500 text-sm">
                          {result.error}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleFixUrls(result.collection, result.documentId)}
                            disabled={isFixingUrls}
                          >
                            {isFixingUrls ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Check className="h-4 w-4 mr-1" />
                            )}
                            Fix URL
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground flex justify-between">
        <div>Last updated: {new Date().toLocaleString()}</div>
        <div>Media Validation v1.0</div>
      </CardFooter>
    </Card>
  );
}