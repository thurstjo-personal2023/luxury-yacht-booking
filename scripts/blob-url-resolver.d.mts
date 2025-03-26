/**
 * Type definitions for blob-url-resolver.mjs
 */

/**
 * Represents a document with blob URLs to be resolved
 */
export interface BlobDocument {
  id: string;
  path: string;
  field: string;
  value: string;
  [key: string]: any;
}

/**
 * Represents an error that occurred during blob URL resolution
 */
export interface BlobResolutionError {
  documentId: string;
  path: string;
  field: string;
  error: string;
}

/**
 * Represents the result of a successful blob URL resolution
 */
export interface BlobResolutionResult {
  documentId: string;
  path: string;
  field: string;
  oldValue: string;
  newValue: string;
}

/**
 * Represents the report from the blob URL resolution operation
 */
export interface BlobResolutionReport {
  startTime: Date;
  endTime: Date;
  duration: number;
  totalDocuments: number;
  resolvedUrls: number;
  errors: BlobResolutionError[];
  results: BlobResolutionResult[];
}

/**
 * Resolve all blob URLs in a collection, or in all collections if no parameters provided
 * @param collectionPath Path to the collection (optional)
 * @param field Field name containing the blob URL (optional)
 * @param targetField Optional target field to store the resolved URL (optional)
 * @returns Object with success status and report
 */
export function resolveAllBlobUrls(
  collectionPath?: string,
  field?: string,
  targetField?: string
): Promise<{
  success: boolean;
  report: BlobResolutionReport;
}>;