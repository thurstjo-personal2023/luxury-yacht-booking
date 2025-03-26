import { Timestamp } from "firebase/firestore";

/**
 * System Alert Model
 * 
 * Represents a system alert to notify administrators about system events,
 * issues, or required actions.
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

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

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

export interface AlertAction {
  label: string;
  action: string;
  url?: string;
  confirmationMessage?: string;
}

export interface SystemAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  status: AlertStatus;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  acknowledgedBy?: string;
  acknowledgedAt?: Timestamp;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  relatedEntity?: {
    type: string;
    id: string;
  };
  metadata?: Record<string, any>;
  actions?: AlertAction[];
}

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

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface Media {
  type: 'image' | 'video';
  url: string;
}

export interface Yacht {
  id: string;
  name: string;
  description: string;
  capacity: number;
  price: number;
  imageUrl: string;
  location: Location;
  features: string[];
  available: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Booking {
  id: string;
  yachtId: string;
  userId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Timestamp;
}

// Updated UserRole enum to use proper TypeScript enum syntax
export enum UserRole {
  CONSUMER = "consumer",
  PRODUCER = "producer",
  PARTNER = "partner"
}

export type UserRoleType = UserRole;