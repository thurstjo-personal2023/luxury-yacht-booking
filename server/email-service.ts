/**
 * Email Service Module
 * 
 * This module provides functionality for sending emails through the
 * Firestore Send Email extension that's already installed in Firebase.
 * 
 * The extension watches for documents in the 'mail' collection and sends emails
 * based on those documents.
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

// Get a reference to Firestore database
const db = getFirestore();

// Define user roles
export type UserRole = 'consumer' | 'producer' | 'partner';

/**
 * Email service interface defining available methods
 */
export interface EmailService {
  /**
   * Send a booking confirmation email to consumer
   */
  sendBookingConfirmation(options: {
    to: string;
    name: string;
    bookingId: string;
    yachtName: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    location: string;
  }): Promise<string>;
  
  /**
   * Send a booking notification to producer
   */
  sendBookingNotification(options: {
    to: string;
    producerName: string;
    consumerName: string;
    consumerEmail: string;
    bookingId: string;
    yachtName: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
  }): Promise<string>;
  
  /**
   * Send a welcome email to new users
   */
  sendWelcomeEmail(options: {
    to: string;
    name: string;
    role: UserRole;
    businessName?: string; // For producers and partners
  }): Promise<string>;
  
  /**
   * Send a password reset email
   */
  sendPasswordResetEmail(options: {
    to: string;
    name: string;
    resetLink: string;
  }): Promise<string>;
  
  /**
   * Send a yacht listing update notification to subscribers
   */
  sendYachtUpdateNotification(options: {
    to: string[];
    yachtName: string;
    yachtId: string;
    updateType: 'new' | 'update' | 'price_change' | 'availability';
  }): Promise<string[]>;
  
  /**
   * Send verification email for producer/partner account
   */
  sendVerificationEmail(options: {
    to: string;
    name: string;
    businessName: string;
    role: 'producer' | 'partner';
    verificationLink: string;
  }): Promise<string>;
  
  /**
   * Send service add-on approval notification to partner
   */
  sendAddonApprovalNotification(options: {
    to: string;
    partnerName: string;
    businessName: string;
    addonName: string;
    addonId: string;
    status: 'approved' | 'rejected' | 'pending';
    comments?: string;
  }): Promise<string>;
}

/**
 * Implementation of the EmailService interface using Firestore
 */
class FirestoreEmailService implements EmailService {
  /**
   * Send a booking confirmation email to consumer
   */
  async sendBookingConfirmation(options: {
    to: string;
    name: string;
    bookingId: string;
    yachtName: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    location: string;
  }): Promise<string> {
    return this.sendEmail({
      to: options.to,
      template: {
        name: 'booking-confirmation',
        data: {
          name: options.name,
          bookingId: options.bookingId,
          yachtName: options.yachtName,
          startDate: options.startDate,
          endDate: options.endDate,
          totalPrice: options.totalPrice.toFixed(2),
          location: options.location,
          year: new Date().getFullYear().toString(),
        }
      }
    });
  }
  
  /**
   * Send a booking notification to producer
   */
  async sendBookingNotification(options: {
    to: string;
    producerName: string;
    consumerName: string;
    consumerEmail: string;
    bookingId: string;
    yachtName: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
  }): Promise<string> {
    return this.sendEmail({
      to: options.to,
      template: {
        name: 'booking-notification-producer',
        data: {
          producerName: options.producerName,
          consumerName: options.consumerName,
          consumerEmail: options.consumerEmail,
          bookingId: options.bookingId,
          yachtName: options.yachtName,
          startDate: options.startDate,
          endDate: options.endDate,
          totalPrice: options.totalPrice.toFixed(2),
          year: new Date().getFullYear().toString(),
          dashboardUrl: 'https://etoile-yachts.repl.app/dashboard/producer/bookings',
        }
      }
    });
  }
  
