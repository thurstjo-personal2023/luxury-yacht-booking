/**
 * Email Service Client
 * 
 * This module provides client-side functions to interact with the email API endpoints.
 * It can be used throughout the application to send various email notifications.
 */

import { apiRequest } from '@/lib/queryClient';

/**
 * Send a welcome email to a newly registered user
 */
export async function sendWelcomeEmail(role: 'consumer' | 'producer' | 'partner', businessName?: string) {
  try {
    const response = await apiRequest('/api/email/welcome', {
      method: 'POST',
      data: {
        role,
        businessName
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
}

/**
 * Send a booking confirmation email to a customer
 * with optional notification to the producer
 */
export async function sendBookingConfirmationEmail(options: {
  bookingId: string;
  yachtName: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  location: string;
  producerEmail?: string; // Optional producer email for notification
}) {
  try {
    const response = await apiRequest('/api/email/booking-confirmation', {
      method: 'POST',
      data: options
    });
    return response.data;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    throw error;
  }
}

/**
 * Send a password reset email
 * Note: This might not be needed if using Firebase Auth's built-in password reset
 */
export async function sendPasswordResetEmail(email: string, resetLink: string) {
  try {
    const response = await apiRequest('/api/email/password-reset', {
      method: 'POST',
      data: {
        email,
        resetLink
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

/**
 * Send a verification email to a producer/partner
 */
export async function sendVerificationEmail(options: {
  businessName: string;
  role: 'producer' | 'partner';
  verificationLink: string;
}) {
  try {
    const response = await apiRequest('/api/email/verification', {
      method: 'POST',
      data: options
    });
    return response.data;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

/**
 * Send yacht update notifications to subscribers
 */
export async function sendYachtUpdateNotifications(options: {
  yachtName: string;
  yachtId: string;
  updateType: 'new' | 'update' | 'price_change' | 'availability';
  subscriberEmails: string[];
}) {
  try {
    const response = await apiRequest('/api/email/yacht-update', {
      method: 'POST',
      data: options
    });
    return response.data;
  } catch (error) {
    console.error('Error sending yacht update notifications:', error);
    throw error;
  }
}

/**
 * Send add-on approval notification to a partner
 */
export async function sendAddonApprovalNotification(options: {
  partnerEmail: string;
  partnerName: string;
  businessName: string;
  addonName: string;
  addonId: string;
  status: 'approved' | 'rejected' | 'pending';
  comments?: string;
}) {
  try {
    const response = await apiRequest('/api/email/addon-approval', {
      method: 'POST',
      data: options
    });
    return response.data;
  } catch (error) {
    console.error('Error sending add-on approval notification:', error);
    throw error;
  }
}

/**
 * Send a test email (for development/testing purposes only)
 */
export async function sendTestEmail(template: 'welcome' | 'booking' | 'reset') {
  try {
    const response = await apiRequest('/api/email/test', {
      method: 'POST',
      data: {
        template
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
}