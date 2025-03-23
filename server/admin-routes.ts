/**
 * Admin Routes
 * 
 * This module registers admin-specific routes for the Express server.
 * These routes are protected by admin authentication and provide administrative functionality.
 */
import { Request, Response, Express, NextFunction } from 'express';
import { verifyAuth, adminDb } from './firebase-admin';
import validateImageUrls from '../scripts/validate-images';
// Import will be loaded dynamically to avoid initialization issues
// import { validateMediaUrls, saveMediaValidationResults } from '../scripts/validate-media';

// Global state to track media validation/repair progress
const mediaValidationState = {
  isValidating: false,
  isRepairing: false,
  validationProgress: { total: 0, processed: 0 },
  repairProgress: { total: 0, processed: 0 },
  lastValidationId: '',  // Use empty string instead of null
  lastRepairId: ''       // Use empty string instead of null
};

// Middleware to verify admin role
export const verifyAdminAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First use standard auth verification
    await verifyAuth(req, res, async () => {
      // Then check if user has admin role
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Check if user has admin role
      // Currently checking for 'producer' role, but could be changed to 'admin' in the future
      if (user.role !== 'producer') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
      
      // User is authenticated and has admin role
      next();
    });
  } catch (error) {
    console.error('Error in admin authentication:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

/**
 * Register admin-related routes
 */
export function registerAdminRoutes(app: Express) {
  /**
   * Run image validation across all collections
   * This endpoint validates all image URLs in the system
   */
  app.get('/api/admin/validate-images', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log('Starting image validation via admin API...');
      
      // Run the validation
      const results = await validateImageUrls();
      
      // Return summary results
      res.json({
        success: true,
        timestamp: results.timestamp,
        stats: results.stats,
        sampleIssues: {
          invalid: results.invalid.slice(0, 5),
          missing: results.missing.slice(0, 5)
        }
      });
    } catch (error) {
      console.error('Error running image validation:', error);
      res.status(500).json({ error: 'Failed to validate images' });
    }
  });

  /**
   * Get detailed validation results for a specific report
   */
  app.get('/api/admin/image-validation/:reportId', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;
      
      // Get the report from Firestore
      const reportDoc = await adminDb.collection('image_validation_reports').doc(reportId).get();
      
      if (!reportDoc.exists) {
        return res.status(404).json({ error: 'Report not found' });
      }
      
      // Return the report data
      res.json(reportDoc.data());
    } catch (error) {
      console.error('Error fetching validation report:', error);
      res.status(500).json({ error: 'Failed to fetch validation report' });
    }
  });

  /**
   * Get list of validation reports
   */
  app.get('/api/admin/image-validation-reports', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get the reports from Firestore, sorted by createdAt
      const reportsSnapshot = await adminDb.collection('image_validation_reports')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      // Map to array of reports
      const reports = reportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Return the reports
      res.json({ reports });
    } catch (error) {
      console.error('Error fetching validation reports:', error);
      res.status(500).json({ error: 'Failed to fetch validation reports' });
    }
  });

  /**
   * Run media validation across all collections
   * This endpoint validates both images and videos
   */
  app.post('/api/admin/validate-media', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log('Starting media validation via admin API...');
      
      // Update validation state to indicate validation is in progress
      mediaValidationState.isValidating = true;
      mediaValidationState.validationProgress = { total: 100, processed: 0 }; // Initial estimate
      
      // Import the validation function dynamically
      const { validateMediaUrls, saveMediaValidationResults } = await import('../scripts/validate-media');
      
      // Start validation in background to prevent timeout
      res.json({
        success: true,
        message: 'Media validation started',
        inProgress: true
      });
      
      // Get the validation function dynamically
      let resultPromise;
      try {
        // Execute validation (we'll need to modify the validateMediaUrls function later to accept a callback)
        resultPromise = validateMediaUrls();
        
        // Start progress tracking in background
        let processedCount = 0;
        const interval = setInterval(() => {
          processedCount += 5; // Simulate progress
          if (processedCount > 95) processedCount = 95; // Cap at 95% until complete
          mediaValidationState.validationProgress = { total: 100, processed: processedCount };
        }, 1000);
        
        // Wait for validation to complete
        const results = await resultPromise;
        clearInterval(interval);
        
        // Mark as 100% complete
        mediaValidationState.validationProgress = { total: 100, processed: 100 };
        
        // Save results to Firestore
        const reportId = await saveMediaValidationResults(results);
        
        // Update validation state
        mediaValidationState.isValidating = false;
        mediaValidationState.lastValidationId = reportId;
      } catch (error) {
        // Handle errors during validation
        mediaValidationState.isValidating = false;
        throw error;
      }
      
      console.log(`Media validation completed with report ID: ${mediaValidationState.lastValidationId}`);
    } catch (error) {
      console.error('Error running media validation:', error);
      // Reset validation state on error
      mediaValidationState.isValidating = false;
      mediaValidationState.validationProgress = { total: 0, processed: 0 };
    }
  });
  
  /**
   * Get the validation status for backward compatibility
   */
  app.get('/api/admin/validate-media', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      // Return the current validation state
      res.json({
        success: true,
        isValidating: mediaValidationState.isValidating,
        progress: mediaValidationState.validationProgress,
        lastValidationId: mediaValidationState.lastValidationId
      });
    } catch (error) {
      console.error('Error getting media validation status:', error);
      res.status(500).json({ error: 'Failed to get validation status' });
    }
  });

  /**
   * Get detailed media validation results for a specific report
   */
  app.get('/api/admin/media-validation/:reportId', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;
      
      // Get the report from Firestore
      const reportDoc = await adminDb.collection('media_validation_reports').doc(reportId).get();
      
      if (!reportDoc.exists) {
        return res.status(404).json({ error: 'Report not found' });
      }
      
      // Return the report data
      res.json(reportDoc.data());
    } catch (error) {
      console.error('Error fetching media validation report:', error);
      res.status(500).json({ error: 'Failed to fetch media validation report' });
    }
  });

  /**
   * Get list of media validation reports
   */
  app.get('/api/admin/media-validation-reports', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get the reports from Firestore, sorted by createdAt
      const reportsSnapshot = await adminDb.collection('media_validation_reports')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      // Map to array of reports with proper format expected by the client
      const reports = reportsSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Ensure we have a valid report structure that the frontend expects
        const processedReport: any = {
          id: doc.id,
          ...data,
        };
        
        // Make sure errors or invalid is an array
        if (!processedReport.errors && !processedReport.invalid) {
          console.log(`Adding missing errors array to report ${doc.id}`);
          processedReport.errors = [];
        } else if (processedReport.errors && !Array.isArray(processedReport.errors)) {
          console.log(`Converting errors to array in report ${doc.id}`);
          processedReport.errors = [];
        } else if (processedReport.invalid && !Array.isArray(processedReport.invalid)) {
          console.log(`Converting invalid to array in report ${doc.id}`);
          processedReport.invalid = [];
        }
        
        // Ensure stats object exists
        if (!processedReport.stats) {
          processedReport.stats = {
            imageCount: 0,
            videoCount: 0,
            invalidUrls: 0,
            byCollection: {}
          };
        }
        
        // Log the processed report for debugging
        console.log(`Processed report ${doc.id}:`, {
          hasErrors: !!processedReport.errors && Array.isArray(processedReport.errors),
          hasInvalid: !!processedReport.invalid && Array.isArray(processedReport.invalid),
          stats: processedReport.stats
        });
        
        return processedReport;
      });
      
      // Return the reports
      res.json({ reports });
    } catch (error) {
      console.error('Error fetching media validation reports:', error);
      res.status(500).json({ error: 'Failed to fetch media validation reports' });
    }
  });

  /**
   * Repair broken URLs identified in the latest validation report
   * This endpoint will replace broken URLs with placeholders
   */
  app.post('/api/admin/repair-broken-urls', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log(`[${new Date().toISOString()}] Starting broken URL repair via admin API...`);
      
      // Import the repair function dynamically
      const { repairAllBrokenUrls } = await import('../scripts/repair-broken-urls');
      
      // Run repair operation with improved logging
      console.log(`[${new Date().toISOString()}] Executing repairAllBrokenUrls function...`);
      const report = await repairAllBrokenUrls();
      console.log(`[${new Date().toISOString()}] Broken URL repair operation completed successfully`);
      
      // Return success response with report
      res.json({
        success: true,
        report
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] Error repairing broken URLs:`, errorMessage);
      res.status(500).json({ 
        error: 'Failed to repair broken URLs', 
        details: errorMessage 
      });
    }
  });

  /**
   * Get list of URL repair reports
   */
  app.get('/api/admin/url-repair-reports', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get the reports from Firestore, sorted by createdAt
      const reportsSnapshot = await adminDb.collection('url_repair_reports')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      // Map to array of reports
      const reports = reportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Return the reports
      res.json({ reports });
    } catch (error) {
      console.error('Error fetching URL repair reports:', error);
      res.status(500).json({ error: 'Failed to fetch URL repair reports' });
    }
  });

  /**
   * Resolve blob URLs in the database
   * This endpoint will replace blob:// URLs with placeholders
   */
  app.post('/api/admin/resolve-blob-urls', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log(`[${new Date().toISOString()}] Starting blob URL resolution via admin API...`);
      
      // Import the resolve function from our ES module
      // Using the new blob-url-resolver.mjs module which properly handles Firebase Admin initialization
      const { resolveAllBlobUrls } = await import('../scripts/blob-url-resolver.mjs');
      
      // Run resolution operation with improved logging
      console.log(`[${new Date().toISOString()}] Executing resolveAllBlobUrls function...`);
      const report = await resolveAllBlobUrls();
      console.log(`[${new Date().toISOString()}] Blob URL resolution operation completed successfully`);
      
      // Return success response with report
      res.json({
        success: true,
        report
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] Error resolving blob URLs:`, errorMessage);
      res.status(500).json({ 
        error: 'Failed to resolve blob URLs', 
        details: errorMessage,
        stack: error.stack // Include stack trace for debugging
      });
    }
  });

  /**
   * Get list of blob URL resolution reports
   */
  app.get('/api/admin/blob-url-reports', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get the reports from Firestore, sorted by timestamp
      // Updated to use the correct collection name that matches our implementation
      const reportsSnapshot = await adminDb.collection('blob_url_reports')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
      
      // Map to array of reports with expected structure
      const reports = reportsSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Ensure reports have the expected structure for the client
        // If resolvedUrls is missing, provide an empty array
        if (!data.resolvedUrls) {
          console.log(`Adding missing resolvedUrls array to report ${doc.id}`);
          data.resolvedUrls = [];
        }
        
        // If totalIdentified or totalResolved is missing, use appropriate values
        if (data.totalIdentified === undefined) {
          data.totalIdentified = data.totalBlobUrlsFound || 0;
        }
        
        if (data.totalResolved === undefined) {
          data.totalResolved = data.totalBlobUrlsReplaced || 0;
        }
        
        return {
          id: doc.id,
          ...data
        };
      });
      
      // Return the reports
      res.json({ reports });
    } catch (error) {
      console.error('Error fetching blob URL resolution reports:', error);
      res.status(500).json({ error: 'Failed to fetch blob URL resolution reports' });
    }
  });
  
  /**
   * Fix relative URLs in the database
   * This endpoint will replace relative image/video URLs with absolute URLs
   */
  app.post('/api/admin/fix-relative-urls', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log(`[${new Date().toISOString()}] Starting relative URL fix via admin API...`);
      
      // Import the fix function dynamically
      const { fixRelativeUrls } = await import('../scripts/fix-relative-urls');
      
      // Run fix operation with improved logging
      console.log(`[${new Date().toISOString()}] Executing fixRelativeUrls function...`);
      const report = await fixRelativeUrls();
      console.log(`[${new Date().toISOString()}] Relative URL fix operation completed successfully`);
      
      // Return success response with report
      res.json({
        success: true,
        report
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] Error fixing relative URLs:`, errorMessage);
      res.status(500).json({ 
        error: 'Failed to fix relative URLs', 
        details: errorMessage 
      });
    }
  });
  
  /**
   * Get list of relative URL fix reports
   */
  app.get('/api/admin/relative-url-reports', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get the reports from Firestore, sorted by createdAt
      const reportsSnapshot = await adminDb.collection('relative_url_reports')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      // Map to array of reports
      const reports = reportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Return the reports
      res.json({ reports });
    } catch (error) {
      console.error('Error fetching relative URL fix reports:', error);
      res.status(500).json({ error: 'Failed to fetch relative URL fix reports' });
    }
  });

  /**
   * Run the media validation test suite
   * This endpoint will run a comprehensive test of our media validation and repair tools
   */
  app.post('/api/admin/test-media-validation', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log(`[${new Date().toISOString()}] Starting media validation test via admin API...`);
      
      // Import the test function dynamically
      const { runMediaValidationTest } = await import('../scripts/test-validation-media');
      
      // Run the test with improved logging
      console.log(`[${new Date().toISOString()}] Executing runMediaValidationTest function...`);
      const results = await runMediaValidationTest();
      console.log(`[${new Date().toISOString()}] Media validation test completed successfully`);
      
      // Return success response with results
      res.json({
        success: true,
        results,
        message: `Media validation test completed with ${results.successRate}% success rate`
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${new Date().toISOString()}] Error running media validation test:`, errorMessage);
      res.status(500).json({ 
        error: 'Failed to run media validation test', 
        details: errorMessage 
      });
    }
  });
  
  /**
   * Get list of media validation test reports
   */
  app.get('/api/admin/media-validation-tests', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get the test reports from Firestore, sorted by timestamp
      const reportsSnapshot = await adminDb.collection('media_validation_tests')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
      
      // Map to array of reports
      const tests = reportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Return the reports
      res.json({ tests });
    } catch (error) {
      console.error('Error fetching media validation test reports:', error);
      res.status(500).json({ error: 'Failed to fetch media validation test reports' });
    }
  });
  
  /**
   * Get current media validation status
   * Returns whether validation or repair is currently in progress
   */
  app.get('/api/admin/media-validation-status', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      // Return the current validation state
      res.json({
        isValidating: mediaValidationState.isValidating,
        isRepairing: mediaValidationState.isRepairing,
        lastValidationId: mediaValidationState.lastValidationId,
        lastRepairId: mediaValidationState.lastRepairId
      });
    } catch (error) {
      console.error('Error getting media validation status:', error);
      res.status(500).json({ error: 'Failed to get validation status' });
    }
  });

  /**
   * Get current validation progress
   * Returns the progress of an ongoing validation
   */
  app.get('/api/admin/validation-progress', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      // Return the current validation progress
      res.json(mediaValidationState.validationProgress);
    } catch (error) {
      console.error('Error getting validation progress:', error);
      res.status(500).json({ error: 'Failed to get validation progress' });
    }
  });

  /**
   * Get current repair progress
   * Returns the progress of an ongoing repair operation
   */
  app.get('/api/admin/repair-progress', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      // Return the current repair progress
      res.json(mediaValidationState.repairProgress);
    } catch (error) {
      console.error('Error getting repair progress:', error);
      res.status(500).json({ error: 'Failed to get repair progress' });
    }
  });

  /**
   * Fix all media issues (relative URLs and media type mismatches)
   * This is a comprehensive fix that addresses problems with both images and videos
   */
  app.post('/api/admin/fix-media-issues', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log(`[${new Date().toISOString()}] Starting media issues repair via admin API...`);
      
      // Update repair state to indicate repair is in progress
      mediaValidationState.isRepairing = true;
      mediaValidationState.repairProgress = { total: 100, processed: 0 }; // Initial estimate
      
      // Dynamic import to avoid initialization issues
      const { fixMediaIssues, saveRepairResults } = await import('../scripts/fix-media-issues');
      
      // Start repair in background to prevent timeout
      res.json({
        success: true,
        message: 'Media repair started',
        inProgress: true
      });
      
      // Get the repair function dynamically
      let resultPromise;
      try {
        // Execute repair (we'll need to modify the fixMediaIssues function later to accept a callback)
        resultPromise = fixMediaIssues();
        
        // Start progress tracking in background
        let processedCount = 0;
        const interval = setInterval(() => {
          processedCount += 5; // Simulate progress
          if (processedCount > 95) processedCount = 95; // Cap at 95% until complete
          mediaValidationState.repairProgress = { total: 100, processed: processedCount };
        }, 1000);
        
        // Wait for repair to complete
        const results = await resultPromise;
        clearInterval(interval);
        
        // Mark as 100% complete
        mediaValidationState.repairProgress = { total: 100, processed: 100 };
        
        // Save results to Firestore
        const reportId = await saveRepairResults(results);
        
        // Update repair state as complete
        mediaValidationState.isRepairing = false;
        // Set the ID as an actual string value, not null
        if (reportId) {
          mediaValidationState.lastRepairId = reportId;
        }
      } catch (error) {
        // Handle errors during repair
        mediaValidationState.isRepairing = false;
        throw error;
      }
      
      console.log(`Media repair completed with report ID: ${mediaValidationState.lastRepairId}`);
    } catch (error) {
      console.error('Error fixing media issues:', error);
      // Reset repair state on error
      mediaValidationState.isRepairing = false;
      mediaValidationState.repairProgress = { total: 0, processed: 0 };
    }
  });
  
  /**
   * Get list of media repair reports
   * This endpoint retrieves the history of media fixes performed by the system
   */
  app.get('/api/admin/media-repair-reports', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get the reports from Firestore, sorted by timestamp
      const reportsSnapshot = await adminDb.collection('media_validation_reports')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();
      
      // Map to array of reports
      const reports = reportsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.timestamp.toDate().toISOString(),
          collection: data.collection,
          documentId: data.documentId,
          stats: {
            relativeUrlsFixed: data.fixes?.relativeUrls?.length || 0,
            mediaTypesFixed: data.fixes?.mediaTypes?.length || 0
          },
          collectionsScanned: 1, // Each report is for a single document
          fixes: {
            relativeUrls: data.fixes?.relativeUrls || [],
            mediaTypes: data.fixes?.mediaTypes || []
          }
        };
      });
      
      // Return the reports
      res.json({ reports });
    } catch (error) {
      console.error('Error fetching media repair reports:', error);
      res.status(500).json({ error: 'Failed to fetch media repair reports' });
    }
  });
}