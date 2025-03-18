import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import { ServiceCategoryData } from '@/types/partner';

interface ServiceCategoryChartProps {
  data: ServiceCategoryData[];
  isLoading?: boolean;
}

// Custom color palette for the pie chart
const COLORS = ['#3182CE', '#38B2AC', '#805AD5', '#DD6B20', '#D53F8C', '#2B6CB0', '#319795', '#6B46C1'];

export function ServiceCategoryChart({ data, isLoading = false }: ServiceCategoryChartProps) {
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
                  <path d="M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10Z"></path>
                  <path d="M12 2v10l4.2 4.2"></path>
                </svg>
              </div>
              <p>No category data available</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Custom tooltip formatter to show count and percentage
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="count"
          nameKey="category"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => {
            const percentage = ((value / totalCount) * 100).toFixed(1);
            return [`${value} (${percentage}%)`, 'Bookings'];
          }}
          contentStyle={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        />
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          formatter={(value) => <span className="text-sm">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}