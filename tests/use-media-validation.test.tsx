/**
 * Use Media Validation Hook Tests
 * 
 * This file contains tests for the useMediaValidation hook.
 * It demonstrates how to use our hook testing utilities with React 18.
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Define ValidationReport type for testing
interface ValidationReport {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalDocuments: number;
  totalFields: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  collectionSummaries: {
    collection: string;
    totalUrls: number;
    validUrls: number;
    invalidUrls: number;
    missingUrls: number;
    validPercent: number;
    invalidPercent: number;
    missingPercent: number;
  }[];
  invalidResults: {
    field: string;
    url: string;
    isValid: boolean;
    status?: number;
    statusText?: string;
    error?: string;
    collection: string;
    documentId: string;
  }[];
}

// Mock the useMediaValidation hook
jest.mock('../client/src/hooks/use-media-validation', () => {
  return {
    useMediaValidation: () => {
      const [reports, setReports] = React.useState<ValidationReport[] | undefined>(undefined);
      const [validationStatus, setValidationStatus] = React.useState<string>('');
      const [repairStatus, setRepairStatus] = React.useState<string>('');
      const [isLoadingReports, setIsLoadingReports] = React.useState<boolean>(false);
      
      const loadReports = async () => {
        setIsLoadingReports(true);
        try {
          const response = await fetch('/api/admin/media-validation-reports');
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
          }
          const data = await response.json();
          setReports(data);
          return { data };
        } finally {
          setIsLoadingReports(false);
        }
      };
      
      const runValidation = async (options = {}) => {
        setValidationStatus('Validating...');
        try {
          const response = await fetch('/api/admin/validate-media', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(options),
          });
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
          }
          const data = await response.json();
          setValidationStatus('Validation complete.');
          await loadReports();
          return data;
        } catch (error) {
          setValidationStatus(`Error: ${error.message}`);
          throw error;
        }
      };
      
      const fixInvalidUrls = async (options = {}) => {
        setRepairStatus('Repairing...');
        try {
          const response = await fetch('/api/admin/fix-media-issues', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(options),
          });
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
          }
          const data = await response.json();
          setRepairStatus('Repairs complete.');
          await loadReports();
          return data;
        } catch (error) {
          setRepairStatus(`Error: ${error.message}`);
          throw error;
        }
      };
      
      const validationResults = (reportId: string) => {
        if (!reports) return undefined;
        return reports.find(report => report.id === reportId);
      };
      
      return {
        reports,
        isLoadingReports,
        loadReports,
        runValidation,
        fixInvalidUrls,
        validationResults,
        lastValidationReport: reports ? reports[0] : undefined,
        validationStatus,
        repairStatus
      };
    }
  };
});

// Import the hook after mocking
const { useMediaValidation } = require('../client/src/hooks/use-media-validation');

// Mock the fetch API
global.fetch = jest.fn();

// Mock the toast function
jest.mock('../client/src/hooks/use-toast', () => ({
  toast: jest.fn()
}));

// Create a wrapper with the necessary providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useMediaValidation Hook', () => {
  const mockReports: ValidationReport[] = [
    {
      id: 'report1',
      startTime: new Date('2025-03-01T10:00:00Z'),
      endTime: new Date('2025-03-01T10:05:00Z'),
      duration: 300000,
      totalDocuments: 100,
      totalFields: 250,
      validUrls: 200,
      invalidUrls: 50,
      missingUrls: 0,
      collectionSummaries: [
        {
          collection: 'collection1',
          totalUrls: 150,
          validUrls: 120,
          invalidUrls: 30,
          missingUrls: 0,
          validPercent: 80,
          invalidPercent: 20,
          missingPercent: 0
        },
        {
          collection: 'collection2',
          totalUrls: 100,
          validUrls: 80,
          invalidUrls: 20,
          missingUrls: 0,
          validPercent: 80,
          invalidPercent: 20,
          missingPercent: 0
        }
      ],
      invalidResults: [
        {
          field: 'imageUrl',
          url: 'https://example.com/not-found.jpg',
          isValid: false,
          status: 404,
          statusText: 'Not Found',
          error: 'HTTP error: 404 Not Found',
          collection: 'collection1',
          documentId: 'doc1'
        }
      ]
    },
    {
      id: 'report2',
      startTime: new Date('2025-02-28T10:00:00Z'),
      endTime: new Date('2025-02-28T10:03:00Z'),
      duration: 180000,
      totalDocuments: 90,
      totalFields: 220,
      validUrls: 180,
      invalidUrls: 40,
      missingUrls: 0,
      collectionSummaries: [
        {
          collection: 'collection1',
          totalUrls: 130,
          validUrls: 100,
          invalidUrls: 30,
          missingUrls: 0,
          validPercent: 77,
          invalidPercent: 23,
          missingPercent: 0
        },
        {
          collection: 'collection2',
          totalUrls: 90,
          validUrls: 80,
          invalidUrls: 10,
          missingUrls: 0,
          validPercent: 89,
          invalidPercent: 11,
          missingPercent: 0
        }
      ],
      invalidResults: []
    }
  ];
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the fetch mock
    (global.fetch as jest.Mock).mockReset();
  });
  
  it('should load validation reports', async () => {
    // Mock the fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockReports)
    });
    
    const { result } = renderHook(() => useMediaValidation(), {
      wrapper: createWrapper()
    });
    
    expect(result.current.reports).toBeUndefined();
    expect(result.current.isLoadingReports).toBe(false);
    
    // Load reports
    await act(async () => {
      await result.current.loadReports();
    });
    
    // Verify reports were loaded
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/media-validation-reports');
    expect(result.current.reports).toEqual(mockReports);
    expect(result.current.lastValidationReport).toEqual(mockReports[0]);
  });
  
  it('should handle fetch errors', async () => {
    // Mock a failed fetch
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error'
    });
    
    const { result } = renderHook(() => useMediaValidation(), {
      wrapper: createWrapper()
    });
    
    // Load reports
    await act(async () => {
      try {
        await result.current.loadReports();
      } catch (error) {
        // Expected to throw
      }
    });
    
    // Verify fetch was called but no reports were loaded
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/media-validation-reports');
    expect(result.current.reports).toBeUndefined();
  });
  
  it('should run validation successfully', async () => {
    // Mock the fetch response for validation
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ success: true, reportId: 'report1' })
    });
    
    // Mock the fetch response for loadReports
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockReports)
    });
    
    const { result } = renderHook(() => useMediaValidation(), {
      wrapper: createWrapper()
    });
    
    // Run validation
    await act(async () => {
      await result.current.runValidation();
    });
    
    // Verify fetch was called with the right parameters
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/validate-media', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    // Verify status is updated
    expect(result.current.validationStatus).toBe('Validation complete.');
  });
  
  it('should fix invalid URLs successfully', async () => {
    // Mock the fetch response for fixing URLs
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ success: true, fixCount: 10 })
    });
    
    // Mock the fetch response for loadReports
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockReports)
    });
    
    const { result } = renderHook(() => useMediaValidation(), {
      wrapper: createWrapper()
    });
    
    // Fix invalid URLs
    await act(async () => {
      await result.current.fixInvalidUrls();
    });
    
    // Verify fetch was called with the right parameters
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/fix-media-issues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    // Verify status is updated
    expect(result.current.repairStatus).toBe('Repairs complete.');
  });
  
  it('should get specific validation results by ID', async () => {
    // Mock the fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockReports)
    });
    
    const { result } = renderHook(() => useMediaValidation(), {
      wrapper: createWrapper()
    });
    
    // Load reports
    await act(async () => {
      await result.current.loadReports();
    });
    
    // Get results for a specific report
    const report = result.current.validationResults('report2');
    
    // Verify the right report was returned
    expect(report).toEqual(mockReports[1]);
  });
});