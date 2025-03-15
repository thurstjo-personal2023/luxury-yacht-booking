import axios from 'axios';
import { auth } from '@/lib/firebase';

/**
 * Email template types available for testing
 */
export type EmailTemplateType = 'welcome' | 'booking' | 'reset';

/**
 * Get authentication token for API requests
 * 
 * @returns Promise that resolves with the token or null if not authenticated
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('User must be authenticated to send emails');
      return null;
    }
    
    return await currentUser.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Send a test email of the specified template type
 * 
 * @param templateType The type of email template to test
 * @returns Promise that resolves when the email is sent
 */
export async function sendTestEmail(templateType: EmailTemplateType): Promise<void> {
  try {
    const token = await getAuthToken();
    
    const response = await axios.post('/api/email/test', {
      templateType,
    }, {
      headers: token ? {
        'Authorization': `Bearer ${token}`
      } : undefined
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to send test email: ${response.data.message || 'Unknown error'}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error sending test email:', error);
    throw error;
  }
}

/**
 * Send a welcome email to a newly registered user
 * 
 * @param email User's email address
 * @param name User's name
 * @param role User's role (consumer, producer, or partner)
 * @param businessName Optional business name for producers and partners
 * @returns Promise that resolves when the email is sent
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  role: 'consumer' | 'producer' | 'partner',
  businessName?: string
): Promise<void> {
  try {
    const token = await getAuthToken();
    
    const response = await axios.post('/api/email/welcome', {
      email,
      name,
      role,
      businessName,
    }, {
      headers: token ? {
        'Authorization': `Bearer ${token}`
      } : undefined
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to send welcome email: ${response.data.message || 'Unknown error'}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
}

/**
 * Send a booking confirmation email to a user
 * 
 * @param email User's email address
 * @param name User's name
 * @param bookingDetails Details of the booking
 * @returns Promise that resolves when the email is sent
 */
export async function sendBookingConfirmation(
  email: string,
  name: string,
  bookingDetails: {
    bookingId: string;
    yachtName: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    location: string;
  }
): Promise<void> {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      console.warn('Authentication required to send booking confirmation email');
      throw new Error('Authentication required to send booking confirmation email');
    }
    
    const response = await axios.post('/api/email/booking-confirmation', {
      to: email,
      name,
      ...bookingDetails,
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to send booking confirmation: ${response.data.message || 'Unknown error'}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    throw error;
  }
}

/**
 * Send a password reset email to a user
 * 
 * @param email User's email address
 * @param name User's name
 * @param resetLink Password reset link
 * @returns Promise that resolves when the email is sent
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetLink: string
): Promise<void> {
  try {
    const token = await getAuthToken();
    
    const response = await axios.post('/api/email/password-reset', {
      to: email,
      name,
      resetLink,
    }, {
      headers: token ? {
        'Authorization': `Bearer ${token}`
      } : undefined
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to send password reset email: ${response.data.message || 'Unknown error'}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}