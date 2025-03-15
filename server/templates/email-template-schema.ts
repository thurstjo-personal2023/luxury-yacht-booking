/**
 * Email Templates Schema
 * 
 * This file defines the schema for email templates used by the Firestore Send Email extension.
 * These templates should be stored in the 'emails' collection in Firestore.
 */

// Base email template interface
export interface EmailTemplate {
  subject: string;      // Email subject line
  text?: string;        // Plain text version of the email
  html?: string;        // HTML version of the email
  active?: boolean;     // Whether the template is active (defaults to true)
}

// Templates required for the application
export const REQUIRED_TEMPLATES = [
  'welcome-consumer',
  'welcome-producer',
  'welcome-partner',
  'booking-confirmation',
  'booking-notification-producer',
  'password-reset',
  'yacht-update-notification',
  'account-verification',
  'addon-approval-notification',
];

/**
 * Sample templates for initial setup
 * These could be imported into Firestore using a script
 */
export const SAMPLE_TEMPLATES: Record<string, EmailTemplate> = {
  // Consumer welcome email
  'welcome-consumer': {
    subject: 'Welcome to Etoile Yachts - Start Your Luxury Journey',
    text: `Dear {{name}},

Welcome to Etoile Yachts! We're thrilled to have you join our community of luxury yacht enthusiasts.

As a valued consumer, you now have access to:
- Exclusive yacht booking opportunities
- Premium yacht experiences across the UAE
- Special member-only promotions and offers

Get started by exploring our luxury yacht collection:
{{dashboardUrl}}

If you have any questions or need assistance, our customer support team is always ready to help.

Best regards,
The Etoile Yachts Team

© {{year}} Etoile Yachts. All rights reserved.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Etoile Yachts</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header img { max-width: 200px; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
    .button { display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Etoile Yachts!</h1>
    </div>
    
    <p>Dear {{name}},</p>
    
    <p>We're thrilled to have you join our community of luxury yacht enthusiasts.</p>
    
    <p>As a valued consumer, you now have access to:</p>
    <ul>
      <li>Exclusive yacht booking opportunities</li>
      <li>Premium yacht experiences across the UAE</li>
      <li>Special member-only promotions and offers</li>
    </ul>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" class="button">Explore Our Luxury Yachts</a>
    </p>
    
    <p>If you have any questions or need assistance, our customer support team is always ready to help.</p>
    
    <p>Best regards,<br>
    The Etoile Yachts Team</p>
    
    <div class="footer">
      © {{year}} Etoile Yachts. All rights reserved.
    </div>
  </div>
</body>
</html>`,
    active: true
  },
  
  // Producer welcome email
  'welcome-producer': {
    subject: 'Welcome to Etoile Yachts - Producer Portal Access',
    text: `Dear {{name}},

Welcome to Etoile Yachts Producer Portal! We're excited to have {{businessName}} join our network of premium yacht service providers.

As a producer partner, you now have access to:
- List your luxury yachts and services
- Manage bookings and availability
- Access detailed analytics and reporting
- Connect with high-end clientele

Get started by accessing your producer dashboard:
{{dashboardUrl}}

Your producer account gives you powerful tools to showcase your fleet and grow your business. If you need any assistance with setting up your profile or listing yachts, our partner support team is ready to help.

Best regards,
The Etoile Yachts Team

© {{year}} Etoile Yachts. All rights reserved.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Etoile Yachts Producer Portal</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header img { max-width: 200px; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
    .button { display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Etoile Yachts Producer Portal!</h1>
    </div>
    
    <p>Dear {{name}},</p>
    
    <p>We're excited to have <strong>{{businessName}}</strong> join our network of premium yacht service providers.</p>
    
    <p>As a producer partner, you now have access to:</p>
    <ul>
      <li>List your luxury yachts and services</li>
      <li>Manage bookings and availability</li>
      <li>Access detailed analytics and reporting</li>
      <li>Connect with high-end clientele</li>
    </ul>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" class="button">Access Your Producer Dashboard</a>
    </p>
    
    <p>Your producer account gives you powerful tools to showcase your fleet and grow your business. If you need any assistance with setting up your profile or listing yachts, our partner support team is ready to help.</p>
    
    <p>Best regards,<br>
    The Etoile Yachts Team</p>
    
    <div class="footer">
      © {{year}} Etoile Yachts. All rights reserved.
    </div>
  </div>
</body>
</html>`,
    active: true
  },
  
  // Partner welcome email
  'welcome-partner': {
    subject: 'Welcome to Etoile Yachts - Service Partner Portal',
    text: `Dear {{name}},

Welcome to Etoile Yachts Partner Portal! We're delighted to have {{businessName}} join our exclusive network of premium yacht service partners.

As a service partner, you now have access to:
- List your exclusive services and add-ons
- Connect with yacht owners and producers
- Increase your visibility to luxury clients
- Manage service bookings and appointments

Get started by accessing your partner dashboard:
{{dashboardUrl}}

Your partner account gives you specialized tools to expand your reach in the luxury yacht market. Our partner support team is available to help you optimize your service listings and connect with producers.

Best regards,
The Etoile Yachts Team

© {{year}} Etoile Yachts. All rights reserved.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Etoile Yachts Partner Portal</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header img { max-width: 200px; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
    .button { display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Etoile Yachts Partner Portal!</h1>
    </div>
    
    <p>Dear {{name}},</p>
    
    <p>We're delighted to have <strong>{{businessName}}</strong> join our exclusive network of premium yacht service partners.</p>
    
    <p>As a service partner, you now have access to:</p>
    <ul>
      <li>List your exclusive services and add-ons</li>
      <li>Connect with yacht owners and producers</li>
      <li>Increase your visibility to luxury clients</li>
      <li>Manage service bookings and appointments</li>
    </ul>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" class="button">Access Your Partner Dashboard</a>
    </p>
    
    <p>Your partner account gives you specialized tools to expand your reach in the luxury yacht market. Our partner support team is available to help you optimize your service listings and connect with producers.</p>
    
    <p>Best regards,<br>
    The Etoile Yachts Team</p>
    
    <div class="footer">
      © {{year}} Etoile Yachts. All rights reserved.
    </div>
  </div>
</body>
</html>`,
    active: true
  },
  
  // Booking confirmation email for consumers
  'booking-confirmation': {
    subject: 'Your Yacht Booking Confirmation - Etoile Yachts',
    text: `Dear {{name}},

Thank you for booking with Etoile Yachts! Your luxury yacht experience has been confirmed.

Booking Details:
- Booking ID: {{bookingId}}
- Yacht: {{yachtName}}
- Date: {{startDate}} to {{endDate}}
- Location: {{location}}
- Total: AED {{totalPrice}}

You can view your booking details and make any changes by logging into your account. Our customer service team will contact you before your scheduled date to confirm all arrangements.

If you have any questions or special requests, please don't hesitate to contact us.

We look forward to providing you with an exceptional yacht experience!

Best regards,
The Etoile Yachts Team

© {{year}} Etoile Yachts. All rights reserved.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Yacht Booking Confirmation</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header img { max-width: 200px; }
    .booking-details { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
    .button { display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Confirmation</h1>
    </div>
    
    <p>Dear {{name}},</p>
    
    <p>Thank you for booking with Etoile Yachts! Your luxury yacht experience has been confirmed.</p>
    
    <div class="booking-details">
      <h2>Booking Details</h2>
      <p><strong>Booking ID:</strong> {{bookingId}}</p>
      <p><strong>Yacht:</strong> {{yachtName}}</p>
      <p><strong>Date:</strong> {{startDate}} to {{endDate}}</p>
      <p><strong>Location:</strong> {{location}}</p>
      <p><strong>Total:</strong> AED {{totalPrice}}</p>
    </div>
    
    <p>You can view your booking details and make any changes by logging into your account. Our customer service team will contact you before your scheduled date to confirm all arrangements.</p>
    
    <p>If you have any questions or special requests, please don't hesitate to contact us.</p>
    
    <p>We look forward to providing you with an exceptional yacht experience!</p>
    
    <p>Best regards,<br>
    The Etoile Yachts Team</p>
    
    <div class="footer">
      © {{year}} Etoile Yachts. All rights reserved.
    </div>
  </div>
</body>
</html>`,
    active: true
  },
  
  // Booking notification for producers
  'booking-notification-producer': {
    subject: 'New Yacht Booking Notification - Etoile Yachts',
    text: `Dear {{producerName}},

You have received a new booking for your yacht on Etoile Yachts!

Booking Details:
- Booking ID: {{bookingId}}
- Yacht: {{yachtName}}
- Date: {{startDate}} to {{endDate}}
- Total: AED {{totalPrice}}

Customer Information:
- Name: {{consumerName}}
- Email: {{consumerEmail}}

Please log in to your producer dashboard to view and manage this booking:
{{dashboardUrl}}

Remember to contact the customer before the scheduled date to confirm all arrangements and special requests.

If you have any questions, please contact our producer support team.

Thank you for partnering with Etoile Yachts!

Best regards,
The Etoile Yachts Team

© {{year}} Etoile Yachts. All rights reserved.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Yacht Booking Notification</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header img { max-width: 200px; }
    .booking-details { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .customer-info { background-color: #e6f7ff; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
    .button { display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Booking Notification</h1>
    </div>
    
    <p>Dear {{producerName}},</p>
    
    <p>You have received a new booking for your yacht on Etoile Yachts!</p>
    
    <div class="booking-details">
      <h2>Booking Details</h2>
      <p><strong>Booking ID:</strong> {{bookingId}}</p>
      <p><strong>Yacht:</strong> {{yachtName}}</p>
      <p><strong>Date:</strong> {{startDate}} to {{endDate}}</p>
      <p><strong>Total:</strong> AED {{totalPrice}}</p>
    </div>
    
    <div class="customer-info">
      <h2>Customer Information</h2>
      <p><strong>Name:</strong> {{consumerName}}</p>
      <p><strong>Email:</strong> {{consumerEmail}}</p>
    </div>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" class="button">Manage This Booking</a>
    </p>
    
    <p>Remember to contact the customer before the scheduled date to confirm all arrangements and special requests.</p>
    
    <p>If you have any questions, please contact our producer support team.</p>
    
    <p>Thank you for partnering with Etoile Yachts!</p>
    
    <p>Best regards,<br>
    The Etoile Yachts Team</p>
    
    <div class="footer">
      © {{year}} Etoile Yachts. All rights reserved.
    </div>
  </div>
</body>
</html>`,
    active: true
  },
  
  // Password reset email
  'password-reset': {
    subject: 'Password Reset Request - Etoile Yachts',
    text: `Dear {{name}},

We received a request to reset your Etoile Yachts account password. Please click on the link below to reset your password:

{{resetLink}}

This link will expire in 24 hours. If you did not request a password reset, please ignore this email or contact our support team if you have concerns.

Best regards,
The Etoile Yachts Team

© {{year}} Etoile Yachts. All rights reserved.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header img { max-width: 200px; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
    .button { display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    
    <p>Dear {{name}},</p>
    
    <p>We received a request to reset your Etoile Yachts account password. Please click on the button below to reset your password:</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{resetLink}}" class="button">Reset Your Password</a>
    </p>
    
    <p>This link will expire in 24 hours. If you did not request a password reset, please ignore this email or contact our support team if you have concerns.</p>
    
    <p>Best regards,<br>
    The Etoile Yachts Team</p>
    
    <div class="footer">
      © {{year}} Etoile Yachts. All rights reserved.
    </div>
  </div>
</body>
</html>`,
    active: true
  },
  
  // Yacht update notification
  'yacht-update-notification': {
    subject: 'Yacht Update Notification - Etoile Yachts',
    text: `Hello,

We want to inform you about an update to a yacht you've shown interest in on Etoile Yachts.

The yacht "{{yachtName}}" has been {{updateType}}.

You can view the yacht details here:
{{yachtUrl}}

If you have any questions or would like to book this yacht, please don't hesitate to contact us.

Best regards,
The Etoile Yachts Team

© {{year}} Etoile Yachts. All rights reserved.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yacht Update Notification</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header img { max-width: 200px; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
    .button { display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Yacht Update Notification</h1>
    </div>
    
    <p>Hello,</p>
    
    <p>We want to inform you about an update to a yacht you've shown interest in on Etoile Yachts.</p>
    
    <p>The yacht <strong>"{{yachtName}}"</strong> has been 
      {{#eq updateType "new"}}newly added to our collection{{/eq}}
      {{#eq updateType "update"}}updated with new information{{/eq}}
      {{#eq updateType "price_change"}}updated with new pricing{{/eq}}
      {{#eq updateType "availability"}}updated with new availability{{/eq}}
    .</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{yachtUrl}}" class="button">View Yacht Details</a>
    </p>
    
    <p>If you have any questions or would like to book this yacht, please don't hesitate to contact us.</p>
    
    <p>Best regards,<br>
    The Etoile Yachts Team</p>
    
    <div class="footer">
      © {{year}} Etoile Yachts. All rights reserved.
    </div>
  </div>
</body>
</html>`,
    active: true
  },
  
  // Account verification email
  'account-verification': {
    subject: 'Verify Your Etoile Yachts {{role}} Account',
    text: `Dear {{name}},

Thank you for registering your business "{{businessName}}" as a {{role}} on Etoile Yachts. To complete your registration and unlock full access to the platform, please verify your account by clicking the link below:

{{verificationLink}}

This verification step ensures the security of our platform and helps us maintain high standards for all our partners.

After verification, you'll be able to:
- Create and manage yacht listings
- Access booking management tools
- Connect with potential customers
- Use all our premium producer features

If you have any questions or need assistance, please contact our partner support team.

Best regards,
The Etoile Yachts Team

© {{year}} Etoile Yachts. All rights reserved.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Etoile Yachts Account</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header img { max-width: 200px; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
    .button { display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Account Verification</h1>
    </div>
    
    <p>Dear {{name}},</p>
    
    <p>Thank you for registering your business <strong>"{{businessName}}"</strong> as a {{role}} on Etoile Yachts. To complete your registration and unlock full access to the platform, please verify your account by clicking the button below:</p>
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{verificationLink}}" class="button">Verify Your Account</a>
    </p>
    
    <p>This verification step ensures the security of our platform and helps us maintain high standards for all our partners.</p>
    
    <p>After verification, you'll be able to:</p>
    <ul>
      <li>Create and manage yacht listings</li>
      <li>Access booking management tools</li>
      <li>Connect with potential customers</li>
      <li>Use all our premium producer features</li>
    </ul>
    
    <p>If you have any questions or need assistance, please contact our partner support team.</p>
    
    <p>Best regards,<br>
    The Etoile Yachts Team</p>
    
    <div class="footer">
      © {{year}} Etoile Yachts. All rights reserved.
    </div>
  </div>
</body>
</html>`,
    active: true
  },
  
  // Add-on approval notification
  'addon-approval-notification': {
    subject: 'Your Add-on Service Status Update - Etoile Yachts',
    text: `Dear {{partnerName}},

This is a notification regarding your add-on service "{{addonName}}" for {{businessName}} on Etoile Yachts.

Status: {{status}}
{{#if comments}}
Comments: {{comments}}
{{/if}}

You can view and manage your add-on services in your partner dashboard:
{{dashboardUrl}}

If you have any questions or need further clarification, please contact our partner support team.

Thank you for partnering with Etoile Yachts!

Best regards,
The Etoile Yachts Team

© {{year}} Etoile Yachts. All rights reserved.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Add-on Service Status Update</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header img { max-width: 200px; }
    .status-approved { background-color: #e6f7e6; padding: 20px; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0; }
    .status-rejected { background-color: #fbe9e7; padding: 20px; border-radius: 5px; border-left: 4px solid #dc3545; margin: 20px 0; }
    .status-pending { background-color: #fff3cd; padding: 20px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0; }
    .comments { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
    .button { display: inline-block; background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Add-on Service Status Update</h1>
    </div>
    
    <p>Dear {{partnerName}},</p>
    
    <p>This is a notification regarding your add-on service <strong>"{{addonName}}"</strong> for {{businessName}} on Etoile Yachts.</p>
    
    {{#eq status "approved"}}
    <div class="status-approved">
      <h2>Status: Approved</h2>
      <p>Congratulations! Your add-on service has been approved and is now live on our platform. Customers can now book this service as an add-on to their yacht experiences.</p>
    </div>
    {{/eq}}
    
    {{#eq status "rejected"}}
    <div class="status-rejected">
      <h2>Status: Rejected</h2>
      <p>We regret to inform you that your add-on service has not been approved at this time. Please review the comments below for more information on why this decision was made.</p>
    </div>
    {{/eq}}
    
    {{#eq status "pending"}}
    <div class="status-pending">
      <h2>Status: Pending Review</h2>
      <p>Your add-on service is currently under review by our team. We'll notify you as soon as a decision has been made.</p>
    </div>
    {{/eq}}
    
    {{#if comments}}
    <div class="comments">
      <h3>Review Comments:</h3>
      <p>{{comments}}</p>
    </div>
    {{/if}}
    
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{dashboardUrl}}" class="button">Manage Your Add-ons</a>
    </p>
    
    <p>If you have any questions or need further clarification, please contact our partner support team.</p>
    
    <p>Thank you for partnering with Etoile Yachts!</p>
    
    <p>Best regards,<br>
    The Etoile Yachts Team</p>
    
    <div class="footer">
      © {{year}} Etoile Yachts. All rights reserved.
    </div>
  </div>
</body>
</html>`,
    active: true
  }
};

/**
 * Function to check if an email template is valid and contains all required fields
 */
export function isValidEmailTemplate(template: any): template is EmailTemplate {
  return (
    template &&
    typeof template === 'object' &&
    typeof template.subject === 'string' &&
    (template.text !== undefined || template.html !== undefined)
  );
}

/**
 * Function to validate the required email templates
 */
export function validateRequiredTemplates(templates: Record<string, any>): { 
  valid: boolean; 
  missing: string[]; 
  invalid: string[];
} {
  const missing: string[] = [];
  const invalid: string[] = [];
  
  for (const templateName of REQUIRED_TEMPLATES) {
    if (!templates[templateName]) {
      missing.push(templateName);
    } else if (!isValidEmailTemplate(templates[templateName])) {
      invalid.push(templateName);
    }
  }
  
  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid
  };
}