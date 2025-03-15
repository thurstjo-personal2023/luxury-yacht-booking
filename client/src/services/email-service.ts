/**
 * Email Service Client
 * 
 * This module provides client-side functions to interact with the email API endpoints.
 * It can be used throughout the application to send various email notifications.
 */

import axios from 'axios';

// Helper function to make API requests
async function makeApiRequest(url: string, data: any) {
  try {
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error(`Error with request to ${url}:`, error);
    throw error;
  }
}

/**
 * Send a welcome email to a newly registered user
 */
export async function sendWelcomeEmail(role: 'consumer' | 'producer' | 'partner', businessName?: string) {
  try {
    return await makeApiRequest('/api/email/welcome', {
      role,
      businessName
    });
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
    return await makeApiRequest('/api/email/booking-confirmation', options);
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
    return await makeApiRequest('/api/email/password-reset', {
      email,
      resetLink
    });
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
    return await makeApiRequest('/api/email/verification', options);
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
    return await makeApiRequest('/api/email/yacht-update', options);
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
    return await makeApiRequest('/api/email/addon-approval', options);
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
    return await makeApiRequest('/api/email/test', {
      template
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
}