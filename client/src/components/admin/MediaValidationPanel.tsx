import React, { useState, useCallback } from 'react';
import { useMediaValidation } from '@/hooks/use-media-validation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning, RefreshCw, Wrench } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

/**
 * Media Validation Panel Component
 * Displays validation reports and summaries, and provides actions for validation and repair
 */
const MediaValidationPanel: React.FC = () => {
  const { 
    reports, 
    latestReport, 
    isValidating, 
    validationProgress,
    isRepairing,
    repairProgress,
    startValidation, 
    startRepair,
    error 
  } = useMediaValidation();
  
  const [activeTab, setActiveTab] = useState('reports');
  
  // Format date/time
  const formatTimestamp = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };
  
  // Format duration in human readable format
  const formatDuration = (milliseconds: number): string => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  // Calculate visual percentage for progress bar
  const calculateProgressPercent = (progress: { total: number; processed: number }): number => {
    if (progress.total === 0) return 0;
    return Math.min(Math.round((progress.processed / progress.total) * 100), 100);
  };
  
  // Display toast notification for errors
  React.useEffect(() => {
    if (error) {
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive"
      });
    }
  }, [error]);
  
  const renderActionPanel = () => {
    const validationProgressPercent = calculateProgressPercent(validationProgress);
    const repairProgressPercent = calculateProgressPercent(repairProgress);
    
    return (
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-base">Media Validation</CardTitle>
            <CardDescription>
              Checks links and references across all media in the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isValidating ? (
              <div className="space-y-4">
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-in-out" 
                    style={{ width: `${validationProgressPercent}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-500 text-center">
                  Validating: {validationProgress.processed} / {validationProgress.total} media resources
                </div>
              </div>
            ) : (
              <Button 
                className="w-full"
                onClick={startValidation}
                disabled={isRepairing}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Validation
              </Button>
            )}
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-base">Media Repair</CardTitle>
            <CardDescription>
              Attempts to fix identified media issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isRepairing ? (
              <div className="space-y-4">
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500 ease-in-out" 
                    style={{ width: `${repairProgressPercent}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-500 text-center">
                  Repairing: {repairProgress.processed} / {repairProgress.total} media resources
                </div>
              </div>
            ) : (
              <Button 
                className="w-full"
                variant="outline"
                onClick={startRepair}
                disabled={isValidating || !latestReport || (latestReport.stats.invalidUrls === 0)}
              >
                <Wrench className="w-4 h-4 mr-2" />
                Fix Issues
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };
  
  const renderReportsPanel = () => {
    if (reports.length === 0) {
      return (
        <div className="py-8 text-center text-gray-500">
          <FileWarning className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2">No validation reports available</p>
          <p className="text-sm">Run a validation to generate reports</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">
                  Report {report.id.substring(0, 8)}
                </CardTitle>
                <Badge 
                  variant="outline" 
                  className={
                    report.stats.invalidUrls === 0 
                      ? "bg-green-50 text-green-700 border-green-300" 
                      : "bg-amber-50 text-amber-700 border-amber-300"
                  }
                >
                  {report.stats.invalidUrls === 0 ? "All Valid" : `${report.stats.invalidUrls} Issues`}
                </Badge>
              </div>
              <CardDescription>
                {formatTimestamp(report.startTime)} • {formatDuration(report.duration)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-2">
                  <p className="text-xs text-gray-500">Valid</p>
                  <p className="text-xl font-semibold text-green-700">{report.stats.validUrls}</p>
                </div>
                <div className="p-2">
                  <p className="text-xs text-gray-500">Invalid</p>
                  <p className="text-xl font-semibold text-red-700">{report.stats.invalidUrls}</p>
                </div>
                <div className="p-2">
                  <p className="text-xs text-gray-500">Missing</p>
                  <p className="text-xl font-semibold text-amber-700">{report.stats.missingUrls}</p>
                </div>
              </div>
              
              {report.invalid.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Issues</p>
                  <ScrollArea className="h-32 rounded-md border p-2">
                    {report.invalid.slice(0, 5).map((result, index) => (
                      <div key={`invalid-${index}`} className="mb-2">
                        <p className="text-xs font-medium">{result.collection} • {result.documentId.substring(0, 8)}...</p>
                        <p className="text-xs text-gray-500 truncate">{result.field}: {result.url}</p>
                        <p className="text-xs text-red-500">{result.error || 'Unknown error'}</p>
                        <Separator className="my-2" />
                      </div>
                    ))}
                    
                    {report.invalid.length > 5 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{report.invalid.length - 5} more issues
                      </p>
                    )}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderSummaryPanel = () => {
    if (!latestReport) {
      return (
        <div className="py-8 text-center text-gray-500">
          <FileWarning className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2">No validation data available</p>
          <p className="text-sm">Run a validation to see collection summaries</p>
        </div>
      );
    }

    // Create collection summaries from stats.byCollection
    const collectionSummaries = Object.entries(latestReport.stats.byCollection).map(([collection, stats]) => ({
      collection,
      totalUrls: stats.total,
      validUrls: stats.valid,
      invalidUrls: stats.invalid,
      missingUrls: stats.missing,
      validPercent: stats.total > 0 ? (stats.valid / stats.total) * 100 : 0,
      invalidPercent: stats.total > 0 ? (stats.invalid / stats.total) * 100 : 0,
      missingPercent: stats.total > 0 ? (stats.missing / stats.total) * 100 : 0
    }));

    if (collectionSummaries.length === 0) {
      return (
        <div className="py-8 text-center text-gray-500">
          <FileWarning className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2">No collection summaries available</p>
          <p className="text-sm">Run a validation to see collection details</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {collectionSummaries.map((summary, index) => (
          <Card key={`${summary.collection}-${index}`}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">
                  {summary.collection}
                </CardTitle>
                <Badge 
                  variant="outline" 
                  className={
                    summary.invalidUrls === 0 
                      ? "bg-green-50 text-green-700 border-green-300" 
                      : "bg-amber-50 text-amber-700 border-amber-300"
                  }
                >
                  {summary.validPercent.toFixed(0)}% Valid
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center mb-2">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-medium">{summary.totalUrls}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Valid</p>
                  <p className="font-medium text-green-700">{summary.validUrls}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Invalid</p>
                  <p className="font-medium text-red-700">{summary.invalidUrls}</p>
                </div>
              </div>
              
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: `${summary.validPercent}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderActionPanel()}
      
      <Tabs defaultValue="reports" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reports">Validation Reports</TabsTrigger>
          <TabsTrigger value="collections">Collection Summary</TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="pt-4">
          {isValidating ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="p-2">
                          <Skeleton className="h-3 w-1/2 mb-1" />
                          <Skeleton className="h-5 w-1/3" />
                        </div>
                      ))}
                    </div>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            renderReportsPanel()
          )}
        </TabsContent>
        <TabsContent value="collections" className="pt-4">
          {isValidating ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-1/3" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-center mb-2">
                      {[1, 2, 3].map((j) => (
                        <div key={j}>
                          <Skeleton className="h-3 w-1/2 mx-auto mb-1" />
                          <Skeleton className="h-4 w-1/3 mx-auto" />
                        </div>
                      ))}
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            renderSummaryPanel()
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MediaValidationPanel;