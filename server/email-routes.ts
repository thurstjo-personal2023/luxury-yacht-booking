/**
 * Email API Routes
 * 
 * This module registers email-related routes for the Express server.
 * These routes allow the application to trigger emails through the Firestore Send Email extension.
 */

import { Express, Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { emailService } from './email-service';
import { verifyAuth } from './firebase-admin';

/**
 * Register email-related routes
 */
export function registerEmailRoutes(app: Express) {
  /**
   * Send a welcome email to newly registered user
   * This can be called after a successful registration
   */
  app.post('/api/email/welcome', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      
      const { role, businessName } = req.body;
      
      if (!role) {
        return res.status(400).json({ success: false, error: 'Missing required field: role' });
      }
      
      // Send the welcome email based on role
      const emailId = await emailService.sendWelcomeEmail({
        to: req.user.email || '',
        name: req.user.name || 'User',
        role: role,
        businessName: businessName,
      });
      
      res.status(200).json({ success: true, emailId });
    } catch (error) {
      console.error('Error sending welcome email:', error);
      res.status(500).json({ success: false, error: 'Failed to send welcome email' });
    }
  });

  /**
   * Send a booking confirmation email to a consumer
   * This should be called after a successful booking
   */
  app.post('/api/email/booking-confirmation', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      
      const { 
        bookingId, 
        yachtName, 
        startDate, 
        endDate, 
        totalPrice,
        location,
        producerEmail // Used to also notify the producer
      } = req.body;
      
      // Validate required fields
      if (!bookingId || !yachtName || !startDate || !endDate || !totalPrice || !location) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required booking details' 
        });
      }
      
      // Send confirmation email to the consumer
      const consumerEmailId = await emailService.sendBookingConfirmation({
        to: req.user.email || '',
        name: req.user.name || 'User',
        bookingId,
        yachtName,
        startDate,
        endDate,
        totalPrice,
        location
      });
      
      let producerEmailId = null;
      
      // If a producer email is provided, also send a notification to the producer
      if (producerEmail) {
        // Get producer details from Firebase Auth if possible
        let producerName = 'Producer';
        try {
          const producerRecord = await getAuth().getUserByEmail(producerEmail);
          producerName = producerRecord.displayName || 'Producer';
        } catch (e) {
          console.warn(`Could not get producer details for ${producerEmail}:`, e);
        }
        
        // Send notification to producer
        producerEmailId = await emailService.sendBookingNotification({
          to: producerEmail,
          producerName,
          consumerName: req.user.name || 'Customer',
          consumerEmail: req.user.email || '',
          bookingId,
          yachtName,
          startDate,
          endDate,
          totalPrice
        });
      }
      
      res.status(200).json({ 
        success: true, 
        consumerEmailId,
        producerEmailId
      });
    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send booking confirmation email' 
      });
    }
  });

  /**
   * Send a password reset email
   * Note: This might not be needed if using Firebase Auth's built-in password reset
   */
  app.post('/api/email/password-reset', async (req: Request, res: Response) => {
    try {
      const { email, resetLink } = req.body;
      
      if (!email || !resetLink) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: email, resetLink' 
        });
      }
      
      // Try to get user details from Firebase Auth
      let userName = 'User';
      try {
        const userRecord = await getAuth().getUserByEmail(email);
        userName = userRecord.displayName || 'User';
      } catch (e) {
        console.warn(`Could not get user details for ${email}:`, e);
      }
      
      // Send password reset email
      const emailId = await emailService.sendPasswordResetEmail({
        to: email,
        name: userName,
        resetLink
      });
      
      res.status(200).json({ success: true, emailId });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send password reset email' 
      });
    }
  });

  /**
   * Send verification emails to producers/partners
   * This should be used when a producer/partner account needs verification
   */
  app.post('/api/email/verification', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      
      const { businessName, role, verificationLink } = req.body;
      
      if (!businessName || !role || !verificationLink) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
      }
      
      if (role !== 'producer' && role !== 'partner') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid role. Must be "producer" or "partner"' 
        });
      }
      
      // Send verification email
      const emailId = await emailService.sendVerificationEmail({
        to: req.user.email || '',
        name: req.user.name || 'User',
        businessName,
        role,
        verificationLink
      });
      
      res.status(200).json({ success: true, emailId });
    } catch (error) {
      console.error('Error sending verification email:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send verification email' 
      });
    }
  });

  /**
   * Send yacht listing update notifications to subscribers
   * This can be used when a yacht listing is created, updated, or changes availability
   */
  app.post('/api/email/yacht-update', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      
      const { yachtName, yachtId, updateType, subscriberEmails } = req.body;
      
      if (!yachtName || !yachtId || !updateType || !subscriberEmails || !Array.isArray(subscriberEmails)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields or invalid format' 
        });
      }
      
      // Validate update type
      const validUpdateTypes = ['new', 'update', 'price_change', 'availability'];
      if (!validUpdateTypes.includes(updateType)) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid updateType. Must be one of: ${validUpdateTypes.join(', ')}` 
        });
      }
      
      // Send notifications to all subscribers
      const emailIds = await emailService.sendYachtUpdateNotification({
        to: subscriberEmails,
        yachtName,
        yachtId,
        updateType
      });
      
      res.status(200).json({ 
        success: true, 
        emailCount: emailIds.length,
        emailIds 
      });
    } catch (error) {
      console.error('Error sending yacht update notifications:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send yacht update notifications' 
      });
    }
  });

  /**
   * Send add-on approval notification to partners
   * This should be used when a partner's add-on is approved, rejected, or pending review
   */
  app.post('/api/email/addon-approval', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      
      // Ensure user is an admin or has appropriate permissions
      // You may want to implement a more comprehensive role check here
      
      const { partnerEmail, partnerName, businessName, addonName, addonId, status, comments } = req.body;
      
      if (!partnerEmail || !partnerName || !businessName || !addonName || !addonId || !status) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
      }
      
      // Validate status
      const validStatuses = ['approved', 'rejected', 'pending'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }
      
      // Send approval notification
      const emailId = await emailService.sendAddonApprovalNotification({
        to: partnerEmail,
        partnerName,
        businessName,
        addonName,
        addonId,
        status,
        comments
      });
      
      res.status(200).json({ success: true, emailId });
    } catch (error) {
      console.error('Error sending add-on approval notification:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send add-on approval notification' 
      });
    }
  });

  /**
   * Send a test email (for development/testing purposes only)
   * This endpoint should be disabled or restricted in production
   */
  app.post('/api/email/test', verifyAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      
      const { template } = req.body;
      
      if (!template) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required field: template' 
        });
      }
      
      let emailId: string;
      
      // Send test email for the specified template
      switch (template) {
        case 'welcome':
          emailId = await emailService.sendWelcomeEmail({
            to: req.user.email || '',
            name: req.user.name || 'Test User',
            role: 'consumer'
          });
          break;
          
        case 'booking':
          emailId = await emailService.sendBookingConfirmation({
            to: req.user.email || '',
            name: req.user.name || 'Test User',
            bookingId: 'TEST-BOOKING-123',
            yachtName: 'Test Yacht',
            startDate: '2025-04-01',
            endDate: '2025-04-05',
            totalPrice: 1999.99,
            location: 'Dubai Marina'
          });
          break;
          
        case 'reset':
          emailId = await emailService.sendPasswordResetEmail({
            to: req.user.email || '',
            name: req.user.name || 'Test User',
            resetLink: 'https://etoile-yachts.repl.app/reset-password?token=test-token'
          });
          break;
          
        default:
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid template type. Must be one of: welcome, booking, reset' 
          });
      }
      
      res.status(200).json({ 
        success: true, 
        message: `Test email sent for template: ${template}`,
        emailId
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send test email' 
      });
    }
  });
  
  // Log that email routes have been registered
  console.log('Email routes registered successfully');
}