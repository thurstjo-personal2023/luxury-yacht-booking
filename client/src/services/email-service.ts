import axios from 'axios';

/**
 * Email template types available for testing
 */
export type EmailTemplateType = 'welcome' | 'booking' | 'reset';

/**
 * Send a test email of the specified template type
 * 
 * @param templateType The type of email template to test
 * @returns Promise that resolves when the email is sent
 */
export async function sendTestEmail(templateType: EmailTemplateType): Promise<void> {
  try {
    const response = await axios.post('/api/email/test', {
      templateType,
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
    const response = await axios.post('/api/email/welcome', {
      email,
      name,
      role,
      businessName,
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
    const response = await axios.post('/api/email/booking-confirmation', {
      to: email,
      name,
      ...bookingDetails,
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
    const response = await axios.post('/api/email/password-reset', {
      to: email,
      name,
      resetLink,
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