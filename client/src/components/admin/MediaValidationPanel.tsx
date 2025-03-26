import React, { useState, useEffect } from 'react';
import { useMediaValidation } from '@/hooks/use-media-validation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Clock, FileWarning, RefreshCw, Wrench } from 'lucide-react';

type ValidationStatus = 'idle' | 'validating' | 'repairing' | 'complete' | 'error';

interface ValidationResult {
  field: string;
  url: string;
  isValid: boolean;
  status?: number;
  statusText?: string;
  error?: string;
  collection: string;
  documentId: string;
}

interface CollectionSummary {
  collection: string;
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  validPercent: number;
  invalidPercent: number;
  missingPercent: number;
}

interface ValidationReport {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalDocuments: number;
  totalFields: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  collectionSummaries: CollectionSummary[];
  invalidResults: ValidationResult[];
}

const MediaValidationPanel = () => {
  const [activeTab, setActiveTab] = useState('reports');
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

  const [status, setStatus] = useState<ValidationStatus>('idle');

  useEffect(() => {
    if (isValidating) {
      setStatus('validating');
    } else if (isRepairing) {
      setStatus('repairing');
    } else if (error) {
      setStatus('error');
    } else if (latestReport) {
      setStatus('complete');
    } else {
      setStatus('idle');
    }
  }, [isValidating, isRepairing, error, latestReport]);

  const handleValidateMedia = () => {
    startValidation();
  };

  const handleRepairMedia = () => {
    startRepair();
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return `${hours ? hours + 'h ' : ''}${minutes % 60}m ${seconds % 60}s`;
  };

  const renderStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case 'validating':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><Clock className="w-3 h-3 mr-1" /> Validating</Badge>;
      case 'repairing':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300"><Wrench className="w-3 h-3 mr-1" /> Repairing</Badge>;
      case 'complete':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" /> Complete</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><AlertCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Ready</Badge>;
    }
  };

  const renderActionPanel = () => {
    return (
      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Media Validation</CardTitle>
              {renderStatusBadge(status)}
            </div>
            <CardDescription>
              Validate and repair media URLs across all collections
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'validating' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Validation in progress</span>
                  <span>{validationProgress.processed} / {validationProgress.total}</span>
                </div>
                <Progress value={(validationProgress.processed / validationProgress.total) * 100} />
              </div>
            )}
            
            {status === 'repairing' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Repair in progress</span>
                  <span>{repairProgress.processed} / {repairProgress.total}</span>
                </div>
                <Progress value={(repairProgress.processed / repairProgress.total) * 100} />
              </div>
            )}
            
            {status === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            {(status === 'idle' || status === 'complete') && latestReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 p-3 rounded-md">
                    <p className="text-sm text-gray-500">Valid</p>
                    <p className="text-2xl font-semibold text-green-700">{latestReport.validUrls || 0}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-md">
                    <p className="text-sm text-gray-500">Invalid</p>
                    <p className="text-2xl font-semibold text-red-700">{latestReport.invalidUrls || 0}</p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-md">
                    <p className="text-sm text-gray-500">Missing</p>
                    <p className="text-2xl font-semibold text-amber-700">{latestReport.missingUrls || 0}</p>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  <p>Last scan: {latestReport.endTime ? formatTimestamp(latestReport.endTime) : 'N/A'}</p>
                  <p>Duration: {latestReport.duration ? formatDuration(latestReport.duration) : 'N/A'}</p>
                  <p>Documents scanned: {latestReport.totalDocuments || 0}</p>
                </div>
              </div>
            )}
            
            {(status === 'idle' || status === 'complete') && !latestReport && (
              <div className="py-4 text-center text-gray-500">
                <FileWarning className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">No validation reports available</p>
                <p className="text-sm">Run a validation to check your media</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleValidateMedia} 
              disabled={isValidating || isRepairing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Validate Media
            </Button>
            <Button 
              variant="default" 
              onClick={handleRepairMedia} 
              disabled={isValidating || isRepairing || !latestReport || latestReport.invalidUrls === 0}
            >
              <Wrench className="mr-2 h-4 w-4" />
              Repair Issues
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  const renderReportsPanel = () => {
    if (!reports || reports.length === 0) {
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
                    report.invalidUrls === 0 
                      ? "bg-green-50 text-green-700 border-green-300" 
                      : "bg-amber-50 text-amber-700 border-amber-300"
                  }
                >
                  {report.invalidUrls === 0 ? "All Valid" : `${report.invalidUrls} Issues`}
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
                  <p className="text-xl font-semibold text-green-700">{report.validUrls || 0}</p>
                </div>
                <div className="p-2">
                  <p className="text-xs text-gray-500">Invalid</p>
                  <p className="text-xl font-semibold text-red-700">{report.invalidUrls || 0}</p>
                </div>
                <div className="p-2">
                  <p className="text-xs text-gray-500">Missing</p>
                  <p className="text-xl font-semibold text-amber-700">{report.missingUrls || 0}</p>
                </div>
              </div>
              
              {/* Handle both invalidResults array and invalid array properties */}
              {((report.invalidResults && report.invalidResults.length > 0) || 
                (report.invalid && report.invalid.length > 0)) && (
                <div>
                  <p className="text-sm font-medium mb-2">Issues</p>
                  <ScrollArea className="h-32 rounded-md border p-2">
                    {/* Handle original format with invalidResults */}
                    {report.invalidResults?.slice(0, 5).map((result, idx) => (
                      <div key={`result-${idx}`} className="mb-2">
                        <p className="text-xs font-medium">{result.collection} • {result.documentId?.substring(0, 8) || 'unknown'}...</p>
                        <p className="text-xs text-gray-500 truncate">{result.field}: {result.url}</p>
                        <p className="text-xs text-red-500">{result.error}</p>
                        <Separator className="my-2" />
                      </div>
                    ))}
                    
                    {/* Handle new format with invalid array */}
                    {report.invalid?.slice(0, 5).map((result, idx) => (
                      <div key={`invalid-${idx}`} className="mb-2">
                        <p className="text-xs font-medium">{result.collection || 'unknown'} • {(result.documentId || result.id || 'unknown').substring(0, 8)}...</p>
                        <p className="text-xs text-gray-500 truncate">{result.field || 'unknown'}: {result.url || 'unknown'}</p>
                        <p className="text-xs text-red-500">{result.error || 'Unknown error'}</p>
                        <Separator className="my-2" />
                      </div>
                    ))}
                    
                    {/* Display count of additional issues */}
                    {((report.invalidResults?.length || 0) > 5 || (report.invalid?.length || 0) > 5) && (
                      <p className="text-xs text-gray-500 text-center">
                        +{Math.max((report.invalidResults?.length || 0), (report.invalid?.length || 0)) - 5} more issues
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

    // Extract collection summaries from either format
    const getCollectionSummaries = () => {
      if (latestReport && latestReport.collectionSummaries && Array.isArray(latestReport.collectionSummaries) && latestReport.collectionSummaries.length > 0) {
        return latestReport.collectionSummaries;
      } else if (latestReport?.stats?.byCollection) {
        // Convert stats.byCollection object to array of collection summaries
        return Object.entries(latestReport.stats.byCollection).map(([collection, stats]: [string, any]) => ({
          collection,
          totalUrls: stats.total || 0,
          validUrls: stats.valid || 0,
          invalidUrls: stats.invalid || 0,
          missingUrls: stats.missing || 0,
          validPercent: stats.total > 0 ? (stats.valid / stats.total) * 100 : 0,
          invalidPercent: stats.total > 0 ? (stats.invalid / stats.total) * 100 : 0,
          missingPercent: stats.total > 0 ? (stats.missing / stats.total) * 100 : 0
        }));
      }
      return [];
    };

    const collectionSummaries = getCollectionSummaries();

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
        {collectionSummaries.map((summary) => (
          <Card key={summary.collection}>
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
                  <p className="font-medium">{summary.totalUrls || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Valid</p>
                  <p className="font-medium text-green-700">{summary.validUrls || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Invalid</p>
                  <p className="font-medium text-red-700">{summary.invalidUrls || 0}</p>
                </div>
              </div>
              
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: `${summary.validPercent || 0}%` }}
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