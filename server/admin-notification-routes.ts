import { Router, Request, Response } from 'express';
import { adminDb, adminAuth } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { verifyAuth, verifyAdminRole, verifySuperAdminRole } from './middleware/auth-middleware';

const router = Router();

/**
 * Create a notification
 * This endpoint creates a notification for an administrator
 */
router.post('/api/admin/notifications', async (req: Request, res: Response) => {
  try {
    const { userId, type, title, message, actionUrl } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Create notification
    const notificationRef = adminDb.collection('admin_notifications').doc();
    await notificationRef.set({
      userId,
      type,
      title,
      message,
      read: false,
      actionUrl: actionUrl || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      id: notificationRef.id,
      userId,
      type,
      title,
      message,
      read: false,
      actionUrl: actionUrl || null,
    });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create notification',
    });
  }
});

/**
 * Get notifications for a user
 * This endpoint returns notifications for a specific user
 */
router.get('/api/admin/notifications/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string || '10');

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Get notifications for user
    const notificationsRef = adminDb.collection('admin_notifications');
    const notificationsQuery = notificationsRef
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    const notificationsSnapshot = await notificationsQuery.get();
    const notifications: any[] = [];

    notificationsSnapshot.forEach(doc => {
      const notification = doc.data();

      // Format the response
      const formattedNotification: Record<string, any> = {
        id: doc.id,
        ...notification,
      };

      // Convert timestamps to ISO strings
      for (const [key, value] of Object.entries(formattedNotification)) {
        if (value instanceof Timestamp) {
          formattedNotification[key] = value.toDate().toISOString();
        }
      }

      notifications.push(formattedNotification);
    });

    return res.json(notifications);
  } catch (error: any) {
    console.error('Error getting notifications:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get notifications',
    });
  }
});

/**
 * Mark notification as read
 * This endpoint marks a notification as read
 */
router.post('/api/admin/notifications/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'Notification ID is required',
      });
    }

    // Get notification
    const notificationRef = adminDb.collection('admin_notifications').doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Mark as read
    await notificationRef.update({
      read: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark notification as read',
    });
  }
});

/**
 * Create approval requested notification for super admins
 * This endpoint creates notifications for all super admins about a new approval request
 */
router.post('/api/admin/notifications/approval-requested', async (req: Request, res: Response) => {
  try {
    const { adminId, adminName } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required',
      });
    }

    // Find all super admins
    const superAdminsQuery = adminDb.collection('admin_profiles').where('role', '==', 'super_admin');
    const superAdminsSnapshot = await superAdminsQuery.get();

    if (superAdminsSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'No super admins found',
      });
    }

    // Create a notification for each super admin
    const batch = adminDb.batch();
    const notificationIds: string[] = [];

    superAdminsSnapshot.forEach(doc => {
      const superAdminId = doc.id;
      const notificationRef = adminDb.collection('admin_notifications').doc();
      notificationIds.push(notificationRef.id);

      batch.set(notificationRef, {
        userId: superAdminId,
        type: 'approval_requested',
        title: 'New Administrator Approval Request',
        message: `${adminName || 'A new administrator'} has requested approval for their account.`,
        read: false,
        actionUrl: '/admin-approve',
        adminId: adminId, // Store the ID of the admin who requested approval
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    return res.json({
      success: true,
      message: 'Approval request notifications created',
      notificationIds,
    });
  } catch (error: any) {
    console.error('Error creating approval request notifications:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create approval request notifications',
    });
  }
});

/**
 * Get unread notification count
 * This endpoint returns the count of unread notifications for a user
 */
router.get('/api/admin/notifications/:userId/unread-count', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Get unread notifications count
    const notificationsRef = adminDb.collection('admin_notifications');
    const unreadQuery = notificationsRef
      .where('userId', '==', userId)
      .where('read', '==', false);

    const unreadSnapshot = await unreadQuery.get();
    const unreadCount = unreadSnapshot.size;

    return res.json({
      success: true,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Error getting unread notification count:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get unread notification count',
    });
  }
});

export default router;