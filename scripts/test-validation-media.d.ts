/**
 * Type declarations for the test-validation-media module
 */

export interface ValidationTestResults {
  initialIssues: number;
  fixedIssues: number;
  remainingIssues: number;
  successRate: number;
  testId: string;
  timestamp: any; // Firebase timestamp
}

/**
 * Run a comprehensive test of the media validation and repair system
 * 
 * @returns Promise with validation test results
 */
export function runMediaValidationTest(): Promise<{
  success: boolean;
  results: ValidationTestResults;
  testId: string;
}>;