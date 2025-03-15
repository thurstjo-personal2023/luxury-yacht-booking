/**
 * Initialize Email Templates Script
 * 
 * This script uploads email template definitions to Firestore.
 * It checks for existing templates and only adds missing ones.
 */

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { REQUIRED_TEMPLATES, SAMPLE_TEMPLATES, validateRequiredTemplates } from '../server/templates/email-template-schema';

// Initialize Firebase Admin if not already initialized
let app: admin.app.App;
try {
  app = admin.app();
} catch (e) {
  const serviceAccount = require('../firebase-data-connect.json');
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Get Firestore instance
const db = getFirestore(app);

/**
 * Initialize email templates in Firestore
 */
async function initializeEmailTemplates() {
  console.log('Initializing email templates in Firestore...');
  
  try {
    // Get existing templates from Firestore
    const templatesCollection = db.collection('mail_templates');
    const snapshot = await templatesCollection.get();
    
    const existingTemplates: Record<string, any> = {};
    snapshot.forEach((doc) => {
      existingTemplates[doc.id] = doc.data();
    });
    
    console.log(`Found ${Object.keys(existingTemplates).length} existing templates in Firestore.`);
    
    // Validate existing templates
    const validationResults = validateRequiredTemplates(existingTemplates);
    
    if (validationResults.valid) {
      console.log('All required templates already exist and are valid.');
      return;
    }
    
    // Report missing or invalid templates
    if (validationResults.missing.length > 0) {
      console.log(`Missing templates: ${validationResults.missing.join(', ')}`);
    }
    
    if (validationResults.invalid.length > 0) {
      console.log(`Invalid templates: ${validationResults.invalid.join(', ')}`);
    }
    
    // Add missing templates
    const missingTemplates = [...validationResults.missing, ...validationResults.invalid];
    
    console.log(`Adding ${missingTemplates.length} templates to Firestore...`);
    
    const batch = db.batch();
    
    for (const templateName of missingTemplates) {
      if (SAMPLE_TEMPLATES[templateName]) {
        const templateDoc = templatesCollection.doc(templateName);
        batch.set(templateDoc, SAMPLE_TEMPLATES[templateName]);
        console.log(`Added template: ${templateName}`);
      } else {
        console.warn(`Warning: No sample template found for ${templateName}`);
      }
    }
    
    await batch.commit();
    console.log('Email templates initialized successfully.');
  } catch (error) {
    console.error('Error initializing email templates:', error);
    throw error;
  }
}

// Run the initialization
initializeEmailTemplates()
  .then(() => {
    console.log('Email template initialization completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Email template initialization failed:', error);
    process.exit(1);
  });