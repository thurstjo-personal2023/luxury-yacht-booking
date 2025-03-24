import axios from 'axios';

/**
 * Admin Notification Service
 * 
 * This service handles notifications for admin users during the registration
 * and approval process.
 */

/**
 * Notification Type Enum
 */
export enum NotificationType {
  APPROVAL_REQUESTED = 'approval_requested',
  APPROVAL_APPROVED = 'approval_approved',
  APPROVAL_REJECTED = 'approval_rejected',
  EMAIL_VERIFIED = 'email_verified',
  PHONE_VERIFIED = 'phone_verified',
  MFA_ENABLED = 'mfa_enabled',
  REGISTRATION_COMPLETE = 'registration_complete'
}

/**
 * Notification Interface
 */
export interface AdminNotification {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Create a notification for an admin user
 * @param notification Notification object
 * @returns Created notification
 */
export async function createAdminNotification(notification: Omit<AdminNotification, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminNotification> {
  try {
    const response = await axios.post('/api/admin/notifications', notification);
    return response.data;
  } catch (error) {
    console.error('Error creating admin notification:', error);
    throw error;
  }
}

/**
 * Get notifications for an admin user
 * @param userId User ID
 * @param limit Maximum number of notifications to return
 * @returns List of notifications
 */
export async function getAdminNotifications(userId: string, limit: number = 10): Promise<AdminNotification[]> {
  try {
    const response = await axios.get(`/api/admin/notifications/${userId}?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error getting admin notifications:', error);
    throw error;
  }
}

/**
 * Mark a notification as read
 * @param notificationId Notification ID
 * @returns Success status
 */
export async function markNotificationRead(notificationId: string): Promise<{ success: boolean }> {
  try {
    const response = await axios.post(`/api/admin/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Create an approval requested notification for super admins
 * @param adminId Admin user ID
 * @param adminName Admin user name
 * @returns Created notification
 */
export async function createApprovalRequestedNotification(
  adminId: string,
  adminName: string
): Promise<AdminNotification | null> {
  try {
    // This will be sent to super admins by the server
    const response = await axios.post('/api/admin/notifications/approval-requested', {
      adminId,
      adminName
    });
    return response.data;
  } catch (error) {
    console.error('Error creating approval requested notification:', error);
    return null;
  }
}

/**
 * Create an approval status notification for an admin
 * @param userId Admin user ID
 * @param approved Whether the admin was approved or rejected
 * @returns Created notification
 */
export async function createApprovalStatusNotification(
  userId: string,
  approved: boolean
): Promise<AdminNotification | null> {
  try {
    const type = approved ? NotificationType.APPROVAL_APPROVED : NotificationType.APPROVAL_REJECTED;
    const title = approved ? 'Account Approved' : 'Account Rejected';
    const message = approved 
      ? 'Your administrator account has been approved. You can now set up multi-factor authentication.'
      : 'Your administrator account request has been rejected. Please contact support for more information.';
    const actionUrl = approved ? `/admin-mfa-setup/${userId}` : '/admin-login';
    
    const notification: Omit<AdminNotification, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      type,
      title,
      message,
      read: false,
      actionUrl
    };
    
    return await createAdminNotification(notification);
  } catch (error) {
    console.error('Error creating approval status notification:', error);
    return null;
  }
}

/**
 * Create a verification completed notification
 * @param userId Admin user ID
 * @param verificationType Type of verification completed
 * @returns Created notification
 */
export async function createVerificationNotification(
  userId: string,
  verificationType: 'email' | 'phone' | 'mfa'
): Promise<AdminNotification | null> {
  try {
    let type: NotificationType;
    let title: string;
    let message: string;
    let actionUrl: string;
    
    switch (verificationType) {
      case 'email':
        type = NotificationType.EMAIL_VERIFIED;
        title = 'Email Verified';
        message = 'Your email has been successfully verified. Please continue with phone verification.';
        actionUrl = `/admin-phone-verification/${userId}`;
        break;
      case 'phone':
        type = NotificationType.PHONE_VERIFIED;
        title = 'Phone Verified';
        message = 'Your phone number has been successfully verified. Your account is now pending approval.';
        actionUrl = `/admin-pending-approval/${userId}`;
        break;
      case 'mfa':
        type = NotificationType.MFA_ENABLED;
        title = 'MFA Enabled';
        message = 'Multi-factor authentication has been successfully enabled for your account. Your registration is now complete.';
        actionUrl = '/admin-dashboard';
        break;
      default:
        return null;
    }
    
    const notification: Omit<AdminNotification, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      type,
      title,
      message,
      read: false,
      actionUrl
    };
    
    return await createAdminNotification(notification);
  } catch (error) {
    console.error('Error creating verification notification:', error);
    return null;
  }
}

/**
 * Create a registration completed notification
 * @param userId Admin user ID
 * @returns Created notification
 */
export async function createRegistrationCompleteNotification(
  userId: string
): Promise<AdminNotification | null> {
  try {
    const notification: Omit<AdminNotification, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      type: NotificationType.REGISTRATION_COMPLETE,
      title: 'Registration Complete',
      message: 'Your administrator account registration is now complete. You can now access the admin dashboard.',
      read: false,
      actionUrl: '/admin-dashboard'
    };
    
    return await createAdminNotification(notification);
  } catch (error) {
    console.error('Error creating registration complete notification:', error);
    return null;
  }
}