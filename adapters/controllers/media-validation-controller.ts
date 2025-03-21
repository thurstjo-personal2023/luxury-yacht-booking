/**
 * Media Validation Controller
 * 
 * This controller handles media validation API endpoints.
 * It serves as the interface between the HTTP layer and the application/domain layers.
 */

import { Request, Response } from 'express';
import { IMediaRepository, ValidationReport, RepairReport } from '../repositories/interfaces/media-repository';
import { IMediaValidationWorker, MediaValidationTask, UrlRepairTask } from '../../core/application/media/media-validation-worker';

/**
 * Media validation controller
 */
export class MediaValidationController {
  constructor(
    private readonly mediaRepository: IMediaRepository,
    private readonly mediaValidationWorker: IMediaValidationWorker
  ) {}
  
  /**
   * Validate all media across specified collections
   */
  async validateAll(req: Request, res: Response): Promise<void> {
    try {
      const { collections, validateNonImageUrls, autoRepair } = req.body;
      
      // Create and queue a validation task
      const task: MediaValidationTask = {
        collections,
        validateNonImageUrls,
        autoRepair
      };
      
      const taskId = await this.mediaValidationWorker.queueValidationTask(task);
      
      res.status(202).json({
        success: true,
        message: 'Media validation task queued successfully',
        taskId
      });
    } catch (error) {
      console.error('Error validating media:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error validating media',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Validate a specific collection
   */
  async validateCollection(req: Request, res: Response): Promise<void> {
    try {
      const { collection } = req.params;
      const { validateNonImageUrls, batchSize } = req.query;
      
      const results = await this.mediaValidationWorker.validateCollection(
        collection,
        {
          validateNonImageUrls: validateNonImageUrls === 'true',
          batchSize: batchSize ? Number(batchSize) : undefined
        }
      );
      
      const startTime = new Date();
      const endTime = new Date();
      const report = await this.mediaRepository.generateReport(results, startTime, endTime);
      const reportId = await this.mediaRepository.saveReport(report);
      
      res.status(200).json({
        success: true,
        reportId,
        totalDocuments: results.length,
        totalUrls: report.totalFields,
        validUrls: report.validUrls,
        invalidUrls: report.invalidUrls,
        missingUrls: report.missingUrls
      });
    } catch (error) {
      console.error('Error validating collection:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error validating collection',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Get all validation reports
   */
  async getReports(req: Request, res: Response): Promise<void> {
    try {
      const reports = await this.mediaRepository.getAllReports();
      
      res.status(200).json({
        success: true,
        reports: reports.map(report => ({
          id: report.id,
          startTime: report.startTime,
          endTime: report.endTime,
          duration: report.duration,
          totalDocuments: report.totalDocuments,
          totalFields: report.totalFields,
          validUrls: report.validUrls,
          invalidUrls: report.invalidUrls,
          missingUrls: report.missingUrls
        }))
      });
    } catch (error) {
      console.error('Error getting validation reports:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error getting validation reports',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Get a specific validation report
   */
  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const report = await this.mediaRepository.getReportById(reportId);
      
      if (!report) {
        res.status(404).json({
          success: false,
          message: `Report not found: ${reportId}`
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        report
      });
    } catch (error) {
      console.error('Error getting validation report:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error getting validation report',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Repair invalid URLs identified in a report
   */
  async repairUrls(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { urls } = req.body;
      
      // Create and queue a repair task
      const task: UrlRepairTask = {
        reportId,
        urls
      };
      
      const taskId = await this.mediaValidationWorker.queueRepairTask(task);
      
      res.status(202).json({
        success: true,
        message: 'URL repair task queued successfully',
        taskId
      });
    } catch (error) {
      console.error('Error repairing URLs:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error repairing URLs',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Get all repair reports
   */
  async getRepairReports(req: Request, res: Response): Promise<void> {
    try {
      const reports = await this.mediaRepository.getAllRepairReports();
      
      res.status(200).json({
        success: true,
        reports: reports.map(report => ({
          id: report.id,
          timestamp: report.timestamp,
          totalAttempted: report.totalAttempted,
          totalSuccess: report.totalSuccess,
          totalFailed: report.totalFailed
        }))
      });
    } catch (error) {
      console.error('Error getting repair reports:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error getting repair reports',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Get a specific repair report
   */
  async getRepairReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const report = await this.mediaRepository.getRepairReportById(reportId);
      
      if (!report) {
        res.status(404).json({
          success: false,
          message: `Repair report not found: ${reportId}`
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        report
      });
    } catch (error) {
      console.error('Error getting repair report:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error getting repair report',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Fix relative URLs
   */
  async fixRelativeUrls(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.mediaValidationWorker.fixRelativeUrls();
      
      res.status(200).json({
        success: true,
        repairedCount: result.repairedCount,
        failedCount: result.failedCount,
        reportId: result.reportId
      });
    } catch (error) {
      console.error('Error fixing relative URLs:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error fixing relative URLs',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Resolve blob URLs
   */
  async resolveBlobUrls(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.mediaValidationWorker.resolveBlobUrls();
      
      res.status(200).json({
        success: true,
        repairedCount: result.repairedCount,
        failedCount: result.failedCount,
        reportId: result.reportId
      });
    } catch (error) {
      console.error('Error resolving blob URLs:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error resolving blob URLs',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Get worker status
   */
  async getWorkerStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = this.mediaValidationWorker.getStatus();
      
      res.status(200).json({
        success: true,
        status
      });
    } catch (error) {
      console.error('Error getting worker status:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error getting worker status',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Start worker
   */
  async startWorker(req: Request, res: Response): Promise<void> {
    try {
      await this.mediaValidationWorker.start();
      
      res.status(200).json({
        success: true,
        message: 'Media validation worker started successfully'
      });
    } catch (error) {
      console.error('Error starting worker:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error starting worker',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Stop worker
   */
  async stopWorker(req: Request, res: Response): Promise<void> {
    try {
      await this.mediaValidationWorker.stop();
      
      res.status(200).json({
        success: true,
        message: 'Media validation worker stopped successfully'
      });
    } catch (error) {
      console.error('Error stopping worker:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error stopping worker',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}