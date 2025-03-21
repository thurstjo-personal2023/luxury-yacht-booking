/**
 * ValidationReport Value Object
 * 
 * Represents a complete report of media validation across collections.
 */

import { DocumentValidationResult } from './document-validation-result';

/**
 * Collection summary in a validation report
 */
export interface CollectionSummary {
  collection: string;
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  validPercent: number;
  invalidPercent: number;
  missingPercent: number;
}

/**
 * Invalid field result in a validation report
 */
export interface InvalidFieldResult {
  field: string;
  url: string;
  isValid: boolean;
  status?: number;
  statusText?: string;
  error?: string;
  collection: string;
  documentId: string;
}

/**
 * ValidationReport properties
 */
export interface ValidationReportProps {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalDocuments: number;
  totalFields: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  collectionSummaries: CollectionSummary[];
  invalidResults: InvalidFieldResult[];
}

/**
 * ValidationReport value object
 */
export class ValidationReport {
  readonly id: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly duration: number;
  readonly totalDocuments: number;
  readonly totalFields: number;
  readonly validUrls: number;
  readonly invalidUrls: number;
  readonly missingUrls: number;
  readonly collectionSummaries: ReadonlyArray<CollectionSummary>;
  readonly invalidResults: ReadonlyArray<InvalidFieldResult>;

  constructor(props: ValidationReportProps) {
    this.id = props.id;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.duration = props.duration;
    this.totalDocuments = props.totalDocuments;
    this.totalFields = props.totalFields;
    this.validUrls = props.validUrls;
    this.invalidUrls = props.invalidUrls;
    this.missingUrls = props.missingUrls;
    this.collectionSummaries = [...props.collectionSummaries];
    this.invalidResults = [...props.invalidResults];
  }

  /**
   * Get the valid URL percentage
   */
  getValidPercentage(): number {
    if (this.totalFields === 0) return 100;
    return (this.validUrls / this.totalFields) * 100;
  }

  /**
   * Get the invalid URL percentage
   */
  getInvalidPercentage(): number {
    if (this.totalFields === 0) return 0;
    return (this.invalidUrls / this.totalFields) * 100;
  }

  /**
   * Get the missing URL percentage
   */
  getMissingPercentage(): number {
    if (this.totalFields === 0) return 0;
    return (this.missingUrls / this.totalFields) * 100;
  }

  /**
   * Get summary for a specific collection
   */
  getCollectionSummary(collection: string): CollectionSummary | undefined {
    return this.collectionSummaries.find(summary => summary.collection === collection);
  }

  /**
   * Get all invalid results for a specific collection
   */
  getInvalidResultsForCollection(collection: string): InvalidFieldResult[] {
    return this.invalidResults.filter(result => result.collection === collection);
  }

  /**
   * Generate a validation report from document validation results
   */
  static generateFromResults(
    id: string,
    results: DocumentValidationResult[],
    startTime: Date,
    endTime: Date
  ): ValidationReport {
    // Calculate overall statistics
    const totalDocuments = results.length;
    const totalFields = results.reduce((sum, result) => sum + result.totalUrls, 0);
    const validUrls = results.reduce((sum, result) => sum + result.validUrls, 0);
    const invalidUrls = results.reduce((sum, result) => sum + result.invalidUrls, 0);
    const missingUrls = results.reduce((sum, result) => sum + result.missingUrls, 0);
    
    // Calculate duration in milliseconds
    const duration = endTime.getTime() - startTime.getTime();
    
    // Generate collection summaries
    const collections = [...new Set(results.map(result => result.collection))];
    const collectionSummaries: CollectionSummary[] = collections.map(collection => {
      const collectionResults = results.filter(result => result.collection === collection);
      const collTotalUrls = collectionResults.reduce((sum, result) => sum + result.totalUrls, 0);
      const collValidUrls = collectionResults.reduce((sum, result) => sum + result.validUrls, 0);
      const collInvalidUrls = collectionResults.reduce((sum, result) => sum + result.invalidUrls, 0);
      const collMissingUrls = collectionResults.reduce((sum, result) => sum + result.missingUrls, 0);
      
      return {
        collection,
        totalUrls: collTotalUrls,
        validUrls: collValidUrls,
        invalidUrls: collInvalidUrls,
        missingUrls: collMissingUrls,
        validPercent: collTotalUrls === 0 ? 100 : (collValidUrls / collTotalUrls) * 100,
        invalidPercent: collTotalUrls === 0 ? 0 : (collInvalidUrls / collTotalUrls) * 100,
        missingPercent: collTotalUrls === 0 ? 0 : (collMissingUrls / collTotalUrls) * 100
      };
    });
    
    // Collect all invalid results
    const invalidResults: InvalidFieldResult[] = [];
    for (const result of results) {
      for (const field of result.getInvalidFields()) {
        invalidResults.push({
          field: field.path,
          url: field.url,
          isValid: field.isValid,
          status: field.statusCode,
          statusText: field.statusText,
          error: field.error,
          collection: result.collection,
          documentId: result.documentId
        });
      }
    }
    
    return new ValidationReport({
      id,
      startTime,
      endTime,
      duration,
      totalDocuments,
      totalFields,
      validUrls,
      invalidUrls,
      missingUrls,
      collectionSummaries,
      invalidResults
    });
  }

  /**
   * Convert to plain object
   */
  toObject(): ValidationReportProps {
    return {
      id: this.id,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      totalDocuments: this.totalDocuments,
      totalFields: this.totalFields,
      validUrls: this.validUrls,
      invalidUrls: this.invalidUrls,
      missingUrls: this.missingUrls,
      collectionSummaries: [...this.collectionSummaries],
      invalidResults: [...this.invalidResults]
    };
  }
}