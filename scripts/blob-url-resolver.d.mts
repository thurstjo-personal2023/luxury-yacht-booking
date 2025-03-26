/**
 * Type definitions for blob-url-resolver.mjs
 */

/**
 * Resolve all blob URLs in a collection
 * @param collectionPath Path to the collection
 * @param field Field name containing the blob URL
 * @param targetField Optional target field to store the resolved URL
 * @returns Object with success status and results
 */
export function resolveAllBlobUrls(
  collectionPath: string,
  field: string,
  targetField?: string
): Promise<{
  success: boolean;
  count: number;
  errors: any[];
  results: any[];
}>;