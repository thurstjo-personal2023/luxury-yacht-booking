/**
 * Use Media Validation Hook Tests
 * 
 * This file contains tests for the useMediaValidation hook.
 * It demonstrates how to use our hook testing utilities with React 18.
 */
import React from 'react';
import { renderHookWithProviders } from './hook-test-utils';
import { useMediaValidation, ValidationReport, ValidationTask } from '../client/src/hooks/use-media-validation';
import { act } from '@testing-library/react';

// Mock fetch globally
global.fetch = jest.fn();

describe('useMediaValidation', () => {
  // Set up fetch mock before each test
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock validation reports endpoint
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/admin/media-validation-reports') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            reports: [
              {
                id: 'report-1',
                timestamp: 1616161616,
                stats: {
                  documentCount: 100,
                  fieldCount: 300,
                  invalidFieldCount: 10,
                  relativeUrlCount: 5,
                  imageCount: 250,
                  videoCount: 50,
                  byCollection: {
                    collection1: {
                      documentCount: 50,
                      invalidCount: 5,
                      relativeCount: 2
                    },
                    collection2: {
                      documentCount: 50,
                      invalidCount: 5,
                      relativeCount: 3
                    }
                  },
                  validationTimeMs: 2000
                },
                invalid: [{ url: 'https://example.com/bad.jpg', error: 'Not found' }],
                relative: [{ url: '/images/relative.jpg' }]
              }
            ]
          })
        });
      } else if (url === '/api/admin/url-repair-reports') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            reports: [
              {
                id: 'fix-1',
                timestamp: 1616161617,
                stats: {
                  documentCount: 50,
                  fixedDocumentCount: 20,
                  fixedFieldCount: 25,
                  byCollection: {
                    collection1: {
                      documentCount: 25,
                      fixedCount: 15
                    },
                    collection2: {
                      documentCount: 25,
                      fixedCount: 10
                    }
                  },
                  fixTimeMs: 1500
                },
                fixes: []
              }
            ]
          })
        });
      } else if (url === '/api/admin/active-validation-tasks') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            tasks: []
          })
        });
      } else if (url === '/api/admin/collections') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            collections: {
              collection1: {
                documentCount: 50,
                mediaCount: 150,
                issueCount: 5,
                lastValidated: 1616161616
              },
              collection2: {
                documentCount: 50,
                mediaCount: 150,
                issueCount: 5,
                lastValidated: 1616161616
              }
            }
          })
        });
      } else if (url === '/api/admin/validation-schedules') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            schedules: [
              {
                id: 'schedule-1',
                name: 'Daily Validation',
                enabled: true,
                intervalHours: 24,
                collections: [],
                fixRelativeUrls: true,
                lastRunTime: 1616161616,
                lastStatus: 'success'
              }
            ]
          })
        });
      } else if (url.startsWith('/api/admin/media-validation/')) {
        const reportId = url.split('/').pop();
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: reportId,
            timestamp: 1616161616,
            stats: {
              documentCount: 100,
              fieldCount: 300,
              invalidFieldCount: 10,
              relativeUrlCount: 5,
              imageCount: 250,
              videoCount: 50,
              byCollection: {},
              validationTimeMs: 2000
            },
            invalid: [{ url: 'https://example.com/bad.jpg', error: 'Not found' }],
            relative: [{ url: '/images/relative.jpg' }]
          })
        });
      }
      
      // Default response
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  });
  
  it('should load validation reports', async () => {
    // Render the hook with providers
    const { result } = renderHookWithProviders(() => useMediaValidation());
    
    // First, it should be loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for data to load
    await act(async () => {
      // Wait for promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Now data should be loaded
    expect(result.current.validationReports).toBeDefined();
    expect(result.current.validationReports?.length).toBe(1);
    expect(result.current.validationReports?.[0].id).toBe('report-1');
  });
  
  it('should load URL fix reports', async () => {
    // Render the hook with providers
    const { result } = renderHookWithProviders(() => useMediaValidation());
    
    // Wait for data to load
    await act(async () => {
      // Wait for promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Check fix reports
    expect(result.current.urlFixReports).toBeDefined();
    expect(result.current.urlFixReports?.length).toBe(1);
    expect(result.current.urlFixReports?.[0].id).toBe('fix-1');
  });
  
  it('should run validation', async () => {
    // Mock the POST endpoint
    (fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url === '/api/admin/validate-media' && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            taskId: 'task-123'
          })
        });
      }
      
      // Default to original mock
      return global.fetch(url);
    });
    
    // Render the hook with providers
    const { result } = renderHookWithProviders(() => useMediaValidation());
    
    // Wait for data to load
    await act(async () => {
      // Wait for promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Run validation
    let response;
    await act(async () => {
      response = await result.current.runValidation();
    });
    
    // Check response
    expect(response).toEqual({ taskId: 'task-123' });
    
    // Verify fetch was called
    expect(fetch).toHaveBeenCalledWith('/api/admin/validate-media', { method: 'POST' });
  });
  
  it('should fix broken URLs', async () => {
    // Mock the POST endpoint
    (fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url === '/api/admin/fix-relative-urls' && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            taskId: 'task-456'
          })
        });
      }
      
      // Default to original mock
      return global.fetch(url);
    });
    
    // Render the hook with providers
    const { result } = renderHookWithProviders(() => useMediaValidation());
    
    // Wait for data to load
    await act(async () => {
      // Wait for promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Fix broken URLs
    let response;
    await act(async () => {
      response = await result.current.fixBrokenUrls();
    });
    
    // Check response
    expect(response).toEqual({ taskId: 'task-456' });
    
    // Verify fetch was called
    expect(fetch).toHaveBeenCalledWith('/api/admin/fix-relative-urls', { method: 'POST' });
  });
  
  it('should calculate progress correctly', () => {
    // Render the hook with providers
    const { result } = renderHookWithProviders(() => useMediaValidation());
    
    // Create a sample report
    const report: ValidationReport = {
      id: 'report-1',
      timestamp: 1616161616,
      stats: {
        documentCount: 100,
        fieldCount: 50,
        invalidFieldCount: 10,
        relativeUrlCount: 5,
        imageCount: 40,
        videoCount: 10,
        byCollection: {},
        validationTimeMs: 1000
      },
      invalid: [],
      relative: []
    };
    
    // Calculate progress
    const progress = result.current.calculateProgress(report);
    
    // Should be 50%
    expect(progress).toBe(50);
  });
});