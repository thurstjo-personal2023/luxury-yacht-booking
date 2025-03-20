/**
 * Media Validation Types
 * 
 * This file defines the types for the media validation functionality.
 */

/**
 * Status of a media validation run
 * 'pending': Queued but not yet started
 * 'in_progress': Currently running
 * 'completed': Successfully completed
 * 'failed': Failed to complete
 */
export type ValidationStatusType = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * Details of a single invalid media item
 */
export interface InvalidMediaItem {
  collectionId: string;        // Firestore collection ID
  documentId: string;          // Document ID
  fieldPath: string;           // Path to the media field (e.g., 'media.[0].url')
  url: string;                 // The invalid URL
  reason: string;              // Reason for invalidation
  statusCode?: number;         // HTTP status code (if available)
  error: string;               // Error message
  responseData?: string;       // Response data (if available)
}

/**
 * Result of a media validation run
 */
export interface MediaValidationStatus {
  id: string;                     // Unique ID for this validation run
  status: ValidationStatusType;   // Current status
  startTime: string;              // ISO string of start time
  endTime: string | null;         // ISO string of end time (null if not completed)
  totalImagesChecked: number;     // Total number of images checked
  totalImagesValid: number;       // Number of valid images
  totalImagesInvalid: number;     // Number of invalid images
  executionTimeMs: number;        // Total execution time in milliseconds
  invalidItems?: InvalidMediaItem[]; // List of invalid items (if any)
}

/**
 * Request to repair invalid media
 */
export interface RepairMediaRequest {
  reportId: string;               // ID of the validation report
  itemsToRepair: InvalidMediaItem[]; // Items to repair
}

/**
 * Result of a media repair operation
 */
export interface RepairMediaResult {
  reportId: string;               // ID of the repair report
  repairedItemsCount: number;     // Number of items successfully repaired
  failedItemsCount: number;       // Number of items that failed to repair
  details: {
    repaired: InvalidMediaItem[];  // Items that were repaired
    failed: InvalidMediaItem[];    // Items that failed to repair
  };
}