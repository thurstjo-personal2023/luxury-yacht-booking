/**
 * Media Validation Activity
 * 
 * This component displays recent media validation activities for the admin dashboard.
 * It shows the most recent validation and repair events.
 */
import React from 'react';
import { useMediaValidation } from '@/hooks/use-media-validation';

const MediaValidationActivity = () => {
  const { reports, latestReport, isValidating, isRepairing } = useMediaValidation();
  
  // Helper function to get the number of collections in a report
  const getCollectionCount = (report: any): number => {
    if (report.collectionSummaries && Array.isArray(report.collectionSummaries)) {
      return report.collectionSummaries.length;
    } else if (report.stats && report.stats.byCollection) {
      return Object.keys(report.stats.byCollection).length;
    }
    return 0;
  };
  
  // Format date for display
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    
    // Validate that the date is valid
    const timestamp = date.getTime();
    if (isNaN(timestamp)) return 'Invalid date';
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Calculate time ago
  const getTimeAgo = (date: Date | undefined) => {
    if (!date) return 'Never';
    
    // Validate that the date is valid
    const timestamp = date.getTime();
    if (isNaN(timestamp)) return 'Invalid date';
    
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
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
    
    return formatDate(date);
  };

  // Get sorted reports
  const sortedReports = React.useMemo(() => {
    if (!reports.length) return [];
    
    // Sort reports by end time, handling invalid dates
    return [...reports].sort((a, b) => {
      // Check if dates are valid
      const aTime = a.endTime instanceof Date && !isNaN(a.endTime.getTime()) 
        ? a.endTime.getTime() 
        : 0;
      const bTime = b.endTime instanceof Date && !isNaN(b.endTime.getTime()) 
        ? b.endTime.getTime() 
        : 0;
      
      return bTime - aTime; // Newest first
    });
  }, [reports]);

  // No reports case
  if (sortedReports.length === 0 && !isValidating && !isRepairing) {
    return (
      <div className="border-l-4 border-gray-300 pl-4 py-1">
        <div className="font-medium">Media Validation</div>
        <div className="text-sm text-muted-foreground">
          No validation activities recorded yet
        </div>
        <div className="text-xs text-muted-foreground">-</div>
      </div>
    );
  }

  // Show in-progress activity
  if (isValidating || isRepairing) {
    return (
      <div className="border-l-4 border-blue-500 pl-4 py-1">
        <div className="font-medium">Media {isValidating ? 'Validation' : 'Repair'}</div>
        <div className="text-sm text-muted-foreground">
          {isValidating ? 'Validating' : 'Repairing'} media URLs across collections
        </div>
        <div className="text-xs text-muted-foreground">In progress</div>
      </div>
    );
  }

  // Show latest report(s)
  return (
    <>
      {sortedReports.slice(0, 2).map((report, index) => {
        const invalidCount = report.invalidUrls + report.missingUrls;
        const borderColor = invalidCount > 0 ? 'border-orange-500' : 'border-green-500';
        
        return (
          <div key={report.id} className={`border-l-4 ${borderColor} pl-4 py-1`}>
            <div className="font-medium">Media Validation</div>
            <div className="text-sm text-muted-foreground">
              {invalidCount > 0 
                ? `Found ${invalidCount} issues across ${getCollectionCount(report)} collections`
                : `Validated ${report.totalFields || 0} URLs with no issues found`
              }
            </div>
            <div className="text-xs text-muted-foreground">{getTimeAgo(report.endTime)}</div>
          </div>
        );
      })}
    </>
  );
};

export default MediaValidationActivity;