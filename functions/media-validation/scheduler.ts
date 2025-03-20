/**
 * Media Validation Scheduler
 * 
 * This module provides functionality to schedule media validation tasks
 * to run at regular intervals or at specific times.
 */

import { MediaValidationWorker, MediaValidationWorkerConfig } from './worker';
import { ValidationReport } from './media-validation';
import { Firestore } from 'firebase/firestore';

/**
 * Task schedule configuration
 */
export interface TaskScheduleConfig {
  type: 'interval' | 'cron';
  value: number | string; // Interval in milliseconds or cron expression
}

/**
 * Media validation scheduler configuration
 */
export interface MediaValidationSchedulerConfig {
  worker: MediaValidationWorkerConfig;
  schedule: TaskScheduleConfig;
  enabled?: boolean;
  maxConcurrentTasks?: number;
  onStart?: (taskId: string) => void;
  onComplete?: (taskId: string, report: ValidationReport) => void;
  onError?: (taskId: string, error: Error) => void;
}

/**
 * Task status
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Scheduled task
 */
export interface ScheduledTask {
  id: string;
  status: TaskStatus;
  startTime?: Date;
  endTime?: Date;
  config: MediaValidationWorkerConfig;
  report?: ValidationReport;
  error?: string;
}

/**
 * Media validation scheduler
 */
export class MediaValidationScheduler {
  private db: Firestore;
  private config: MediaValidationSchedulerConfig;
  private tasks: Map<string, ScheduledTask> = new Map();
  private worker: MediaValidationWorker;
  private schedulerId: string;
  private intervalId?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private runningTasks: number = 0;

  /**
   * Constructor
   * 
   * @param db Firestore instance
   * @param config Media validation scheduler configuration
   */
  constructor(db: Firestore, config: MediaValidationSchedulerConfig) {
    this.db = db;
    this.config = {
      ...config,
      enabled: config.enabled !== false,
      maxConcurrentTasks: config.maxConcurrentTasks || 1
    };
    
    this.worker = new MediaValidationWorker(db, config.worker);
    this.schedulerId = `scheduler-${Date.now()}`;
  }

  /**
   * Start scheduler
   */
  start(): void {
    if (this.isRunning) {
      throw new Error('Scheduler already running');
    }
    
    this.isRunning = true;
    
    // Start scheduling based on configuration
    if (this.config.schedule.type === 'interval') {
      const interval = Number(this.config.schedule.value);
      if (isNaN(interval) || interval <= 0) {
        throw new Error('Invalid interval value');
      }
      
      // Schedule at regular intervals
      this.intervalId = setInterval(() => {
        this.scheduleTasks();
      }, interval);
      
      // Run immediately
      this.scheduleTasks();
    } else if (this.config.schedule.type === 'cron') {
      throw new Error('Cron scheduling not implemented yet');
    } else {
      throw new Error('Invalid schedule type');
    }
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    // Clear interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Schedule tasks based on configuration
   */
  private scheduleTasks(): void {
    // Check if we can run more tasks
    if (!this.config.enabled || this.runningTasks >= (this.config.maxConcurrentTasks || 1)) {
      return;
    }
    
    // Create a new task
    const taskId = this.createTaskId();
    const task: ScheduledTask = {
      id: taskId,
      status: TaskStatus.PENDING,
      config: { ...this.config.worker }
    };
    
    // Store task
    this.tasks.set(taskId, task);
    
    // Start task
    this.startTask(taskId);
  }

  /**
   * Start a task
   * 
   * @param taskId Task ID
   */
  private async startTask(taskId: string): Promise<void> {
    // Get task
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }
    
    try {
      // Update task status
      task.status = TaskStatus.RUNNING;
      task.startTime = new Date();
      this.runningTasks++;
      
      // Notify start
      if (this.config.onStart) {
        this.config.onStart(taskId);
      }
      
      // Create worker for this task
      const worker = new MediaValidationWorker(this.db, {
        ...task.config,
        onProgress: (progress: number, total: number) => {
          // Forward progress to task config if provided
          if (task.config.onProgress) {
            task.config.onProgress(progress, total);
          }
        }
      });
      
      // Run task
      const report = await worker.start();
      
      // Update task status
      task.status = TaskStatus.COMPLETED;
      task.endTime = new Date();
      task.report = report;
      this.runningTasks--;
      
      // Notify completion
      if (this.config.onComplete) {
        this.config.onComplete(taskId, report);
      }
    } catch (error) {
      // Update task status
      task.status = TaskStatus.FAILED;
      task.endTime = new Date();
      task.error = error instanceof Error ? error.message : String(error);
      this.runningTasks--;
      
      // Notify error
      if (this.config.onError) {
        this.config.onError(taskId, error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Create a task ID
   * 
   * @returns Task ID
   */
  private createTaskId(): string {
    return `task-${this.schedulerId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Create a task manually
   * 
   * @param config Task configuration (overrides default worker config)
   * @returns Task ID
   */
  async createTask(config?: Partial<MediaValidationWorkerConfig>): Promise<string> {
    // Create a new task
    const taskId = this.createTaskId();
    const task: ScheduledTask = {
      id: taskId,
      status: TaskStatus.PENDING,
      config: {
        ...this.config.worker,
        ...config
      }
    };
    
    // Store task
    this.tasks.set(taskId, task);
    
    // Start task if we're not at capacity
    if (this.runningTasks < (this.config.maxConcurrentTasks || 1)) {
      // Start in the background
      this.startTask(taskId);
    }
    
    return taskId;
  }

  /**
   * Get task status
   * 
   * @param taskId Task ID
   * @returns Task or undefined if not found
   */
  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   * 
   * @returns Array of tasks
   */
  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Cancel a task
   * 
   * @param taskId Task ID
   * @returns True if task was cancelled, false otherwise
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }
    
    // Only pending tasks can be cancelled
    if (task.status !== TaskStatus.PENDING) {
      return false;
    }
    
    // Update task status
    task.status = TaskStatus.CANCELLED;
    task.endTime = new Date();
    
    return true;
  }
}