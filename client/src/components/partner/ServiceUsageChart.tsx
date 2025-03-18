import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { ServiceTimeDataPoint } from '@/types/partner';
import { Card, CardContent } from '@/components/ui/card';

interface ServiceUsageChartProps {
  data: ServiceTimeDataPoint[];
  isLoading?: boolean;
}

export function ServiceUsageChart({ data, isLoading = false }: ServiceUsageChartProps) {
  // If no data or loading, display a placeholder
  if (isLoading || !data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          {isLoading ? (
            <div className="h-40 w-full animate-pulse rounded-md bg-muted"></div>
          ) : (
            <>
              <div className="flex justify-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-12 w-12 opacity-20"
                >
                  <path d="M3 3v18h18"></path>
                  <path d="m19 9-5 5-4-4-3 3"></path>
                </svg>
              </div>
              <p>No usage data available for the selected period</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3182ce" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3182ce" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis 
          dataKey="period" 
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
        />
        <YAxis 
          tickLine={false}
          axisLine={{ stroke: '#E2E8F0' }}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => value === 0 ? '0' : value}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
          formatter={(value: number) => [`${value} bookings`, 'Bookings']}
          labelFormatter={(label) => `Period: ${label}`}
        />
        <Legend wrapperStyle={{ marginTop: '10px' }} />
        <Area
          type="monotone"
          dataKey="count"
          name="Service Bookings"
          stroke="#3182ce"
          fillOpacity={1}
          fill="url(#colorUsage)"
          strokeWidth={2}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}