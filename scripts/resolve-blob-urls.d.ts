/**
 * Type declarations for resolve-blob-urls.js
 */

declare module '../scripts/resolve-blob-urls.js' {
  /**
   * Results interface for blob URL resolution
   */
  export interface BlobUrlResolutionResult {
    success: boolean;
    reportId?: string;
    stats?: {
      totalDocs: number;
      totalResolved: number;
      totalFailed: number;
      executionTime: number;
    };
    error?: string;
  }

  /**
   * Resolve all blob:// URLs in the database
   * 
   * @returns {Promise<BlobUrlResolutionResult>} Results of the resolution process
   */
  export function resolveAllBlobUrls(): Promise<BlobUrlResolutionResult>;
}