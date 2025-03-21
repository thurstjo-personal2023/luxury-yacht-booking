/**
 * Media Repair Domain Entities and Value Objects
 * 
 * Represents media repair operations and results.
 */

import { MediaType } from '../media/media-type';

/**
 * Media repair operation types
 */
export enum MediaRepairType {
  RELATIVE_URL_FIX = 'RelativeUrlFix',
  BLOB_URL_RESOLVE = 'BlobUrlResolve',
  MEDIA_TYPE_CORRECTION = 'MediaTypeCorrection',
  PLACEHOLDER_INSERTION = 'PlaceholderInsertion'
}

/**
 * Field repair result interface
 */
export interface FieldRepairResult {
  path: string;
  originalValue: string;
  newValue: string;
  repairType: MediaRepairType;
}

/**
 * Document repair result properties
 */
export interface DocumentRepairResultProps {
  collection: string;
  documentId: string;
  fields: FieldRepairResult[];
  repairedAt: Date;
}

/**
 * Document repair result entity
 */
export class DocumentRepairResult {
  readonly collection: string;
  readonly documentId: string;
  readonly fields: ReadonlyArray<FieldRepairResult>;
  readonly repairedAt: Date;

  constructor(props: DocumentRepairResultProps) {
    this.collection = props.collection;
    this.documentId = props.documentId;
    this.fields = [...props.fields];
    this.repairedAt = props.repairedAt;
  }

  /**
   * Get the number of repaired fields
   */
  get repairedFieldsCount(): number {
    return this.fields.length;
  }

  /**
   * Get fields by repair type
   */
  getFieldsByRepairType(repairType: MediaRepairType): FieldRepairResult[] {
    return this.fields.filter(field => field.repairType === repairType);
  }

  /**
   * Convert to plain object
   */
  toObject(): DocumentRepairResultProps {
    return {
      collection: this.collection,
      documentId: this.documentId,
      fields: [...this.fields],
      repairedAt: this.repairedAt
    };
  }
}

/**
 * Repair report properties
 */
export interface RepairReportProps {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalDocuments: number;
  totalFieldsRepaired: number;
  repairsByType: {
    [key in MediaRepairType]?: number;
  };
  results: DocumentRepairResult[];
}

/**
 * Repair report entity
 */
export class RepairReport {
  readonly id: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly duration: number;
  readonly totalDocuments: number;
  readonly totalFieldsRepaired: number;
  readonly repairsByType: Readonly<{
    [key in MediaRepairType]?: number;
  }>;
  readonly results: ReadonlyArray<DocumentRepairResult>;

  constructor(props: RepairReportProps) {
    this.id = props.id;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.duration = props.duration;
    this.totalDocuments = props.totalDocuments;
    this.totalFieldsRepaired = props.totalFieldsRepaired;
    this.repairsByType = { ...props.repairsByType };
    this.results = [...props.results];
  }

  /**
   * Get repair count by type
   */
  getRepairCountByType(repairType: MediaRepairType): number {
    return this.repairsByType[repairType] || 0;
  }

  /**
   * Generate a repair report from document repair results
   */
  static generateFromResults(
    id: string,
    results: DocumentRepairResult[],
    startTime: Date,
    endTime: Date
  ): RepairReport {
    // Calculate overall statistics
    const totalDocuments = results.length;
    const totalFieldsRepaired = results.reduce(
      (sum, result) => sum + result.repairedFieldsCount, 
      0
    );
    
    // Calculate duration in milliseconds
    const duration = endTime.getTime() - startTime.getTime();
    
    // Count repairs by type
    const repairsByType: { [key in MediaRepairType]?: number } = {};
    
    for (const result of results) {
      for (const field of result.fields) {
        const currentCount = repairsByType[field.repairType] || 0;
        repairsByType[field.repairType] = currentCount + 1;
      }
    }
    
    return new RepairReport({
      id,
      startTime,
      endTime,
      duration,
      totalDocuments,
      totalFieldsRepaired,
      repairsByType,
      results
    });
  }

  /**
   * Convert to plain object
   */
  toObject(): RepairReportProps {
    return {
      id: this.id,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      totalDocuments: this.totalDocuments,
      totalFieldsRepaired: this.totalFieldsRepaired,
      repairsByType: { ...this.repairsByType },
      results: this.results.map(result => result.toObject())
    };
  }
}