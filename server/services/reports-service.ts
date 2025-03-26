/**
 * Reports Service
 * 
 * This service handles report generation and retrieval for the admin section
 */
import { adminDb } from '../firebase-admin';
import * as admin from 'firebase-admin';
import { createObjectCsvStringifier } from 'csv-writer';
// Import types from local path to avoid path issues
import type { ReportType, ReportFormat } from '../../client/src/types/reports';

// Report generation parameters interface
interface GenerateReportParams {
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

// Collection for storing reports
const REPORTS_COLLECTION = 'admin_reports';

// Collection for storing report data
const REPORT_DATA_COLLECTION = 'admin_report_data';

/**
 * Reports Service class
 */
export class ReportsService {
  /**
   * Generate a new report
   * @param params Report parameters
   * @returns Generated report ID and URL
   */
  async generateReport(params: GenerateReportParams, userId: string): Promise<{ id: string, url: string }> {
    console.log(`Generating ${params.type} report in ${params.format} format`);
    
    try {
      // Create a report metadata entry
      const reportRef = adminDb.collection(REPORTS_COLLECTION).doc();
      const reportId = reportRef.id;
      
      // Generate report based on type and format
      const reportData = await this.generateReportData(params, reportId);
      
      // Store the report data
      await this.storeReportData(reportId, reportData, params.format);
      
      // Calculate the size
      const size = this.calculateReportSize(reportData, params.format);
      
      // Create tags based on report type and content
      const tags = this.generateTags(params);
      
      // Store report metadata
      const reportMeta = {
        id: reportId,
        title: params.title,
        description: params.description,
        type: params.type,
        createdAt: admin.firestore.Timestamp.now(),
        format: params.format,
        size,
        url: `/api/admin/reports/${reportId}`,
        tags,
        createdBy: userId,
        filters: params.filters || {},
        dateRange: params.dateRange || {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      };
      
      await reportRef.set(reportMeta);
      
      return {
        id: reportId,
        url: `/api/admin/reports/${reportId}`
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Generate report data based on type and format
   * @param params Report parameters
   * @param reportId Report ID
   * @returns Generated report data
   */
  private async generateReportData(params: GenerateReportParams, reportId: string): Promise<any> {
    switch (params.type) {
      case 'analytics':
        return this.generateAnalyticsReport(params);
      
      case 'financial':
        return this.generateFinancialReport(params);
      
      case 'system':
        return this.generateSystemReport(params);
      
      case 'media':
        return this.generateMediaReport(params);
        
      case 'audit':
        return this.generateAuditReport(params);
        
      default:
        throw new Error(`Unsupported report type: ${params.type}`);
    }
  }
  
  /**
   * Generate analytics report
   * @param params Report parameters
   * @returns Analytics report data
   */
  private async generateAnalyticsReport(params: GenerateReportParams): Promise<any> {
    // Get user data for analytics
    const userProfiles = await this.getUserProfiles(params);
    
    // Calculate statistics
    const totalUsers = userProfiles.length;
    const activeUsers = userProfiles.filter(u => u.isActive).length;
    const newUsers = userProfiles.filter(u => {
      const createdAt = u.createdAt?.toDate() || new Date();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return createdAt > thirtyDaysAgo;
    }).length;
    
    // Count by role
    const byRole: Record<string, number> = {};
    userProfiles.forEach(u => {
      const role = u.role || 'unknown';
      byRole[role] = (byRole[role] || 0) + 1;
    });
    
    // Count by region
    const byRegion: Record<string, number> = {};
    userProfiles.forEach(u => {
      const region = u.region || u.location?.region || 'unknown';
      if (region) {
        byRegion[region] = (byRegion[region] || 0) + 1;
      }
    });
    
    return {
      stats: {
        totalUsers,
        activeUsers,
        newUsers,
        byRole,
        byRegion
      },
      data: userProfiles.map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        createdAt: u.createdAt?.toDate().toISOString() || new Date().toISOString(),
        lastLogin: u.lastLogin?.toDate().toISOString() || null,
        isActive: u.isActive
      }))
    };
  }
  
  /**
   * Generate financial report
   * @param params Report parameters
   * @returns Financial report data
   */
  private async generateFinancialReport(params: GenerateReportParams): Promise<any> {
    // Get booking data for financial analysis
    const bookings = await this.getBookingData(params);
    
    // Calculate statistics
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalBookings = bookings.length;
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    
    // Count by yacht category
    const byYachtCategory: Record<string, number> = {};
    bookings.forEach(b => {
      const category = b.yachtCategory || 'unknown';
      byYachtCategory[category] = (byYachtCategory[category] || 0) + (b.totalAmount || 0);
    });
    
    // Count by region
    const byRegion: Record<string, number> = {};
    bookings.forEach(b => {
      const region = b.region || 'unknown';
      byRegion[region] = (byRegion[region] || 0) + (b.totalAmount || 0);
    });
    
    return {
      stats: {
        totalRevenue,
        totalBookings,
        averageBookingValue,
        byYachtCategory,
        byRegion
      },
      data: bookings.map(b => ({
        id: b.id,
        yachtId: b.yachtId,
        yachtName: b.yachtName,
        yachtCategory: b.yachtCategory,
        customerId: b.customerId,
        customerName: b.customerName,
        bookingDate: b.bookingDate?.toDate().toISOString() || new Date().toISOString(),
        startDate: b.startDate?.toDate().toISOString() || null,
        endDate: b.endDate?.toDate().toISOString() || null,
        totalAmount: b.totalAmount || 0,
        status: b.status
      }))
    };
  }
  
  /**
   * Generate system report
   * @param params Report parameters
   * @returns System report data
   */
  private async generateSystemReport(params: GenerateReportParams): Promise<any> {
    // Get system alerts for system report
    const alerts = await this.getSystemAlerts(params);
    
    // Get the latest media validation report
    const mediaReports = await adminDb.collection('media_validation_reports')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    const mediaReport = mediaReports.empty 
      ? null 
      : { id: mediaReports.docs[0].id, ...mediaReports.docs[0].data() as Record<string, any> };
    
    // Calculate alert statistics
    const totalAlerts = alerts.length;
    const openAlerts = alerts.filter(a => a.status === 'open').length;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    
    // Count by category
    const byCategory: Record<string, number> = {};
    alerts.forEach(a => {
      const category = a.category || 'unknown';
      byCategory[category] = (byCategory[category] || 0) + 1;
    });
    
    // Count by severity
    const bySeverity: Record<string, number> = {};
    alerts.forEach(a => {
      const severity = a.severity || 'unknown';
      bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    });
    
    return {
      stats: {
        totalAlerts,
        openAlerts,
        criticalAlerts,
        byCategory,
        bySeverity,
        mediaValidation: mediaReport ? {
          totalDocuments: (mediaReport as any).stats?.totalDocuments || 0,
          totalFields: (mediaReport as any).stats?.totalFields || 0,
          validUrls: (mediaReport as any).stats?.validUrls || 0,
          invalidUrls: (mediaReport as any).stats?.invalidUrls || 0,
          missingUrls: (mediaReport as any).stats?.missingUrls || 0
        } : null
      },
      data: {
        alerts: alerts.map(a => ({
          id: a.id,
          title: a.title,
          message: a.message,
          category: a.category,
          severity: a.severity,
          status: a.status,
          createdAt: a.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt: a.updatedAt?.toDate().toISOString() || new Date().toISOString(),
          resolvedAt: a.resolvedAt?.toDate().toISOString() || null
        })),
        mediaValidation: mediaReport
      }
    };
  }
  
  /**
   * Generate media report
   * @param params Report parameters
   * @returns Media report data
   */
  private async generateMediaReport(params: GenerateReportParams): Promise<any> {
    // Get media validation reports
    const reportsQuery = adminDb.collection('media_validation_reports')
      .orderBy('createdAt', 'desc');
    
    // Apply date range filter if provided
    if (params.dateRange?.start && params.dateRange?.end) {
      const startDate = new Date(params.dateRange.start);
      const endDate = new Date(params.dateRange.end);
      
      reportsQuery.where('createdAt', '>=', startDate)
                  .where('createdAt', '<=', endDate);
    }
    
    // Get reports
    const reportsSnapshot = await reportsQuery.limit(10).get();
    const reports = reportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get URL repair reports
    const repairReportsSnapshot = await adminDb.collection('url_repair_reports')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    const repairReports = repairReportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Calculate statistics
    const latestReport = reports[0] as any;
    const stats = latestReport?.stats || {
      totalDocuments: 0,
      totalFields: 0,
      validUrls: 0,
      invalidUrls: 0,
      missingUrls: 0,
      byCollection: {}
    };
    
    return {
      stats,
      data: {
        validationReports: reports,
        repairReports
      }
    };
  }
  
  /**
   * Generate audit report
   * @param params Report parameters
   * @returns Audit report data
   */
  private async generateAuditReport(params: GenerateReportParams): Promise<any> {
    // Get admin audit logs
    const auditLogs = await this.getAuditLogs(params);
    
    // Calculate statistics
    const totalLogs = auditLogs.length;
    
    // Count by action
    const byAction: Record<string, number> = {};
    auditLogs.forEach(log => {
      const action = log.action || 'unknown';
      byAction[action] = (byAction[action] || 0) + 1;
    });
    
    // Count by user
    const byUser: Record<string, number> = {};
    auditLogs.forEach(log => {
      const user = log.userId || 'unknown';
      byUser[user] = (byUser[user] || 0) + 1;
    });
    
    return {
      stats: {
        totalLogs,
        byAction,
        byUser
      },
      data: auditLogs.map(log => ({
        id: log.id,
        userId: log.userId,
        userEmail: log.userEmail,
        action: log.action,
        targetId: log.targetId,
        targetType: log.targetType,
        details: log.details,
        timestamp: log.timestamp?.toDate().toISOString() || new Date().toISOString(),
        ipAddress: log.ipAddress
      }))
    };
  }
  
  /**
   * Get user profiles with filters
   * @param params Report parameters
   * @returns User profiles
   */
  private async getUserProfiles(params: GenerateReportParams): Promise<any[]> {
    let query = adminDb.collection('user_profiles');
    
    // Apply filters
    if (params.filters) {
      if (params.filters.role) {
        query = query.where('role', '==', params.filters.role);
      }
      
      if (params.filters.isActive !== undefined && !params.includeInactive) {
        query = query.where('isActive', '==', params.filters.isActive);
      }
    }
    
    // Apply date range
    if (params.dateRange?.start && params.dateRange?.end) {
      const startDate = new Date(params.dateRange.start);
      const endDate = new Date(params.dateRange.end);
      
      query = query.where('createdAt', '>=', startDate)
                  .where('createdAt', '<=', endDate);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
  
  /**
   * Get booking data with filters
   * @param params Report parameters
   * @returns Booking data
   */
  private async getBookingData(params: GenerateReportParams): Promise<any[]> {
    let query = adminDb.collection('bookings');
    
    // Apply filters
    if (params.filters) {
      if (params.filters.status) {
        query = query.where('status', '==', params.filters.status);
      }
      
      if (params.filters.yachtCategory) {
        query = query.where('yachtCategory', '==', params.filters.yachtCategory);
      }
    }
    
    // Apply date range
    if (params.dateRange?.start && params.dateRange?.end) {
      const startDate = new Date(params.dateRange.start);
      const endDate = new Date(params.dateRange.end);
      
      query = query.where('bookingDate', '>=', startDate)
                  .where('bookingDate', '<=', endDate);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
  
  /**
   * Get system alerts with filters
   * @param params Report parameters
   * @returns System alerts
   */
  private async getSystemAlerts(params: GenerateReportParams): Promise<any[]> {
    let query = adminDb.collection('system_alerts');
    
    // Apply filters
    if (params.filters) {
      if (params.filters.status) {
        query = query.where('status', '==', params.filters.status);
      }
      
      if (params.filters.severity) {
        query = query.where('severity', '==', params.filters.severity);
      }
      
      if (params.filters.category) {
        query = query.where('category', '==', params.filters.category);
      }
    }
    
    // Apply date range
    if (params.dateRange?.start && params.dateRange?.end) {
      const startDate = new Date(params.dateRange.start);
      const endDate = new Date(params.dateRange.end);
      
      query = query.where('createdAt', '>=', startDate)
                  .where('createdAt', '<=', endDate);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
  
  /**
   * Get audit logs with filters
   * @param params Report parameters
   * @returns Audit logs
   */
  private async getAuditLogs(params: GenerateReportParams): Promise<any[]> {
    let query = adminDb.collection('admin_audit_logs');
    
    // Apply filters
    if (params.filters) {
      if (params.filters.userId) {
        query = query.where('userId', '==', params.filters.userId);
      }
      
      if (params.filters.action) {
        query = query.where('action', '==', params.filters.action);
      }
      
      if (params.filters.targetType) {
        query = query.where('targetType', '==', params.filters.targetType);
      }
    }
    
    // Apply date range
    if (params.dateRange?.start && params.dateRange?.end) {
      const startDate = new Date(params.dateRange.start);
      const endDate = new Date(params.dateRange.end);
      
      query = query.where('timestamp', '>=', startDate)
                  .where('timestamp', '<=', endDate);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
  
  /**
   * Store report data in Firestore
   * @param reportId Report ID
   * @param data Report data
   * @param format Report format
   */
  private async storeReportData(reportId: string, data: any, format: string): Promise<void> {
    // Store the raw data in Firestore
    await adminDb.collection(REPORT_DATA_COLLECTION).doc(reportId).set({
      data,
      format,
      createdAt: admin.firestore.Timestamp.now()
    });
  }
  
  /**
   * Get a report by ID
   * @param reportId Report ID
   * @returns Report data
   */
  async getReport(reportId: string): Promise<any> {
    // Get report metadata
    const reportDoc = await adminDb.collection(REPORTS_COLLECTION).doc(reportId).get();
    
    if (!reportDoc.exists) {
      throw new Error(`Report not found: ${reportId}`);
    }
    
    // Get report data
    const reportDataDoc = await adminDb.collection(REPORT_DATA_COLLECTION).doc(reportId).get();
    
    if (!reportDataDoc.exists) {
      throw new Error(`Report data not found: ${reportId}`);
    }
    
    const reportData = reportDataDoc.data();
    const reportMeta = reportDoc.data();
    
    return {
      meta: reportMeta,
      data: reportData?.data || {}
    };
  }
  
  /**
   * Get report in requested format
   * @param reportId Report ID
   * @param format Format to return
   * @returns Report data in requested format
   */
  async getReportInFormat(reportId: string, format: string): Promise<{ data: any, contentType: string }> {
    const report = await this.getReport(reportId);
    
    switch (format) {
      case 'json':
        return {
          data: JSON.stringify(report.data, null, 2),
          contentType: 'application/json'
        };
        
      case 'csv':
        return {
          data: this.convertToCSV(report.data),
          contentType: 'text/csv'
        };
        
      default:
        return {
          data: JSON.stringify(report.data, null, 2),
          contentType: 'application/json'
        };
    }
  }
  
  /**
   * Convert report data to CSV format
   * @param data Report data
   * @returns CSV string
   */
  private convertToCSV(data: any): string {
    // If data has a data property with array items, use that
    const items = data.data || [];
    
    if (Array.isArray(items)) {
      // Create CSV stringifier
      const header = Object.keys(items[0] || {}).map(key => ({
        id: key,
        title: key.charAt(0).toUpperCase() + key.slice(1)
      }));
      
      const csvStringifier = createObjectCsvStringifier({ header });
      
      // Convert to CSV
      return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(items);
    } else {
      // Handle nested data
      const flatData: any[] = [];
      
      // Flatten nested data objects
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item: any) => {
            flatData.push({
              section: key,
              ...item
            });
          });
        } else if (typeof value === 'object' && value !== null) {
          flatData.push({
            section: key,
            ...value
          });
        }
      });
      
      // If we have flat data, convert to CSV
      if (flatData.length > 0) {
        const header = Object.keys(flatData[0] || {}).map(key => ({
          id: key,
          title: key.charAt(0).toUpperCase() + key.slice(1)
        }));
        
        const csvStringifier = createObjectCsvStringifier({ header });
        
        return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(flatData);
      }
      
      // Fallback for complex data structures
      return `"Data cannot be converted to CSV format"\n${JSON.stringify(data)}`;
    }
  }
  
  /**
   * List all reports
   * @param limit Maximum number of reports to return
   * @param type Optional filter by report type
   * @returns List of reports
   */
  async listReports(limit: number = 20, type?: string): Promise<any[]> {
    let query = adminDb.collection(REPORTS_COLLECTION)
      .orderBy('createdAt', 'desc');
      
    if (type) {
      query = query.where('type', '==', type);
    }
    
    const snapshot = await query.limit(limit).get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
  
  /**
   * Calculate report size
   * @param data Report data
   * @param format Report format
   * @returns Size string
   */
  private calculateReportSize(data: any, format: string): string {
    const jsonSize = JSON.stringify(data).length;
    
    // Apply format-specific size adjustments
    let size = jsonSize;
    
    switch (format) {
      case 'csv':
        // CSV is typically smaller than JSON
        size = Math.round(jsonSize * 0.7);
        break;
        
      case 'pdf':
        // PDF includes formatting overhead
        size = Math.round(jsonSize * 1.5);
        break;
        
      case 'xlsx':
        // Excel includes formatting overhead
        size = Math.round(jsonSize * 1.3);
        break;
    }
    
    // Format size string
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
  }
  
  /**
   * Generate tags for a report
   * @param params Report parameters
   * @returns Array of tags
   */
  private generateTags(params: GenerateReportParams): string[] {
    const tags: string[] = [params.type];
    
    // Add format tag
    tags.push(params.format);
    
    // Add type-specific tags
    switch (params.type) {
      case 'analytics':
        tags.push('users', 'growth');
        break;
        
      case 'financial':
        tags.push('revenue', 'bookings');
        break;
        
      case 'system':
        tags.push('performance', 'alerts');
        break;
        
      case 'media':
        tags.push('validation', 'images');
        break;
        
      case 'audit':
        tags.push('logs', 'security');
        break;
    }
    
    // Add filter tags
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          tags.push(`${key}-${value}`);
        }
      });
    }
    
    // Add date range tag if present
    if (params.dateRange) {
      const startDate = new Date(params.dateRange.start);
      const endDate = new Date(params.dateRange.end);
      
      const startMonth = startDate.toLocaleString('default', { month: 'short' });
      const endMonth = endDate.toLocaleString('default', { month: 'short' });
      
      tags.push(`${startMonth}-${endMonth}-${endDate.getFullYear()}`);
    }
    
    // Remove duplicates using filter instead of Set
    return tags.filter((tag, index) => tags.indexOf(tag) === index);
  }
}