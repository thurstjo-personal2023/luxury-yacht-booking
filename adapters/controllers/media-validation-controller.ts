/**
 * Media Validation Controller
 * 
 * This controller handles HTTP requests related to media validation.
 * It exposes RESTful endpoints for validating and repairing media.
 */

import { Request, Response } from 'express';
import { MediaValidationService } from '../../core/application/media/media-validation-service';
import { MediaValidationReport, MediaRepairReport } from '../repositories/interfaces/media-repository';
import { PubSubMediaValidationQueue } from '../../infrastructure/messaging/pubsub-media-validation-queue';

/**
 * Media validation controller
 */
export class MediaValidationController {
  private validationService: MediaValidationService;
  private validationQueue: PubSubMediaValidationQueue;
  
  constructor(validationService: MediaValidationService, validationQueue: PubSubMediaValidationQueue) {
    this.validationService = validationService;
    this.validationQueue = validationQueue;
  }
  
  /**
   * Register all routes with the Express application
   */
  registerRoutes(app: any): void {
    // Validation routes
    app.get('/api/admin/validate-media', this.validateAllMedia.bind(this));
    app.get('/api/admin/validate-media/status', this.getValidationStatus.bind(this));
    app.post('/api/admin/validate-media/stop', this.stopValidation.bind(this));
    app.post('/api/admin/validate-media/resume', this.resumeValidation.bind(this));
    
    // Report routes
    app.get('/api/admin/media-validation-reports', this.getValidationReports.bind(this));
    app.get('/api/admin/media-validation-reports/:reportId', this.getValidationReportById.bind(this));
    
    // Repair routes
    app.post('/api/admin/repair-media', this.repairInvalidMedia.bind(this));
    app.post('/api/admin/resolve-blob-urls', this.resolveBlobUrls.bind(this));
    app.post('/api/admin/fix-relative-urls', this.fixRelativeUrls.bind(this));
    
    // Repair report routes
    app.get('/api/admin/media-repair-reports', this.getRepairReports.bind(this));
    app.get('/api/admin/media-repair-reports/:reportId', this.getRepairReportById.bind(this));
    
    // Comprehensive validation route
    app.post('/api/admin/comprehensive-media-validation', this.runComprehensiveValidation.bind(this));
    
    // Background task routes
    app.post('/api/admin/queue-validation', this.queueValidation.bind(this));
    app.post('/api/admin/queue-repair', this.queueRepair.bind(this));
  }
  
  /**
   * Validate all media
   */
  async validateAllMedia(req: Request, res: Response): Promise<void> {
    try {
      const useQueue = req.query.queue === 'true';
      
      if (useQueue) {
        // Use background queue for processing
        const messageId = await this.validationQueue.enqueueValidateAll();
        res.status(202).json({
          message: 'Media validation task queued successfully',
          messageId
        });
      } else {
        // Process synchronously
        const report = await this.validationService.startValidation();
        res.status(200).json(report);
      }
    } catch (error) {
      res.status(500).json({
        error: 'Failed to start media validation',
        message: error.message
      });
    }
  }
  