  /**
   * Send a welcome email to new users
   */
  async sendWelcomeEmail(options: {
    to: string;
    name: string;
    role: UserRole;
    businessName?: string;
  }): Promise<string> {
    // Determine which welcome template to use based on user role
    let templateName: string;
    const templateData: Record<string, string> = {
      name: options.name,
      role: options.role,
      year: new Date().getFullYear().toString(),
    };
    
    // Set template and additional data based on role
    switch (options.role) {
      case 'consumer':
        templateName = 'welcome-consumer';
        templateData.dashboardUrl = 'https://etoile-yachts.repl.app/dashboard/consumer';
        break;
      case 'producer':
        templateName = 'welcome-producer';
        templateData.businessName = options.businessName || 'your business';
        templateData.dashboardUrl = 'https://etoile-yachts.repl.app/dashboard/producer';
        break;
      case 'partner':
        templateName = 'welcome-partner';
        templateData.businessName = options.businessName || 'your business';
        templateData.dashboardUrl = 'https://etoile-yachts.repl.app/dashboard/partner';
        break;
      default:
        templateName = 'welcome-consumer';
        templateData.dashboardUrl = 'https://etoile-yachts.repl.app/dashboard';
    }
      
    return this.sendEmail({
      to: options.to,
      template: {
        name: templateName,
        data: templateData
      }
    });
  }
  
  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(options: {
    to: string;
    name: string;
    resetLink: string;
  }): Promise<string> {
    return this.sendEmail({
      to: options.to,
      template: {
        name: 'password-reset',
        data: {
          name: options.name,
          resetLink: options.resetLink,
          year: new Date().getFullYear().toString(),
        }
      }
    });
  }
  
  /**
   * Send a yacht listing update notification to subscribers
   */
  async sendYachtUpdateNotification(options: {
    to: string[];
    yachtName: string;
    yachtId: string;
    updateType: 'new' | 'update' | 'price_change' | 'availability';
  }): Promise<string[]> {
    const emailPromises = options.to.map(email => {
      return this.sendEmail({
        to: email,
        template: {
          name: 'yacht-update-notification',
          data: {
            yachtName: options.yachtName,
            yachtUrl: `https://etoile-yachts.repl.app/yachts/${options.yachtId}`,
            updateType: options.updateType,
            year: new Date().getFullYear().toString(),
          }
        }
      });
    });
    
    return Promise.all(emailPromises);
  }
  
  /**
   * Send verification email for producer/partner account
   */
  async sendVerificationEmail(options: {
    to: string;
    name: string;
    businessName: string;
    role: 'producer' | 'partner';
    verificationLink: string;
  }): Promise<string> {
    return this.sendEmail({
      to: options.to,
      template: {
        name: 'account-verification',
        data: {
          name: options.name,
          businessName: options.businessName,
          role: options.role,
          verificationLink: options.verificationLink,
          year: new Date().getFullYear().toString(),
        }
      }
    });
  }
  
  /**
   * Send service add-on approval notification to partner
   */
  async sendAddonApprovalNotification(options: {
    to: string;
    partnerName: string;
    businessName: string;
    addonName: string;
    addonId: string;
    status: 'approved' | 'rejected' | 'pending';
    comments?: string;
  }): Promise<string> {
    return this.sendEmail({
      to: options.to,
      template: {
        name: 'addon-approval-notification',
        data: {
          partnerName: options.partnerName,
          businessName: options.businessName,
          addonName: options.addonName,
          addonId: options.addonId,
          status: options.status,
          comments: options.comments || 'No additional comments provided.',
          dashboardUrl: 'https://etoile-yachts.repl.app/dashboard/partner/addons',
          year: new Date().getFullYear().toString(),
        }
      }
    });
  }
  
  /**
   * Generic method to send email through Firestore
   * 
   * @private
   */
  private async sendEmail(emailData: {
    to: string;
    template: {
      name: string;
      data: Record<string, string>;
    };
  }): Promise<string> {
    try {
      // Create a unique ID for the email document
      const emailId = `mail_${uuidv4()}`;
      
      // Create email document in the 'mail' collection
      // This will trigger the Firestore Send Email extension
      await db.collection('mail').doc(emailId).set({
        to: emailData.to,
        template: emailData.template,
        message: {
          subject: '', // Subject is defined in the template
        },
        created: Timestamp.now(),
      });
      
      console.log(`Email request created with ID: ${emailId}`);
      return emailId;
    } catch (error) {
      console.error('Error creating email request:', error);
      throw new Error('Failed to create email request');
    }
  }
}

// Export a singleton instance of the email service
export const emailService: EmailService = new FirestoreEmailService();