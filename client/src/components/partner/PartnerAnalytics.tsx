import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ServiceUsageChart } from './ServiceUsageChart';
import { ServiceCategoryChart } from './ServiceCategoryChart';
import { TopAddonsTable } from './TopAddonsTable';
import { AnalyticsDatePicker } from './AnalyticsDatePicker';
import { useServiceAnalytics } from '@/hooks/partner/usePartnerQueries';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function PartnerAnalytics() {
  // State for date range and aggregation type
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date()
  });
  const [aggregateBy, setAggregateBy] = useState<'day' | 'week' | 'month'>('day');
  
  // Fetch analytics data
  const { data: analyticsData, isLoading, error } = useServiceAnalytics({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    aggregateBy
  });
  
  // Handle date range change
  const handleRangeChange = (range: { startDate: Date; endDate: Date }) => {
    setDateRange(range);
  };
  
  // Handle aggregation type change
  const handleAggregationChange = (type: 'day' | 'week' | 'month') => {
    setAggregateBy(type);
  };
  
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <Card className="w-full md:w-[250px]">
        <CardHeader>
          <CardTitle>Service Analytics</CardTitle>
          <CardDescription>
            Track the utilization of your service add-ons
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AnalyticsDatePicker 
            onRangeChange={handleRangeChange}
            onAggregationChange={handleAggregationChange}
          />
        </CardContent>
      </Card>
      
      <div className="flex flex-col flex-1 gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load analytics data. Please try again later.
            </AlertDescription>
          </Alert>
        )}
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Service Usage Over Time</CardTitle>
            <CardDescription>
              Number of bookings including your services
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            <div className="h-[300px] w-full">
              <ServiceUsageChart 
                data={analyticsData?.timeSeriesData || []} 
                isLoading={isLoading}
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Popularity</CardTitle>
              <CardDescription>
                Distribution by service category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ServiceCategoryChart 
                  data={analyticsData?.servicePopularity || []} 
                  isLoading={isLoading}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Add-ons</CardTitle>
              <CardDescription>
                Your most-booked service add-ons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TopAddonsTable 
                  data={analyticsData?.addonPopularity || []} 
                  isLoading={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}