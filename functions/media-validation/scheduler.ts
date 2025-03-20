/**
 * Media Validation Scheduler
 * 
 * This module provides a scheduler for media validation tasks.
 * It runs at regular intervals to check for pending tasks and 
 * initiates validation processes based on configured schedules.
 */
import * as admin from 'firebase-admin';
import { MediaValidationWorker } from './worker';

// Scheduler configuration type
export interface SchedulerConfig {
  firestore: admin.firestore.Firestore;
  projectId: string;
  topicName: string;
  collectionNames: string[];
  baseUrl: string;
  schedules: {
    validateAll?: {
      enabled: boolean;
      cronExpression?: string;
      intervalHours?: number;
    };
    fixRelativeUrls?: {
      enabled: boolean;
      cronExpression?: string;
      intervalHours?: number;
    };
  };
}

// Schedule status
export interface ScheduleStatus {
  id: string;
  type: 'validate-all' | 'fix-relative-urls' | 'custom';
  enabled: boolean;
  lastRun?: admin.firestore.Timestamp;
  nextRun?: admin.firestore.Timestamp;
  cronExpression?: string;
  intervalHours?: number;
  status: 'active' | 'disabled' | 'failed';
  error?: string;
}

/**
 * Media Validation Scheduler
 */
export class MediaValidationScheduler {
  private worker: MediaValidationWorker;
  
  constructor(private config: SchedulerConfig) {
    // Initialize the worker
    this.worker = new MediaValidationWorker({
      firestore: config.firestore,
      projectId: config.projectId,
      topicName: config.topicName,
      collectionNames: config.collectionNames,
      baseUrl: config.baseUrl,
      enablePubSub: true
    });
  }
  
  /**
   * Initialize schedules in Firestore
   */
  public async initializeSchedules(): Promise<void> {
    const schedulesCollection = this.config.firestore.collection('validation_schedules');
    
    // Check if schedules already exist
    const snapshot = await schedulesCollection.get();
    
    if (snapshot.empty) {
      console.log(`[Scheduler] Initializing schedules in Firestore`);
      
      // Create validate-all schedule
      if (this.config.schedules.validateAll?.enabled) {
        await schedulesCollection.doc('validate-all').set({
          id: 'validate-all',
          type: 'validate-all',
          enabled: true,
          intervalHours: this.config.schedules.validateAll.intervalHours || 24,
          cronExpression: this.config.schedules.validateAll.cronExpression,
          status: 'active',
          createdAt: admin.firestore.Timestamp.now()
        });
      }
      
      // Create fix-relative-urls schedule
      if (this.config.schedules.fixRelativeUrls?.enabled) {
        await schedulesCollection.doc('fix-relative-urls').set({
          id: 'fix-relative-urls',
          type: 'fix-relative-urls',
          enabled: true,
          intervalHours: this.config.schedules.fixRelativeUrls.intervalHours || 24 * 7, // Weekly by default
          cronExpression: this.config.schedules.fixRelativeUrls.cronExpression,
          status: 'active',
          createdAt: admin.firestore.Timestamp.now()
        });
      }
    } else {
      console.log(`[Scheduler] Schedules already exist in Firestore`);
    }
  }
  
  /**
   * Check if a schedule should run based on its last run time and interval
   */
  private shouldRunSchedule(schedule: ScheduleStatus): boolean {
    if (!schedule.enabled) {
      return false;
    }
    
    // If there's no last run, or no next run, schedule should run
    if (!schedule.lastRun || !schedule.nextRun) {
      return true;
    }
    
    // Check if next run time has passed
    const now = admin.firestore.Timestamp.now();
    return now.toMillis() >= schedule.nextRun.toMillis();
  }
  
  /**
   * Calculate the next run time for a schedule
   */
  private calculateNextRunTime(schedule: ScheduleStatus): admin.firestore.Timestamp {
    // If using cron expression, would need to calculate next time from cron
    // For simplicity, just using interval hours
    if (schedule.intervalHours) {
      const now = new Date();
      const nextRun = new Date(now.getTime() + (schedule.intervalHours * 60 * 60 * 1000));
      return admin.firestore.Timestamp.fromDate(nextRun);
    }
    
    // Default to 24 hours from now
    const now = new Date();
    const nextRun = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    return admin.firestore.Timestamp.fromDate(nextRun);
  }
  
