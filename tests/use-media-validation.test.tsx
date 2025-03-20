/**
 * Use Media Validation Hook Tests
 * 
 * This file contains tests for the useMediaValidation hook.
 * It demonstrates how to use our hook testing utilities with React 18.
 */
import { renderHook, act } from '@testing-library/react';
import { renderHookWithProviders } from './hook-test-utils';
import { useMediaValidation } from '../client/src/hooks/use-media-validation';

// Mock the API responses
jest.mock('@/lib/queryClient', () => ({
  apiRequest: jest.fn().mockImplementation((url) => {
    if (url === '/api/admin/validate-media') {
      return Promise.resolve({ taskId: 'mock-task-123' });
    }
    if (url === '/api/admin/fix-relative-urls') {
      return Promise.resolve({ taskId: 'mock-fix-task-456' });
    }
    if (url === '/api/admin/validate-collection') {
      return Promise.resolve({ taskId: 'mock-collection-task-789', collection: 'test_collection' });
    }
    if (url === '/api/admin/validation-tasks') {
      return Promise.resolve([
        {
          taskId: 'mock-task-123',
          type: 'validate-all',
          status: 'processing',
          startTime: new Date(),
          lastUpdate: new Date()
        }
      ]);
    }
    if (url === '/api/admin/media-validation-reports') {
      return Promise.resolve([
        {
          reportId: 'mock-report-123',
          status: 'completed',
          totalDocuments: 100,
          totalMediaItems: 200,
          validItems: 150,
          invalidItems: 50,
          collections: {
            test_collection: {
              totalUrls: 50,
              valid: 40,
              invalid: 10,
              missing: 0
            }
          }
        }
      ]);
    }
    return Promise.reject(new Error('Not implemented'));
  }),
  queryClient: {
    invalidateQueries: jest.fn()
  }
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

describe('useMediaValidation Hook', () => {
  it('should initialize with default state', () => {
    const { result } = renderHookWithProviders(() => useMediaValidation());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isValidating).toBe(false);
    expect(result.current.isFixing).toBe(false);
    expect(result.current.validationReports).toBeUndefined();
    expect(result.current.activeTasks).toBeUndefined();
  });
  
  it('should handle startValidation correctly', async () => {
    const { result, waitForNextUpdate } = renderHookWithProviders(() => useMediaValidation());
    
    act(() => {
      result.current.startValidation();
    });
    
    expect(result.current.isValidating).toBe(true);
    
    await waitForNextUpdate();
    
    expect(result.current.isValidating).toBe(false);
  });
  
  it('should handle fixRelativeUrls correctly', async () => {
    const { result, waitForNextUpdate } = renderHookWithProviders(() => useMediaValidation());
    
    act(() => {
      result.current.fixRelativeUrls();
    });
    
    expect(result.current.isFixing).toBe(true);
    
    await waitForNextUpdate();
    
    expect(result.current.isFixing).toBe(false);
  });
  
  it('should handle validateCollection correctly', async () => {
    const { result, waitForNextUpdate } = renderHookWithProviders(() => useMediaValidation());
    
    act(() => {
      result.current.validateCollection('test_collection');
    });
    
    expect(result.current.isValidating).toBe(true);
    
    await waitForNextUpdate();
    
    expect(result.current.isValidating).toBe(false);
  });
});