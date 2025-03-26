/**
 * System Alerts Types
 * 
 * Type definitions for system alerts.
 */

// Alert severity levels
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Alert categories
export enum AlertCategory {
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  STORAGE = 'storage',
  DATABASE = 'database',
  MEDIA = 'media',
  USER = 'user',
  PAYMENT = 'payment',
  BOOKING = 'booking',
  OTHER = 'other'
}

// Alert status
export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

// Alert action
export interface AlertAction {
  label: string;
  action: string;
  url?: string;
  confirmationMessage?: string;
}

// System alert
export interface SystemAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  status: AlertStatus;
  createdAt: string | Date;
  updatedAt?: string | Date;
  acknowledgedBy?: string;
  acknowledgedAt?: string | Date;
  resolvedBy?: string;
  resolvedAt?: string | Date;
  relatedEntity?: {
    type: string;
    id: string;
  };
  metadata?: Record<string, any>;
  actions?: AlertAction[];
}

// Params for creating a new system alert
export interface CreateSystemAlertParams {
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  relatedEntity?: {
    type: string;
    id: string;
  };
  metadata?: Record<string, any>;
  actions?: AlertAction[];
}