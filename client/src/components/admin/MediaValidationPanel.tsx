/**
 * Media Validation Panel Component
 * 
 * This component provides a UI for validating and fixing media issues in the application.
 * It allows administrators to run validation, view reports, and fix problems.
 */
import React, { useState } from 'react';
import { useMediaValidation } from '../../hooks/use-media-validation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, RefreshCw, Check, X, AlertTriangle, ImageIcon, FileVideo, Link2, Share2 } from 'lucide-react';

/**
 * Media validation dashboard panel
 */
export const MediaValidationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('reports');
  
  const {
    validationReports,
    urlFixReports,
    activeTasks,
    schedules,
    collections,
    isLoading,
    isTaskRunning,
    runValidation,
    runCollectionValidation,
    fixBrokenUrls,
    updateSchedule,
    getReportDetails,
    calculateProgress
  } = useMediaValidation();
  
  const handleRunValidation = async () => {
    try {
      await runValidation();
    } catch (error) {
      console.error('Error running validation:', error);
    }
  };
  
  const handleRunCollectionValidation = async (collection: string) => {
    try {
      await runCollectionValidation(collection);
    } catch (error) {
      console.error(`Error validating collection ${collection}:`, error);
    }
  };
  
  const handleFixBrokenUrls = async () => {
    try {
      await fixBrokenUrls();
    } catch (error) {
      console.error('Error fixing broken URLs:', error);
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Media Validation</h2>
          <p className="text-muted-foreground">Validate and fix media URLs across the application</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            onClick={handleFixBrokenUrls}
            disabled={isTaskRunning}
          >
            {isTaskRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
            Fix Relative URLs
          </Button>
          <Button 
            onClick={handleRunValidation}
            disabled={isTaskRunning}
          >
            {isTaskRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Run Validation
          </Button>
        </div>
      </div>
      
      {activeTasks && activeTasks.length > 0 && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Tasks in progress</AlertTitle>
          <AlertDescription>
            {activeTasks.map((task, index) => (
              <div key={index} className="mt-2">
                {task.type === 'validation' ? 'Validating' : 'Fixing'} {task.collection || 'all collections'}
                <Progress value={task.progress || 0} className="h-2 mt-1" />
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs 
        defaultValue="reports" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports">Validation Reports</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports" className="space-y-4 pt-4">
          <h3 className="text-lg font-semibold mb-4">Recent Reports</h3>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : validationReports && validationReports.length > 0 ? (
            <div className="space-y-4">
              {validationReports.map((report, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Report #{report.id.slice(0, 8)}</CardTitle>
                        <CardDescription>
                          {formatTimestamp(report.timestamp)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={report.stats.invalidFieldCount > 0 ? "destructive" : "default"}>
                          {report.stats.invalidFieldCount} Issues
                        </Badge>
                        <Badge variant="outline">
                          {report.stats.documentCount} Documents
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col p-3 bg-muted/50 rounded-md">
                        <span className="text-sm text-muted-foreground">Images</span>
                        <span className="text-2xl font-bold">{report.stats.imageCount}</span>
                      </div>
                      <div className="flex flex-col p-3 bg-muted/50 rounded-md">
                        <span className="text-sm text-muted-foreground">Videos</span>
                        <span className="text-2xl font-bold">{report.stats.videoCount}</span>
                      </div>
                      <div className="flex flex-col p-3 bg-muted/50 rounded-md">
                        <span className="text-sm text-muted-foreground">Relative URLs</span>
                        <span className="text-2xl font-bold">{report.stats.relativeUrlCount}</span>
                      </div>
                    </div>
                    
                    {report.stats.invalidFieldCount > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Issues by Collection</h4>
                        <div className="space-y-2">
                          {Object.entries(report.stats.byCollection || {}).map(([collection, stats]) => (
                            stats.invalidCount > 0 ? (
                              <div key={collection} className="flex justify-between text-sm">
                                <span>{collection}</span>
                                <Badge variant="outline" className="ml-auto">
                                  {stats.invalidCount} issues
                                </Badge>
                              </div>
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <Button variant="ghost" size="sm" onClick={() => getReportDetails(report.id)}>
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={isTaskRunning || report.stats.invalidFieldCount === 0}
                      onClick={handleFixBrokenUrls}
                    >
                      Fix Issues
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No validation reports found. Run a validation to get started.
            </div>
          )}
          
          <Separator className="my-6" />
          
          <h3 className="text-lg font-semibold mb-4">URL Fix Reports</h3>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : urlFixReports && urlFixReports.length > 0 ? (
            <div className="space-y-4">
              {urlFixReports.map((report, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <div>
                        <CardTitle>Fix Report #{report.id.slice(0, 8)}</CardTitle>
                        <CardDescription>
                          {formatTimestamp(report.timestamp)}
                        </CardDescription>
                      </div>
                      <Badge variant="success">
                        {report.stats.fixedFieldCount} Fixed
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Documents Processed</span>
                        <span className="font-medium">{report.stats.documentCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Documents Updated</span>
                        <span className="font-medium">{report.stats.fixedDocumentCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Fields Fixed</span>
                        <span className="font-medium">{report.stats.fixedFieldCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No URL fix reports found.
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="collections" className="space-y-4 pt-4">
          <h3 className="text-lg font-semibold mb-4">Collections</h3>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : collections && Object.keys(collections).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(collections).map(([collectionName, stats]) => (
                <Card key={collectionName}>
                  <CardHeader>
                    <div className="flex justify-between">
                      <CardTitle>{collectionName}</CardTitle>
                      <Badge variant="outline">
                        {stats.documentCount} Documents
                      </Badge>
                    </div>
                    <CardDescription>
                      {stats.mediaCount} media fields found
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Last Validated</span>
                        <span className="font-medium">
                          {stats.lastValidated ? formatTimestamp(stats.lastValidated) : 'Never'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Issues</span>
                        <span className="font-medium">
                          {stats.issueCount || 0}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Health</span>
                        <span className={`font-medium ${stats.issueCount ? 'text-amber-500' : 'text-green-500'}`}>
                          {stats.issueCount ? 'Needs Attention' : 'Good'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => handleRunCollectionValidation(collectionName)}
                      disabled={isTaskRunning}
                    >
                      {isTaskRunning ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Validate Collection
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No collections found or metadata not available.
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="schedules" className="space-y-4 pt-4">
          <h3 className="text-lg font-semibold mb-4">Scheduled Validations</h3>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : schedules && schedules.length > 0 ? (
            <div className="space-y-4">
              {schedules.map((schedule, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between">
                      <CardTitle>{schedule.name}</CardTitle>
                      <div className="flex items-center">
                        <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                          {schedule.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription>
                      Runs every {schedule.intervalHours} hours
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Last Run</span>
                          <span className="font-medium">
                            {schedule.lastRunTime ? formatTimestamp(schedule.lastRunTime) : 'Never'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <div className="flex items-center">
                            {schedule.lastStatus === 'success' && (
                              <Check className="h-4 w-4 text-green-500 mr-1" />
                            )}
                            {schedule.lastStatus === 'error' && (
                              <X className="h-4 w-4 text-red-500 mr-1" />
                            )}
                            {schedule.lastStatus === 'running' && (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            )}
                            <span className="font-medium capitalize">
                              {schedule.lastStatus || 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Collections</h4>
                        <div className="flex flex-wrap gap-2">
                          {schedule.collections && schedule.collections.length > 0 ? (
                            schedule.collections.map((collection, i) => (
                              <Badge key={i} variant="outline">
                                {collection}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">All collections</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {schedule.fixRelativeUrls && (
                          <Badge variant="secondary">
                            <Share2 className="h-3 w-3 mr-1" /> Fix Relative URLs
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => updateSchedule(schedule.id, {
                        enabled: !schedule.enabled
                      })}
                    >
                      {schedule.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button 
                      variant={schedule.enabled ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => updateSchedule(schedule.id, {
                        intervalHours: schedule.intervalHours === 24 ? 12 : 24
                      })}
                    >
                      {schedule.intervalHours === 24 ? 'Run Twice Daily' : 'Run Daily'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Schedules Found</CardTitle>
                <CardDescription>
                  Set up automated validation schedules to ensure media integrity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Scheduled validations can run automatically at specified intervals to check for media issues.
                </p>
              </CardContent>
              <CardFooter>
                <Button>Create Schedule</Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};