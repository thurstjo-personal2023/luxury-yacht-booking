/**
 * Media Validation Panel Component
 * 
 * This component provides an administrative interface for media validation
 * and repair operations. It displays validation results, allows running
 * validation tasks, and fixing detected issues.
 */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check, Clock, RefreshCw, Search, X } from 'lucide-react';
import { useMediaValidation } from '@/hooks/use-media-validation';

export default function MediaValidationPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { 
    validationStatus, 
    validationResults, 
    runValidation, 
    fixInvalidUrls, 
    isValidating,
    repairStatus,
    isRepairing,
    lastValidationReport,
    loadReports,
    reports
  } = useMediaValidation();
  
  useEffect(() => {
    // Load validation reports when component mounts
    loadReports();
  }, []);

  // Handle running validation
  const handleRunValidation = () => {
    runValidation();
  };

  // Handle fixing invalid URLs
  const handleFixInvalidUrls = () => {
    fixInvalidUrls();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Media Validation Dashboard</CardTitle>
        <CardDescription>
          Validate and fix media URLs across the application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="results">Validation Results</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 mt-4">
              {/* Summary Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {lastValidationReport ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Documents:</span>
                        <span>{lastValidationReport.totalDocuments}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Valid URLs:</span>
                        <span className="text-green-600">{lastValidationReport.validUrls}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Invalid URLs:</span>
                        <span className="text-red-600">{lastValidationReport.invalidUrls}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Last Run:</span>
                        <span>{new Date(lastValidationReport.endTime).toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No validation data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleRunValidation} 
                    disabled={isValidating}
                    className="w-full"
                  >
                    {isValidating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Running Validation...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Run Validation
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleFixInvalidUrls} 
                    disabled={isRepairing || !lastValidationReport || lastValidationReport.invalidUrls === 0}
                    variant="outline" 
                    className="w-full"
                  >
                    {isRepairing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Fixing URLs...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Fix Invalid URLs
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Status Section */}
            {(isValidating || isRepairing) && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>
                  {isValidating ? 'Validation in Progress' : 'Repair in Progress'}
                </AlertTitle>
                <AlertDescription>
                  {isValidating ? validationStatus : repairStatus}
                  <Progress value={75} className="mt-2" />
                </AlertDescription>
              </Alert>
            )}

            {/* Collection Summaries */}
            {lastValidationReport && lastValidationReport.collectionSummaries && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Collection Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Collection</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Valid</TableHead>
                        <TableHead className="text-right">Invalid</TableHead>
                        <TableHead className="text-right">Valid %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lastValidationReport.collectionSummaries.map((summary, index) => (
                        <TableRow key={index}>
                          <TableCell>{summary.collection}</TableCell>
                          <TableCell className="text-right">{summary.totalUrls}</TableCell>
                          <TableCell className="text-right text-green-600">{summary.validUrls}</TableCell>
                          <TableCell className="text-right text-red-600">{summary.invalidUrls}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={summary.validPercent > 90 ? "success" : summary.validPercent > 70 ? "outline" : "destructive"}>
                              {summary.validPercent}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Validation Results Tab */}
          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Invalid Media URLs</CardTitle>
                <CardDescription>
                  {lastValidationReport 
                    ? `${lastValidationReport.invalidUrls} invalid URLs found across ${lastValidationReport.totalDocuments} documents` 
                    : 'No validation results available'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {lastValidationReport && lastValidationReport.invalidResults && lastValidationReport.invalidResults.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Collection/Document</TableHead>
                          <TableHead>Field</TableHead>
                          <TableHead>URL</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lastValidationReport.invalidResults.map((result, index) => {
                          const [collection, docId] = result.collection && result.documentId 
                            ? [`${result.collection}`, `${result.documentId}`]
                            : ['-', '-'];
                          
                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="font-medium">{collection}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[150px]">{docId}</div>
                              </TableCell>
                              <TableCell>{result.field.split(':').pop()}</TableCell>
                              <TableCell>
                                <div className="text-xs truncate max-w-[200px]">
                                  {result.url}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                                  <span className="text-xs">{result.error || 'Unknown error'}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      {lastValidationReport ? 'No invalid URLs found' : 'Run validation to see results'}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleFixInvalidUrls} 
                  disabled={isRepairing || !lastValidationReport || lastValidationReport.invalidUrls === 0}
                  className="ml-auto"
                >
                  Fix All Issues
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Validation History</CardTitle>
                <CardDescription>
                  Previous validation runs and results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {reports && reports.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Documents</TableHead>
                          <TableHead className="text-right">Valid</TableHead>
                          <TableHead className="text-right">Invalid</TableHead>
                          <TableHead className="text-right">Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map((report, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {new Date(report.endTime).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">{report.totalDocuments}</TableCell>
                            <TableCell className="text-right text-green-600">{report.validUrls}</TableCell>
                            <TableCell className="text-right text-red-600">{report.invalidUrls}</TableCell>
                            <TableCell className="text-right">
                              {Math.round(report.duration / 1000)}s
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No validation history available
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}