  /**
   * Process a scheduled task
   */
  private async processSchedule(schedule: ScheduleStatus): Promise<string | null> {
    try {
      console.log(`[Scheduler] Processing schedule ${schedule.id} of type ${schedule.type}`);
      
      // Create appropriate task based on schedule type
      let taskId: string;
      
      switch (schedule.type) {
        case 'validate-all':
          taskId = await this.worker.createTask('validate-all');
          break;
          
        case 'fix-relative-urls':
          taskId = await this.worker.createTask('fix-relative-urls');
          break;
          
        default:
          throw new Error(`Unknown schedule type: ${schedule.type}`);
      }
      
      // Update schedule status
      const now = admin.firestore.Timestamp.now();
      const nextRun = this.calculateNextRunTime(schedule);
      
      await this.config.firestore.collection('validation_schedules').doc(schedule.id).update({
        lastRun: now,
        nextRun,
        lastTaskId: taskId
      });
      
      console.log(`[Scheduler] Schedule ${schedule.id} processed successfully, created task ${taskId}`);
      
      return taskId;
    } catch (error) {
      console.error(`[Scheduler] Error processing schedule ${schedule.id}:`, error);
      
      // Update schedule with error
      await this.config.firestore.collection('validation_schedules').doc(schedule.id).update({
        status: 'failed',
        error: error.message || 'Unknown error',
        lastError: admin.firestore.Timestamp.now()
      });
      
      return null;
    }
  }
  
  /**
   * Run the scheduler
   * This should be called periodically (e.g., every hour) to check for scheduled tasks
   */
  public async run(): Promise<number> {
    try {
      console.log(`[Scheduler] Running media validation scheduler`);
      
      // Get all active schedules
      const schedulesCollection = this.config.firestore.collection('validation_schedules');
      const snapshot = await schedulesCollection.where('status', '==', 'active').get();
      
      if (snapshot.empty) {
        console.log(`[Scheduler] No active schedules found`);
        return 0;
      }
      
      const schedulesToRun: ScheduleStatus[] = [];
      
      // Check each schedule
      snapshot.forEach(doc => {
        const schedule = doc.data() as ScheduleStatus;
        
        if (this.shouldRunSchedule(schedule)) {
          schedulesToRun.push(schedule);
        }
      });
      
      if (schedulesToRun.length === 0) {
        console.log(`[Scheduler] No schedules due to run at this time`);
        return 0;
      }
      
      console.log(`[Scheduler] Found ${schedulesToRun.length} schedules to run`);
      
      // Run each schedule
      const results = await Promise.all(schedulesToRun.map(schedule => 
        this.processSchedule(schedule)
      ));
      
      const successCount = results.filter(Boolean).length;
      console.log(`[Scheduler] Successfully ran ${successCount} of ${schedulesToRun.length} schedules`);
      
      return successCount;
    } catch (error) {
      console.error(`[Scheduler] Error running scheduler:`, error);
      return 0;
    }
  }
  
  /**
   * Update a schedule configuration
   */
  public async updateSchedule(scheduleId: string, updates: Partial<ScheduleStatus>): Promise<void> {
    // Check that the schedule exists
    const scheduleRef = this.config.firestore.collection('validation_schedules').doc(scheduleId);
    const doc = await scheduleRef.get();
    
    if (!doc.exists) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }
    
    // Apply updates
    await scheduleRef.update({
      ...updates,
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    console.log(`[Scheduler] Updated schedule ${scheduleId}`);
  }
  
  /**
   * Get all schedule configurations
   */
  public async getSchedules(): Promise<ScheduleStatus[]> {
    const snapshot = await this.config.firestore.collection('validation_schedules').get();
    
    if (snapshot.empty) {
      return [];
    }
    
    const schedules: ScheduleStatus[] = [];
    
    snapshot.forEach(doc => {
      schedules.push(doc.data() as ScheduleStatus);
    });
    
    return schedules;
  }
  
  /**
   * Create a one-time validation task
   */
  public async createOneTimeTask(
    type: 'validate-all' | 'validate-collection' | 'fix-relative-urls',
    options: {
      collectionName?: string;
      documentId?: string;
      parameters?: Record<string, any>;
    } = {}
  ): Promise<string> {
    return this.worker.createTask(type, options);
  }
}