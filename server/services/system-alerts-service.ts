/**
 * System Alerts Service
 * 
 * This service manages system alerts for the admin dashboard,
 * providing functionality to create, update, and query alerts.
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Firestore,
  Timestamp,
  serverTimestamp,
  DocumentReference,
} from 'firebase/firestore';

import { SystemAlert, CreateSystemAlertParams, AlertStatus } from '../../shared/schema';
import { db } from '../firebase-admin';

const COLLECTION_NAME = 'system_alerts';

export class SystemAlertsService {
  private db: Firestore;
  
  constructor(firestore: Firestore = db) {
    this.db = firestore;
  }

  /**
   * Create a new system alert
   * 
   * @param alertData Alert data to create
   * @returns Created alert with ID
   */
  async createAlert(alertData: CreateSystemAlertParams): Promise<SystemAlert> {
    try {
      const alertsCollection = collection(this.db, COLLECTION_NAME);
      
      const newAlert = {
        ...alertData,
        status: AlertStatus.ACTIVE,
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(alertsCollection, newAlert);
      
      const createdAlert = {
        id: docRef.id,
        ...alertData,
        status: AlertStatus.ACTIVE,
        createdAt: Timestamp.now(),
      } as SystemAlert;
      
      return createdAlert;
    } catch (error) {
      console.error('Error creating system alert:', error);
      throw new Error('Failed to create system alert');
    }
  }

  /**
   * Get all system alerts with optional filtering
   * 
   * @param options Query options (status, category, severity)
   * @returns Array of alerts
   */
  async getAlerts(options: {
    status?: AlertStatus | AlertStatus[];
    category?: string | string[];
    severity?: string | string[];
    limit?: number;
  } = {}): Promise<SystemAlert[]> {
    try {
      const alertsCollection = collection(this.db, COLLECTION_NAME);
      
      let alertsQuery = query(
        alertsCollection,
        orderBy('createdAt', 'desc')
      );
      
      // Apply status filter if provided
      if (options.status) {
        const statuses = Array.isArray(options.status) ? options.status : [options.status];
        alertsQuery = query(
          alertsQuery,
          where('status', 'in', statuses)
        );
      }
      
      // Apply limit if provided
      if (options.limit) {
        alertsQuery = query(
          alertsQuery,
          limit(options.limit)
        );
      }
      
      const querySnapshot = await getDocs(alertsQuery);
      
      const alerts: SystemAlert[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        alerts.push({
          id: doc.id,
          ...data,
        } as SystemAlert);
      });
      
      return alerts;
    } catch (error) {
      console.error('Error fetching system alerts:', error);
      throw new Error('Failed to fetch system alerts');
    }
  }

  /**
   * Get active alerts (those that need attention)
   * 
   * @param limit Maximum number of alerts to return
   * @returns Array of active alerts
   */
  async getActiveAlerts(limit = 10): Promise<SystemAlert[]> {
    return this.getAlerts({
      status: AlertStatus.ACTIVE,
      limit,
    });
  }

  /**
   * Get a specific alert by ID
   * 
   * @param alertId Alert ID
   * @returns Alert data or null if not found
   */
  async getAlertById(alertId: string): Promise<SystemAlert | null> {
    try {
      const alertRef = doc(this.db, COLLECTION_NAME, alertId);
      const alertSnap = await getDoc(alertRef);
      
      if (!alertSnap.exists()) {
        return null;
      }
      
      return {
        id: alertSnap.id,
        ...alertSnap.data(),
      } as SystemAlert;
    } catch (error) {
      console.error(`Error fetching alert ${alertId}:`, error);
      throw new Error(`Failed to fetch alert ${alertId}`);
    }
  }

  /**
   * Update an alert's status
   * 
   * @param alertId Alert ID
   * @param status New status
   * @param userId User ID making the change
   * @returns Updated alert
   */
  async updateAlertStatus(
    alertId: string,
    status: AlertStatus,
    userId: string
  ): Promise<SystemAlert | null> {
    try {
      const alertRef = doc(this.db, COLLECTION_NAME, alertId);
      const alertSnap = await getDoc(alertRef);
      
      if (!alertSnap.exists()) {
        return null;
      }
      
      const updateData: Record<string, any> = {
        status,
        updatedAt: serverTimestamp(),
      };
      
      // Add appropriate timestamp and user fields based on the status
      if (status === AlertStatus.ACKNOWLEDGED) {
        updateData.acknowledgedBy = userId;
        updateData.acknowledgedAt = serverTimestamp();
      } else if (status === AlertStatus.RESOLVED) {
        updateData.resolvedBy = userId;
        updateData.resolvedAt = serverTimestamp();
      }
      
      await updateDoc(alertRef, updateData);
      
      // Get the updated document
      const updatedAlertSnap = await getDoc(alertRef);
      
      return {
        id: updatedAlertSnap.id,
        ...updatedAlertSnap.data(),
      } as SystemAlert;
    } catch (error) {
      console.error(`Error updating alert ${alertId}:`, error);
      throw new Error(`Failed to update alert ${alertId}`);
    }
  }

  /**
   * Acknowledge an alert
   * 
   * @param alertId Alert ID
   * @param userId User ID acknowledging the alert
   * @returns Updated alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<SystemAlert | null> {
    return this.updateAlertStatus(alertId, AlertStatus.ACKNOWLEDGED, userId);
  }

  /**
   * Resolve an alert
   * 
   * @param alertId Alert ID
   * @param userId User ID resolving the alert
   * @returns Updated alert
   */
  async resolveAlert(alertId: string, userId: string): Promise<SystemAlert | null> {
    return this.updateAlertStatus(alertId, AlertStatus.RESOLVED, userId);
  }

  /**
   * Dismiss an alert
   * 
   * @param alertId Alert ID
   * @param userId User ID dismissing the alert
   * @returns Updated alert
   */
  async dismissAlert(alertId: string, userId: string): Promise<SystemAlert | null> {
    return this.updateAlertStatus(alertId, AlertStatus.DISMISSED, userId);
  }

  /**
   * Create a system error alert from an error object
   * 
   * @param error Error object
   * @param category Alert category
   * @param metadata Additional metadata
   * @returns Created alert
   */
  async createErrorAlert(
    error: Error,
    category: string = 'system',
    metadata: Record<string, any> = {}
  ): Promise<SystemAlert> {
    const alertData: CreateSystemAlertParams = {
      title: `System Error: ${error.name || 'Unknown Error'}`,
      message: error.message || 'An unknown error occurred',
      severity: 'error',
      category: category as any,
      metadata: {
        stack: error.stack,
        ...metadata,
      },
    };
    
    return this.createAlert(alertData);
  }
}