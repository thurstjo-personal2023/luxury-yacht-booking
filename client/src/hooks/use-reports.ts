import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Report, ReportType, ReportFormat, GenerateReportParams } from '@/types/reports';
import { adminApiRequestWithRetry } from '@/lib/adminApiUtils';

// Extend the adminApiRequestWithRetry function return type
declare module '@/lib/adminApiUtils' {
  interface ApiResponse {
    reports?: Report[];
    report?: Report;
    success?: boolean;
    reportId?: string;
    url?: string;
    error?: string;
  }
}

/**
 * Hook for fetching admin reports
 * @param type Optional filter for report type
 */
export function useReports(type?: string) {
  return useQuery({
    queryKey: ['admin', 'reports', type],
    queryFn: async () => {
      try {
        console.log('Fetching reports from API...');
        // Build query params if type is specified
        const queryParams = type && type !== 'all' ? `?type=${type}` : '';
        
        // Make API request to get reports
        const response = await adminApiRequestWithRetry(`/api/admin/reports${queryParams}`);
        // Cast the response to any to handle the potential type mismatch
        const data = response as any;
        const reports = data.reports || [];
        
        console.log(`Fetched ${reports.length} reports from API`);
        return reports;
      } catch (error) {
        console.error('Error fetching reports:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for generating a new report
 */
export function useGenerateReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: GenerateReportParams) => {
      try {
        console.log('Generating report:', params);
        const response = await adminApiRequestWithRetry('/api/admin/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });
        
        // Cast the response to any to handle the potential type mismatch
        const data = response as any;
        console.log('Report generation response:', data);
        return data;
      } catch (error) {
        console.error('Error generating report:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate reports query to refetch data
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });
}

/**
 * Hook for fetching a specific report
 * @param reportId ID of the report to fetch
 */
export function useReport(reportId: string | null) {
  return useQuery({
    queryKey: ['admin', 'report', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      
      try {
        const response = await adminApiRequestWithRetry(`/api/admin/reports/${reportId}`);
        // Cast the response to any to handle the potential type mismatch
        const data = response as any;
        return data.report;
      } catch (error) {
        console.error(`Error fetching report ${reportId}:`, error);
        throw error;
      }
    },
    enabled: !!reportId, // Only run the query if reportId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}