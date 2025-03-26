/**
 * Report Types
 * 
 * This file defines the types used for reports in the admin section
 */

/**
 * Report type enumeration
 */
export type ReportType = 'analytics' | 'financial' | 'system' | 'media' | 'audit';

/**
 * Report format enumeration
 */
export type ReportFormat = 'json' | 'csv' | 'pdf' | 'xlsx';

/**
 * Base report interface
 */
export interface Report {
  id: string;
  title: string;
  description: string;
  type: ReportType;
  createdAt: string;
  format: ReportFormat;
  size: string;
  url: string;
  tags: string[];
}

/**
 * Report generation request parameters
 */
export interface GenerateReportParams {
  title: string;
  description: string;
  type: ReportType;
  format: ReportFormat;
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  includeInactive?: boolean;
}

/**
 * Report generation response
 */
export interface GenerateReportResponse {
  success: boolean;
  reportId?: string;
  url?: string;
  error?: string;
}

/**
 * Media validation report
 */
export interface MediaValidationReport extends Report {
  stats: {
    totalDocuments: number;
    totalFields: number;
    validUrls: number;
    invalidUrls: number;
    missingUrls: number;
    byCollection: Record<string, {
      totalUrls: number;
      validUrls: number;
      invalidUrls: number;
      missingUrls: number;
    }>;
  };
}

/**
 * User activity report
 */
export interface UserActivityReport extends Report {
  stats: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    byRole: Record<string, number>;
    byRegion: Record<string, number>;
  };
}

/**
 * Financial report
 */
export interface FinancialReport extends Report {
  stats: {
    totalRevenue: number;
    totalBookings: number;
    averageBookingValue: number;
    byYachtCategory: Record<string, number>;
    byRegion: Record<string, number>;
  };
}