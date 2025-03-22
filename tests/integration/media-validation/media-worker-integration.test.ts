/**
 * Media Validation Worker Integration Tests
 * 
 * These tests verify the media validation worker functionality with Firebase emulators.
 * The tests focus on verifying that the worker can process messages from a queue
 * and update Firestore accordingly.
 */

import * as admin from 'firebase-admin';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { MediaValidationWorker } from '../../../core/application/media/media-validation-worker';
import { MockFirebaseMediaRepository } from './firebase-repository-mock';
import { IMediaValidationQueue } from '../../../core/application/interfaces/media-validation-queue';
import { EMULATOR_HOST, EMULATOR_PORTS } from '../../emulator-setup';

// Mock implementation of the validation queue for testing
class MockMediaValidationQueue implements IMediaValidationQueue {
  private messages: Array<{ id: string; data: string }> = [];
  private acknowledgedMessages: Array<{ id: string; data: string }> = [];
  
  constructor() {
    this.reset();
  }
  
  reset() {
    this.messages = [];
    this.acknowledgedMessages = [];
  }
  
  async sendMessage(data: Record<string, any>): Promise<string> {
    const id = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const message = { id, data: JSON.stringify(data) };
    this.messages.push(message);
    return id;
  }
  
  async receiveMessages(maxMessages: number = 10): Promise<Array<{ id: string; data: string }>> {
    const messagesCount = Math.min(maxMessages, this.messages.length);
    return this.messages.slice(0, messagesCount);
  }
  
  async deleteMessage(messageId: string): Promise<boolean> {
    const index = this.messages.findIndex(msg => msg.id === messageId);
    if (index !== -1) {
      this.messages.splice(index, 1);
      return true;
    }
    return false;
  }
  
  async acknowledgeMessage(message: { id: string; data: string }): Promise<boolean> {
    const index = this.messages.findIndex(msg => msg.id === message.id);
    if (index !== -1) {
      this.messages.splice(index, 1);
      this.acknowledgedMessages.push(message);
      return true;
    }
    return false;
  }
  
  getAcknowledgedMessages(): Array<{ id: string; data: string }> {
    return [...this.acknowledgedMessages];
  }
  
  getPendingMessages(): Array<{ id: string; data: string }> {
    return [...this.messages];
  }
}

