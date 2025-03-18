import React, { useState } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, BarChart4 } from 'lucide-react';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface AnalyticsDatePickerProps {
  onRangeChange: (range: DateRange) => void;
  onAggregationChange: (type: 'day' | 'week' | 'month') => void;
}

export function AnalyticsDatePicker({ onRangeChange, onAggregationChange }: AnalyticsDatePickerProps) {
  // Track UI state for active buttons
  const [activeRange, setActiveRange] = useState<string>('30days');
  const [activeAggregation, setActiveAggregation] = useState<'day' | 'week' | 'month'>('day');

  // Handle period selection
  const handlePeriodSelect = (period: string) => {
    setActiveRange(period);
    let start: Date, end: Date;
    const today = new Date();
    
    switch (period) {
      case '30days':
        start = subDays(today, 30);
        end = today;
        break;
      case '90days':
        start = subDays(today, 90);
        end = today;
        break;
      case '12months':
        start = subMonths(today, 12);
        end = today;
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        end = today;
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      default:
        start = subDays(today, 30);
        end = today;
    }
    
    onRangeChange({ startDate: start, endDate: end });
  };

  // Handle aggregation type selection
  const handleAggregationSelect = (type: 'day' | 'week' | 'month') => {
    setActiveAggregation(type);
    onAggregationChange(type);
  };

  return (
    <>
      {/* Period Selection */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Time Period</h3>
        <div className="flex flex-col space-y-1.5">
          <Button 
            variant={activeRange === '30days' ? "outline" : "ghost"} 
            className="justify-start"
            onClick={() => handlePeriodSelect('30days')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Last 30 Days
          </Button>
          <Button 
            variant={activeRange === '90days' ? "outline" : "ghost"} 
            className="justify-start"
            onClick={() => handlePeriodSelect('90days')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Last 3 Months
          </Button>
          <Button 
            variant={activeRange === '12months' ? "outline" : "ghost"} 
            className="justify-start"
            onClick={() => handlePeriodSelect('12months')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Last 12 Months
          </Button>
          <Button 
            variant={activeRange === 'thisMonth' ? "outline" : "ghost"} 
            className="justify-start"
            onClick={() => handlePeriodSelect('thisMonth')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            This Month
          </Button>
          <Button 
            variant={activeRange === 'lastMonth' ? "outline" : "ghost"} 
            className="justify-start"
            onClick={() => handlePeriodSelect('lastMonth')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Last Month
          </Button>
        </div>
      </div>
      
      {/* Aggregation Type */}
      <div className="space-y-2 mt-6">
        <h3 className="text-sm font-medium">View By</h3>
        <div className="flex flex-col space-y-1.5">
          <Button 
            variant={activeAggregation === 'day' ? "outline" : "ghost"} 
            className="justify-start"
            onClick={() => handleAggregationSelect('day')}
          >
            <BarChart4 className="mr-2 h-4 w-4" />
            Daily
          </Button>
          <Button 
            variant={activeAggregation === 'week' ? "outline" : "ghost"} 
            className="justify-start"
            onClick={() => handleAggregationSelect('week')}
          >
            <BarChart4 className="mr-2 h-4 w-4" />
            Weekly
          </Button>
          <Button 
            variant={activeAggregation === 'month' ? "outline" : "ghost"} 
            className="justify-start"
            onClick={() => handleAggregationSelect('month')}
          >
            <BarChart4 className="mr-2 h-4 w-4" />
            Monthly
          </Button>
        </div>
      </div>
    </>
  );
}