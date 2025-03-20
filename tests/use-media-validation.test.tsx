/**
 * Use Media Validation Hook Tests
 * 
 * This file contains tests for the useMediaValidation hook.
 * It demonstrates how to use our hook testing utilities with React 18.
 */
import { renderHookWithProviders, waitFor, act } from './hook-test-utils';
import { useMediaValidation } from '../client/src/hooks/use-media-validation';

// Mock the API responses
const mockValidationResults = [
  {
    id: 'test-validation-1',
    status: 'completed',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    totalImagesChecked: 120,
    totalImagesValid: 100,
    totalImagesInvalid: 20,
    executionTimeMs: 15000
  },
  {
    id: 'test-validation-2',
    status: 'in_progress',
    startTime: new Date().toISOString(),
    endTime: null,
    totalImagesChecked: 50,
    totalImagesValid: 45,
    totalImagesInvalid: 5,
    executionTimeMs: 8000
  }
];

// Mock the axios module
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

const axios = require('axios');

describe('useMediaValidation', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches validation reports on init', async () => {
    // Mock the API response
    axios.get.mockResolvedValueOnce({ data: mockValidationResults });
    
    // Render the hook with all providers
    const { result } = renderHookWithProviders(() => useMediaValidation(), {
      authUser: {
        uid: 'admin-user',
        email: 'admin@example.com',
        role: 'producer' // Admin role for accessing validation
      }
    });
    
    // Initially loading should be true
    expect(result.current.isLoading).toBe(true);
    
    // Wait for the data to be loaded
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Check if the data was loaded correctly
    expect(result.current.validationReports).toEqual(mockValidationResults);
    expect(axios.get).toHaveBeenCalledWith('/api/admin/image-validation-reports');
  });

  it('starts a new validation run', async () => {
    // Mock the API responses
    axios.get.mockResolvedValueOnce({ data: mockValidationResults });
    axios.post.mockResolvedValueOnce({ data: { reportId: 'new-validation-id' } });
    
    // Render the hook with all providers
    const { result } = renderHookWithProviders(() => useMediaValidation(), {
      authUser: {
        uid: 'admin-user',
        email: 'admin@example.com',
        role: 'producer'
      }
    });
    
    // Wait for initial data load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Get initial number of reports
    const initialReportsCount = result.current.validationReports.length;
    
    // Start a new validation
    await act(async () => {
      await result.current.startValidation();
    });
    
    // Check if API was called correctly
    expect(axios.post).toHaveBeenCalledWith('/api/admin/validate-images');
    
    // Mock reports being refreshed after starting validation
    axios.get.mockResolvedValueOnce({ 
      data: [...mockValidationResults, {
        id: 'new-validation-id',
        status: 'in_progress',
        startTime: new Date().toISOString(),
        endTime: null,
        totalImagesChecked: 0,
        totalImagesValid: 0,
        totalImagesInvalid: 0,
        executionTimeMs: 0
      }]
    });
    
    // Refresh reports
    await act(async () => {
      await result.current.refreshReports();
    });
    
    // Check if reports were updated
    expect(result.current.validationReports.length).toBe(initialReportsCount + 1);
  });
});