describe('Media Validation Worker Integration Tests', () => {
  let firestore: Firestore;
  let adminFirestore: admin.firestore.Firestore;
  let repository: MockFirebaseMediaRepository;
  let queue: MockMediaValidationQueue;
  let worker: MediaValidationWorker;
  let testCollectionName: string;
  
  beforeAll(async () => {
    // Initialize Firebase app for client SDK
    const app = initializeApp({
      projectId: 'etoile-yachts-test',
      apiKey: 'fake-api-key',
      authDomain: 'localhost',
    }, 'worker-test-app');
    
    // Connect to emulators
    firestore = getFirestore(app);
    connectFirestoreEmulator(firestore, EMULATOR_HOST, EMULATOR_PORTS.firestore);
    
    // Get admin firestore instance
    adminFirestore = admin.firestore();
    
    // Initialize repository, queue, and worker
    repository = new MockFirebaseMediaRepository(firestore, {
      validationReportsCollection: 'validation_reports_test',
      repairReportsCollection: 'repair_reports_test'
    });
    
    queue = new MockMediaValidationQueue();
    
    worker = new MediaValidationWorker(repository, queue, {
      batchSize: 10,
      processingIntervalMs: 100,
      maxConcurrentBatches: 2,
      enabled: true
    });
    
    // Generate unique collection name for testing
    testCollectionName = `test_worker_collection_${Date.now()}`;
  });
  
  beforeEach(async () => {
    // Reset the queue
    queue.reset();
    
    // Clear any previous test data
    try {
      const snapshot = await adminFirestore.collection(testCollectionName).get();
      const batch = adminFirestore.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      // Also clear validation and repair reports
      const reportsSnapshot = await adminFirestore.collection('validation_reports_test').get();
      const reportsBatch = adminFirestore.batch();
      reportsSnapshot.docs.forEach(doc => reportsBatch.delete(doc.ref));
      await reportsBatch.commit();
      
      const repairSnapshot = await adminFirestore.collection('repair_reports_test').get();
      const repairBatch = adminFirestore.batch();
      repairSnapshot.docs.forEach(doc => repairBatch.delete(doc.ref));
      await repairBatch.commit();
    } catch (error) {
      // Ignore errors if collections don't exist
    }
    
    // Create test documents
    for (let i = 0; i < 5; i++) {
      await adminFirestore.collection(testCollectionName).doc(`doc-${i}`).set({
        title: `Test Document ${i}`,
        coverImage: i % 2 === 0 ? 'https://example.com/valid.jpg' : '/invalid.jpg',
        description: `Test document for worker`
      });
    }
  });
  
  afterEach(async () => {
    // Stop the worker if it's running
    worker.stop();
  });
  
  afterAll(async () => {
    // Clean up any remaining test data
    try {
      const snapshot = await adminFirestore.collection(testCollectionName).get();
      const batch = adminFirestore.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      const reportsSnapshot = await adminFirestore.collection('validation_reports_test').get();
      const reportsBatch = adminFirestore.batch();
      reportsSnapshot.docs.forEach(doc => reportsBatch.delete(doc.ref));
      await reportsBatch.commit();
      
      const repairSnapshot = await adminFirestore.collection('repair_reports_test').get();
      const repairBatch = adminFirestore.batch();
      repairSnapshot.docs.forEach(doc => repairBatch.delete(doc.ref));
      await repairBatch.commit();
    } catch (error) {
      // Ignore errors if collections don't exist
    }
  });
  
  describe('Message processing', () => {
    it('should process a validation message', async () => {
      // Create a validation message
      const messageId = await queue.sendMessage({
        type: 'VALIDATE_ALL',
        payload: {
          includeCollections: [testCollectionName]
        }
      });
      
      // Process the message
      const messages = await queue.receiveMessages(1);
      expect(messages).toHaveLength(1);
      
      await worker.processMessage(messages[0]);
      
      // Verify the message was acknowledged
      expect(queue.getAcknowledgedMessages()).toHaveLength(1);
      expect(queue.getAcknowledgedMessages()[0].id).toBe(messageId);
      
      // Check for validation reports in Firestore
      const reportsSnapshot = await adminFirestore.collection('validation_reports_test').get();
      expect(reportsSnapshot.empty).toBe(false);
      
      // Verify the report contents
      const report = reportsSnapshot.docs[0].data();
      expect(report.totalDocuments).toBe(5);
      expect(report.validUrls).toBe(3); // Even-numbered docs have valid URLs (0, 2, 4)
      expect(report.invalidUrls).toBe(2); // Odd-numbered docs have invalid URLs (1, 3)
    });
    
    it('should process a repair message', async () => {
      // First, create and save a validation report
      const reportId = `test-report-${Date.now()}`;
      const report = {
        id: reportId,
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        totalDocuments: 2,
        totalFields: 2,
        validUrls: 0,
        invalidUrls: 2,
        missingUrls: 0,
        collectionSummaries: [],
        invalidResults: [
          {
            field: 'coverImage',
            url: '/invalid.jpg',
            isValid: false,
            error: 'Invalid URL',
            collection: testCollectionName,
            documentId: 'doc-1'
          },
          {
            field: 'coverImage',
            url: '/invalid.jpg',
            isValid: false,
            error: 'Invalid URL',
            collection: testCollectionName,
            documentId: 'doc-3'
          }
        ]
      };
      
      await adminFirestore.collection('validation_reports_test').doc(reportId).set(report);
      
      // Create a repair message
      const messageId = await queue.sendMessage({
        type: 'REPAIR_ALL',
        payload: {
          reportId
        }
      });
      
      // Mock the repair method
      repository.repairDocument = jest.fn().mockResolvedValue(true);
      
      // Process the message
      const messages = await queue.receiveMessages(1);
      expect(messages).toHaveLength(1);
      
      await worker.processMessage(messages[0]);
      
      // Verify the message was acknowledged
      expect(queue.getAcknowledgedMessages()).toHaveLength(1);
      expect(queue.getAcknowledgedMessages()[0].id).toBe(messageId);
      
      // Verify that repair was attempted
      expect(repository.repairDocument).toHaveBeenCalledTimes(2);
    });
    
    it('should handle invalid messages gracefully', async () => {
      // Send an invalid message (invalid JSON)
      queue.messages.push({ id: 'invalid-1', data: 'not-json-data' });
      
      // Process the message
      const messages = await queue.receiveMessages(1);
      expect(messages).toHaveLength(1);
      
      await worker.processMessage(messages[0]);
      
      // Verify the message was acknowledged despite being invalid
      expect(queue.getAcknowledgedMessages()).toHaveLength(1);
      expect(queue.getAcknowledgedMessages()[0].id).toBe('invalid-1');
      
      // Send a message with unknown type
      const messageId = await queue.sendMessage({
        type: 'UNKNOWN_TYPE',
        payload: {}
      });
      
      // Process the message
      const messages2 = await queue.receiveMessages(1);
      expect(messages2).toHaveLength(1);
      
      await worker.processMessage(messages2[0]);
      
      // Verify the message was acknowledged despite having unknown type
      expect(queue.getAcknowledgedMessages()).toHaveLength(2);
      expect(queue.getAcknowledgedMessages()[1].id).toBe(messageId);
    });
  });
  
  describe('Worker processing cycle', () => {
    it('should process all messages in the queue', async () => {
      // Add multiple messages to the queue
      await queue.sendMessage({
        type: 'VALIDATE_ALL',
        payload: {
          includeCollections: [testCollectionName]
        }
      });
      
      await queue.sendMessage({
        type: 'VALIDATE_ALL',
        payload: {
          includeCollections: [testCollectionName],
          excludeCollections: ['logs']
        }
      });
      
      // Verify we have two messages
      expect(queue.getPendingMessages()).toHaveLength(2);
      
      // Start the worker
      worker.start();
      
      // Wait for messages to be processed (giving the worker time to run)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Stop the worker
      worker.stop();
      
      // Verify all messages were processed
      expect(queue.getPendingMessages()).toHaveLength(0);
      expect(queue.getAcknowledgedMessages()).toHaveLength(2);
      
      // Check for validation reports in Firestore
      const reportsSnapshot = await adminFirestore.collection('validation_reports_test').get();
      expect(reportsSnapshot.size).toBe(2); // Two reports for two validation messages
    });
  });
});