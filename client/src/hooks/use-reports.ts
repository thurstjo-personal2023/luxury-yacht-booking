import { useQuery } from '@tanstack/react-query';
import { Report } from '@/pages/admin/ReportsPage';
import { adminApiRequestWithRetry } from '@/lib/adminApiUtils';

/**
 * Mock data for reports until the backend API is implemented
 */
const MOCK_REPORTS: Report[] = [
  {
    id: 'report-001',
    title: 'Monthly User Growth Report',
    description: 'Analysis of user growth trends by region and user type',
    type: 'analytics',
    createdAt: '2025-02-15T10:30:00Z',
    format: 'pdf',
    size: '2.4 MB',
    url: '/api/admin/reports/report-001',
    tags: ['users', 'growth', 'analytics', 'monthly']
  },
  {
    id: 'report-002',
    title: 'Q1 Financial Summary',
    description: 'Financial performance summary for Q1 2025',
    type: 'financial',
    createdAt: '2025-03-01T14:15:00Z',
    format: 'xlsx',
    size: '1.8 MB',
    url: '/api/admin/reports/report-002',
    tags: ['financial', 'quarterly', 'revenue']
  },
  {
    id: 'report-003',
    title: 'System Performance Metrics',
    description: 'Server performance and response time analysis',
    type: 'system',
    createdAt: '2025-03-10T09:45:00Z',
    format: 'json',
    size: '850 KB',
    url: '/api/admin/reports/report-003',
    tags: ['system', 'performance', 'technical']
  },
  {
    id: 'report-004',
    title: 'Media Validation Report',
    description: 'Comprehensive analysis of media validation results',
    type: 'system',
    createdAt: '2025-03-15T16:20:00Z',
    format: 'pdf',
    size: '3.2 MB',
    url: '/api/admin/reports/report-004',
    tags: ['media', 'validation', 'system']
  },
  {
    id: 'report-005',
    title: 'User Engagement Analysis',
    description: 'Analysis of user engagement metrics and patterns',
    type: 'analytics',
    createdAt: '2025-03-18T11:30:00Z',
    format: 'pdf',
    size: '4.1 MB',
    url: '/api/admin/reports/report-005',
    tags: ['users', 'engagement', 'analytics']
  },
  {
    id: 'report-006',
    title: 'Booking Revenue Breakdown',
    description: 'Detailed breakdown of booking revenue by yacht category',
    type: 'financial',
    createdAt: '2025-03-20T13:45:00Z',
    format: 'csv',
    size: '1.2 MB',
    url: '/api/admin/reports/report-006',
    tags: ['financial', 'bookings', 'revenue']
  }
];

/**
 * Hook for fetching admin reports
 * @param type Optional filter for report type
 */
export function useReports(type?: string) {
  return useQuery({
    queryKey: ['admin', 'reports', type],
    queryFn: async () => {
      try {
        // TODO: Replace with actual API call when backend is implemented
        // const data = await adminApiRequestWithRetry('/api/admin/reports');
        
        // For now, use mock data and apply type filter if provided
        let reports = [...MOCK_REPORTS];
        
        if (type) {
          reports = reports.filter(report => report.type === type);
        }
        
        return reports;
      } catch (error) {
        console.error('Error fetching reports:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}