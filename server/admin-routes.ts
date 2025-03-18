/**
 * Admin Routes
 * 
 * This module registers admin-specific routes for the Express server.
 * These routes are protected by admin authentication and provide administrative functionality.
 */
import { Request, Response, Express, NextFunction } from 'express';
import { verifyAuth, adminDb } from './firebase-admin';
import validateImageUrls from '../scripts/validate-images';

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
}