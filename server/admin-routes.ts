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
  app.get('/api/admin/validate-media', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log('Starting media validation via admin API...');
      
      // Import the validation function dynamically
      const { validateMediaUrls, saveMediaValidationResults } = await import('../scripts/validate-media');
      
      // Run validation
      const results = await validateMediaUrls();
      
      // Save results to Firestore
      const reportId = await saveMediaValidationResults(results);
      
      // Return summary results
      res.json({
        success: true,
        reportId,
        timestamp: results.timestamp,
        stats: results.stats,
        sampleIssues: {
          invalid: results.invalid.slice(0, 5),
          missing: results.missing.slice(0, 5)
        }
      });
    } catch (error) {
      console.error('Error running media validation:', error);
      res.status(500).json({ error: 'Failed to run media validation' });
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
      
      // Map to array of reports
      const reports = reportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
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
      
      // Import the resolve function dynamically
      const { resolveAllBlobUrls } = await import('../scripts/resolve-blob-urls');
      
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
        details: errorMessage 
      });
    }
  });

  /**
   * Get list of blob URL resolution reports
   */
  app.get('/api/admin/blob-url-reports', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get the reports from Firestore, sorted by createdAt
      const reportsSnapshot = await adminDb.collection('blob_url_resolution_reports')
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
      console.log('Starting relative URL fix via admin API...');
      
      // Import the fix function dynamically
      const { fixRelativeUrls } = await import('../scripts/fix-relative-urls');
      
      // Run fix operation
      const report = await fixRelativeUrls();
      
      // Return success response with report
      res.json({
        success: true,
        report
      });
    } catch (error) {
      console.error('Error fixing relative URLs:', error);
      res.status(500).json({ error: 'Failed to fix relative URLs' });
    }
  });
  
  /**
   * Get list of relative URL fix reports
   */
  app.get('/api/admin/relative-url-reports', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get the reports from Firestore, sorted by createdAt
      const reportsSnapshot = await adminDb.collection('relative_url_fix_reports')
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
}