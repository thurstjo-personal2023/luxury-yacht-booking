/**
 * Media Validation Usage Example
 * 
 * This file demonstrates how to use the media validation system
 * with the clean architecture implementation.
 */

import { Firestore } from 'firebase/firestore';
import { MediaValidationFactory } from '../core/application/factories/media-validation-factory';
import { MediaType } from '../core/domain/media/media-type';

/**
 * Run a validation for all media in a collection
 */
async function validateCollectionMedia(
  db: Firestore,
  collectionName: string
): Promise<void> {
  try {
    // 1. Create the factory
    const factory = new MediaValidationFactory(db, {
      // Configure the validator to expect images and disallow relative URLs
      validatorOptions: {
        expectedType: MediaType.IMAGE,
        allowRelativeUrls: false,
        allowBlobUrls: false
      },
      
      // Configure the repository
      repositoryConfig: {
        collectionsToExclude: ['mail', 'logs', 'system_settings'],
        validationTimeoutMs: 10000
      }
    });
    
    // 2. Create the validation service
    const validationService = factory.createService();
    
    // 3. Run validation for the collection
    console.log(`Starting validation for collection: ${collectionName}`);
    const startTime = new Date();
    
    const reportId = await validationService.validateCollection(collectionName);
    
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log(`Validation completed in ${duration} seconds`);
    console.log(`Report ID: ${reportId}`);
    
    // 4. Get the validation report
    const report = await validationService.getValidationReport(reportId);
    
    // 5. Print summary
    console.log('Validation Summary:');
    console.log(`Total documents: ${report.totalDocuments}`);
    console.log(`Total fields: ${report.totalFields}`);
    console.log(`Valid URLs: ${report.validUrls} (${(report.validUrls / report.totalFields * 100).toFixed(2)}%)`);
    console.log(`Invalid URLs: ${report.invalidUrls} (${(report.invalidUrls / report.totalFields * 100).toFixed(2)}%)`);
    
    // 6. Print invalid URLs
    if (report.invalidResults.length > 0) {
      console.log('\nInvalid URLs:');
      
      report.invalidResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.collection} (${result.documentId}):`);
        console.log(`   Field: ${result.field}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Error: ${result.error}`);
        console.log('');
      });
    }
    
    // 7. Repair invalid URLs if requested
    const shouldRepair = false; // Change to true to repair URLs
    
    if (shouldRepair && report.invalidResults.length > 0) {
      console.log('\nRepairing invalid URLs...');
      
      const repairResult = await validationService.repairInvalidUrls(reportId);
      
      console.log(`Repair completed. Fixed ${repairResult.fixedCount} URLs.`);
    }
  } catch (error) {
    console.error('Error validating collection media:', error);
    throw error;
  }
}

/**
 * Use the media validation worker to process validation tasks
 */
async function scheduleMediaValidation(
  db: Firestore,
  projectId: string
): Promise<void> {
  try {
    // 1. Create the factory
    const factory = new MediaValidationFactory(db, {
      // Configure the validator
      validatorOptions: {
        expectedType: MediaType.IMAGE,
        allowRelativeUrls: false
      },
      
      // Configure the queue
      queueConfig: {
        projectId,
        topicName: 'media-validation-tasks',
        subscriptionName: 'media-validation-worker'
      },
      
      // Configure the worker
      workerConfig: {
        defaultBatchSize: 50
      }
    });
    
    // 2. Create the worker
    const worker = factory.createWorker();
    
    // 3. Schedule validation
    console.log('Scheduling media validation...');
    
    const collectionNames = [
      'unified_yacht_experiences',
      'products_add_ons'
    ];
    
    const validationId = await worker.scheduleValidation(collectionNames);
    
    console.log(`Media validation scheduled with ID: ${validationId}`);
    
    // 4. Process a task (in a real system, this would be done by a worker process)
    console.log('Simulating task processing...');
    
    // Dequeue and process a task
    const task = await factory.createQueue().dequeueTask();
    
    if (task) {
      console.log(`Processing task for collection: ${task.collection}`);
      const result = await worker.processTask(task);
      
      console.log(`Task processed. Processed: ${result.processed}, Fixed: ${result.fixed}, Errors: ${result.errors}`);
    } else {
      console.log('No tasks available for processing');
    }
  } catch (error) {
    console.error('Error scheduling media validation:', error);
    throw error;
  }
}

/**
 * Example usage
 */
export async function runMediaValidationExample(
  db: Firestore,
  projectId: string
): Promise<void> {
  // 1. Validate a specific collection
  await validateCollectionMedia(db, 'unified_yacht_experiences');
  
  // 2. Schedule validation for multiple collections
  await scheduleMediaValidation(db, projectId);
}