  /**
   * Get validation status
   */
  async getValidationStatus(req: Request, res: Response): Promise<void> {
    try {
      const progress = this.validationService.getValidationProgress();
      res.status(200).json(progress);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get validation status',
        message: error.message
      });
    }
  }
  
  /**
   * Stop ongoing validation
   */
  async stopValidation(req: Request, res: Response): Promise<void> {
    try {
      this.validationService.stopValidation();
      res.status(200).json({
        message: 'Validation stopped successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to stop validation',
        message: error.message
      });
    }
  }
  
  /**
   * Resume paused validation
   */
  async resumeValidation(req: Request, res: Response): Promise<void> {
    try {
      const report = await this.validationService.resumeValidation();
      res.status(200).json(report);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to resume validation',
        message: error.message
      });
    }
  }
  
  /**
   * Get validation reports with pagination
   */
  async getValidationReports(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      
      const result = await this.validationService.listValidationReports(page, pageSize);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get validation reports',
        message: error.message
      });
    }
  }
  
  /**
   * Get validation report by ID
   */
  async getValidationReportById(req: Request, res: Response): Promise<void> {
    try {
      const reportId = req.params.reportId;
      const report = await this.validationService.getValidationReportById(reportId);
      
      if (!report) {
        res.status(404).json({
          error: 'Validation report not found',
          reportId
        });
        return;
      }
      
      res.status(200).json(report);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get validation report',
        message: error.message
      });
    }
  }
  
  /**
   * Repair invalid media
   */
  async repairInvalidMedia(req: Request, res: Response): Promise<void> {
    try {
      const useQueue = req.query.queue === 'true';
      
      if (useQueue) {
        // Use background queue for processing
        const messageId = await this.validationQueue.enqueueRepairInvalidMedia();
        res.status(202).json({
          message: 'Media repair task queued successfully',
          messageId
        });
      } else {
        // Process synchronously
        await this.validationService.repairInvalidMediaUrls();
        res.status(200).json({
          message: 'Media repair completed successfully'
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Failed to repair invalid media',
        message: error.message
      });
    }
  }
  
  /**
   * Resolve blob URLs
   */
  async resolveBlobUrls(req: Request, res: Response): Promise<void> {
    try {
      const useQueue = req.query.queue === 'true';
      
      if (useQueue) {
        // Use background queue for processing
        const messageId = await this.validationQueue.enqueueResolveBlobUrls();
        res.status(202).json({
          message: 'Blob URL resolution task queued successfully',
          messageId
        });
      } else {
        // Process synchronously
        await this.validationService.resolveBlobUrls();
        res.status(200).json({
          message: 'Blob URL resolution completed successfully'
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Failed to resolve blob URLs',
        message: error.message
      });
    }
  }
  
  /**
   * Fix relative URLs
   */
  async fixRelativeUrls(req: Request, res: Response): Promise<void> {
    try {
      const baseUrl = req.body.baseUrl || 'https://etoile-yachts.com';
      const useQueue = req.query.queue === 'true';
      
      if (useQueue) {
        // Use background queue for processing
        const messageId = await this.validationQueue.enqueueFixRelativeUrls(baseUrl);
        res.status(202).json({
          message: 'Relative URL fix task queued successfully',
          messageId
        });
      } else {
        // Process synchronously
        await this.validationService.fixRelativeUrls();
        res.status(200).json({
          message: 'Relative URL fixes completed successfully'
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fix relative URLs',
        message: error.message
      });
    }
  }
  
  /**
   * Get repair reports
   */
  async getRepairReports(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      
      const result = await this.validationService.listRepairReports(page, pageSize);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get repair reports',
        message: error.message
      });
    }
  }
  
  /**
   * Get repair report by ID
   */
  async getRepairReportById(req: Request, res: Response): Promise<void> {
    try {
      const reportId = req.params.reportId;
      const report = await this.validationService.getRepairReportById(reportId);
      
      if (!report) {
        res.status(404).json({
          error: 'Repair report not found',
          reportId
        });
        return;
      }
      
      res.status(200).json(report);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get repair report',
        message: error.message
      });
    }
  }
  
  /**
   * Run comprehensive validation
   */
  async runComprehensiveValidation(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.validationService.runComprehensiveValidation();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to run comprehensive validation',
        message: error.message
      });
    }
  }
  
  /**
   * Queue validation task
   */
  async queueValidation(req: Request, res: Response): Promise<void> {
    try {
      const collectionName = req.body.collectionName;
      let messageId: string;
      
      if (collectionName) {
        messageId = await this.validationQueue.enqueueValidateCollection(collectionName);
      } else {
        messageId = await this.validationQueue.enqueueValidateAll();
      }
      
      res.status(202).json({
        message: 'Validation task queued successfully',
        messageId
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to queue validation task',
        message: error.message
      });
    }
  }
  
  /**
   * Queue repair task
   */
  async queueRepair(req: Request, res: Response): Promise<void> {
    try {
      const reportId = req.body.reportId;
      const messageId = await this.validationQueue.enqueueRepairInvalidMedia(reportId);
      
      res.status(202).json({
        message: 'Repair task queued successfully',
        messageId
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to queue repair task',
        message: error.message
      });
    }
  }
}