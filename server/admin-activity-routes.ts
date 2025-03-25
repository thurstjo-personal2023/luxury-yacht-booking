/**
 * Admin Activity Routes
 * 
 * This file contains routes for tracking and retrieving admin activity logs.
 * These logs provide an audit trail of administrative actions in the system.
 */
import express, { Request, Response } from 'express';
import { adminDb } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { verifyAdminRole } from './middleware/auth-middleware';

const router = express.Router();

/**
 * Activity Log Types
 */
export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATE_ADMIN = 'create_admin',
  UPDATE_ADMIN = 'update_admin',
  DISABLE_ADMIN = 'disable_admin',
  ENABLE_ADMIN = 'enable_admin',
  APPROVE_ADMIN = 'approve_admin',
  REJECT_ADMIN = 'reject_admin',
  SEND_INVITATION = 'send_invitation',
  VIEW_ADMIN_DETAILS = 'view_admin_details',
  REPAIR_MEDIA = 'repair_media',
  VALIDATE_MEDIA = 'validate_media',
  SYSTEM_SETTINGS = 'system_settings',
  OTHER = 'other'
}

/**
 * Create activity log
 * 
 * POST /api/admin/activity
 * Creates a new activity log entry
 */
router.post('/activity', verifyAdminRole, async (req: Request, res: Response) => {
  try {
    const { type, details, targetId, targetType } = req.body;
    const adminId = req.user?.uid;
    const adminEmail = req.user?.email;
    const adminRole = req.user?.adminRole;

    if (!type || !adminId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const activityLog = {
      type,
      adminId,
      adminEmail,
      adminRole,
      details: details || null,
      targetId: targetId || null,
      targetType: targetType || null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
      timestamp: FieldValue.serverTimestamp()
    };

    const result = await adminDb.collection('admin_activity_logs').add(activityLog);

    return res.status(201).json({
      success: true,
      activityId: result.id
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
    return res.status(500).json({ error: 'Failed to create activity log' });
  }
});

/**
 * Get activity logs
 * 
 * GET /api/admin/activity
 * Retrieves activity logs with pagination, filtering, and sorting
 */
router.get('/activity', verifyAdminRole, async (req: Request, res: Response) => {
  try {
    const adminRole = req.user?.adminRole;
    
    // Only super admins and admins can access all logs
    if (adminRole !== 'super_admin' && adminRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Parse query parameters
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string;
    const adminId = req.query.adminId as string;
    const targetId = req.query.targetId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
    const sortDirection = req.query.sortDir === 'asc' ? 'asc' : 'desc';

    // Build query
    let query = adminDb.collection('admin_activity_logs');
    
    // Apply filters
    if (type) {
      query = query.where('type', '==', type);
    }
    
    if (adminId) {
      query = query.where('adminId', '==', adminId);
    }
    
    if (targetId) {
      query = query.where('targetId', '==', targetId);
    }
    
    if (startDate) {
      query = query.where('timestamp', '>=', Timestamp.fromDate(startDate));
    }
    
    if (endDate) {
      // Add one day to include the entire end date
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query = query.where('timestamp', '<', Timestamp.fromDate(nextDay));
    }
    
    // Apply sorting
    query = query.orderBy('timestamp', sortDirection === 'asc' ? 'asc' : 'desc');
    
    // Get total count for pagination
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    
    // Get paginated results
    const snapshot = await query.limit(limit).offset(offset).get();
    
    const activities = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null
      };
    });
    
    return res.status(200).json({
      activities,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + activities.length < total
      }
    });
  } catch (error) {
    console.error('Error retrieving activity logs:', error);
    return res.status(500).json({ error: 'Failed to retrieve activity logs' });
  }
});

/**
 * Get activity log by ID
 * 
 * GET /api/admin/activity/:id
 * Retrieves a specific activity log entry
 */
router.get('/activity/:id', verifyAdminRole, async (req: Request, res: Response) => {
  try {
    const adminRole = req.user?.adminRole;
    
    // Only super admins and admins can access logs
    if (adminRole !== 'super_admin' && adminRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const activityId = req.params.id;
    const docSnapshot = await adminDb.collection('admin_activity_logs').doc(activityId).get();
    
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: 'Activity log not found' });
    }
    
    const data = docSnapshot.data();
    return res.status(200).json({
      id: docSnapshot.id,
      ...data,
      timestamp: data?.timestamp ? data.timestamp.toDate().toISOString() : null
    });
  } catch (error) {
    console.error('Error retrieving activity log:', error);
    return res.status(500).json({ error: 'Failed to retrieve activity log' });
  }
});

/**
 * Get activity summary
 * 
 * GET /api/admin/activity/summary
 * Retrieves a summary of activity counts by type and time period
 */
router.get('/activity/summary', verifyAdminRole, async (req: Request, res: Response) => {
  try {
    const adminRole = req.user?.adminRole;
    
    // Only super admins and admins can access summaries
    if (adminRole !== 'super_admin' && adminRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get last 30 days activities
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const snapshot = await adminDb.collection('admin_activity_logs')
      .where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo))
      .get();
    
    // Count by type
    const countByType: Record<string, number> = {};
    
    // Count by date (for timeline)
    const countByDate: Record<string, number> = {};
    
    // Count by admin
    const countByAdmin: Record<string, number> = {};
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      const type = data.type || 'unknown';
      const adminId = data.adminId || 'unknown';
      
      // Count by type
      countByType[type] = (countByType[type] || 0) + 1;
      
      // Count by admin
      countByAdmin[adminId] = (countByAdmin[adminId] || 0) + 1;
      
      // Count by date
      if (data.timestamp) {
        const date = data.timestamp.toDate().toISOString().split('T')[0];
        countByDate[date] = (countByDate[date] || 0) + 1;
      }
    });
    
    return res.status(200).json({
      total: snapshot.size,
      byType: countByType,
      byDate: countByDate,
      byAdmin: countByAdmin
    });
  } catch (error) {
    console.error('Error retrieving activity summary:', error);
    return res.status(500).json({ error: 'Failed to retrieve activity summary' });
  }
});

export default router;