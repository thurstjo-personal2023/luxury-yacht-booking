/**
 * Media Validation Summary
 * 
 * This component displays a summary of media validation results for the admin dashboard.
 * It shows validation statistics and a link to the full media validation page.
 */
import React from 'react';
import { useLocation } from 'wouter';
import { FileWarning, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMediaValidation } from '@/hooks/use-media-validation';

const MediaValidationSummary = () => {
  const [_, setLocation] = useLocation();
  const { 
    latestReport, 
    isValidating, 
    validationProgress 
  } = useMediaValidation();

  // Format date for display with improved validation
  const formatDate = (date: Date | undefined | string | number) => {
    if (!date) return 'N/A';
    
    // Convert to Date object if it's not already one
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else if (typeof date === 'string') {
      // Try to parse the string as a date
      dateObj = new Date(date);
    } else {
      // If it's an unsupported type, return a fallback
      return 'Invalid date format';
    }
    
    // Validate the date object
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    // Format the valid date
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  // Calculate time ago with improved validation
  const getTimeAgo = (date: Date | undefined | string | number) => {
    if (!date) return 'Never';
    
    // Convert to Date object if it's not already one
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else if (typeof date === 'string') {
      // Try to parse the string as a date
      dateObj = new Date(date);
    } else {
      // If it's an unsupported type, return a fallback
      return 'Unknown date';
    }
    
    // Validate the date object
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return formatDate(dateObj);
  };

  // Calculate validation statistics
  const stats = React.useMemo(() => {
    if (!latestReport) {
      return {
        validPercent: 0,
        invalidPercent: 0,
        total: 0,
        valid: 0,
        invalid: 0,
        collections: 0,
        lastRun: undefined
      };
    }

    // Handle different report formats - check for the collectionSummaries property 
    // or fall back to stats.byCollection if using the new format
    let collectionsCount = 0;
    if (latestReport.collectionSummaries) {
      collectionsCount = latestReport.collectionSummaries.length;
    } else if (latestReport.stats && latestReport.stats.byCollection) {
      collectionsCount = Object.keys(latestReport.stats.byCollection).length;
    }

    // Check for stats-based structure vs. direct properties
    const validUrls = latestReport.validUrls || (latestReport.stats && latestReport.stats.validUrls) || 0;
    const invalidUrls = latestReport.invalidUrls || (latestReport.stats && latestReport.stats.invalidUrls) || 0;
    const missingUrls = latestReport.missingUrls || (latestReport.stats && latestReport.stats.missingUrls) || 0;

    const total = validUrls + invalidUrls + missingUrls;
    const validPercent = total > 0 ? Math.round((validUrls / total) * 100) : 0;
    const invalidPercent = total > 0 ? Math.round(((invalidUrls + missingUrls) / total) * 100) : 0;
    
    return {
      validPercent,
      invalidPercent,
      total,
      valid: validUrls,
      invalid: invalidUrls + missingUrls,
      collections: collectionsCount,
      lastRun: latestReport.endTime
    };
  }, [latestReport]);

  // Handle validation in progress
  const renderContent = () => {
    if (isValidating) {
      const progress = validationProgress.total > 0 
        ? Math.round((validationProgress.processed / validationProgress.total) * 100)
        : 0;
        
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-end text-sm">
            <span>Validation in progress...</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {validationProgress.processed} of {validationProgress.total} documents processed
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total URLs</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{stats.validPercent}%</div>
            <div className="text-xs text-muted-foreground">Valid</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{stats.invalidPercent}%</div>
            <div className="text-xs text-muted-foreground">Invalid</div>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Last scan: {getTimeAgo(stats.lastRun)}
        </div>
        
        {stats.invalid > 0 && (
          <div className="text-sm">
            <span className="text-red-600 font-medium">{stats.invalid}</span> issues found across{' '}
            <span className="font-medium">{stats.collections}</span> collections
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg">
          <FileWarning className="h-5 w-5 mr-2 text-primary" />
          Media Validation Status
        </CardTitle>
        <CardDescription>
          {latestReport 
            ? `Last validation completed ${getTimeAgo(latestReport.endTime)}`
            : 'No validation data available'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full flex justify-between items-center" 
          onClick={() => setLocation('/admin/media-validation')}
          disabled={isValidating}
        >
          <span>View detailed report</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MediaValidationSummary;