/**
 * Media Validator Component Tests
 * 
 * This file contains tests for the media validation components.
 * It demonstrates how to use our testing utilities with React 18.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { customRender } from './react-test-utils';

// Mock the useMediaValidation hook
jest.mock('../client/src/hooks/use-media-validation', () => {
  return {
    useMediaValidation: () => ({
      reports: [
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
        }
      ],
      lastValidationReport: {
        id: 'report1',
        startTime: new Date('2025-03-01T10:00:00Z'),
        endTime: new Date('2025-03-01T10:05:00Z'),
        invalidUrls: 50,
        validUrls: 200,
        totalDocuments: 100
      },
      isLoadingReports: false,
      loadReports: jest.fn().mockResolvedValue({}),
      runValidation: jest.fn().mockResolvedValue({ success: true, reportId: 'report1' }),
      fixInvalidUrls: jest.fn().mockResolvedValue({ success: true, fixCount: 10 }),
      validationResults: jest.fn((id) => ({
        id,
        startTime: new Date('2025-03-01T10:00:00Z'),
        endTime: new Date('2025-03-01T10:05:00Z'),
        invalidUrls: 50,
        validUrls: 200
      })),
      validationStatus: '',
      repairStatus: ''
    })
  };
});

// Import components after mocking hooks
const { MediaValidationPanel } = require('../client/src/components/admin/MediaValidationPanel');

describe('MediaValidationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders the media validation panel', async () => {
    customRender(<MediaValidationPanel />, { 
      authUser: { uid: 'admin-user', email: 'admin@example.com', role: 'admin' }
    });
    
    // Check basic elements exist
    expect(screen.getByText(/Media Validation/i)).toBeInTheDocument();
    expect(screen.getByText(/Run Validation/i)).toBeInTheDocument();
    
    // Check validation stats are displayed
    expect(screen.getByText(/50/i)).toBeInTheDocument(); // invalid URLs
    expect(screen.getByText(/200/i)).toBeInTheDocument(); // valid URLs
    
    // Check fix button exists
    expect(screen.getByText(/Fix All Issues/i)).toBeInTheDocument();
  });
  
  it('triggers validation when run button is clicked', async () => {
    const { useMediaValidation } = require('../client/src/hooks/use-media-validation');
    
    customRender(<MediaValidationPanel />, { 
      authUser: { uid: 'admin-user', email: 'admin@example.com', role: 'admin' }
    });
    
    // Click the run validation button
    fireEvent.click(screen.getByText(/Run Validation/i));
    
    // Check validation was triggered
    await waitFor(() => {
      expect(useMediaValidation().runValidation).toHaveBeenCalled();
    });
  });
  
  it('triggers URL repair when fix button is clicked', async () => {
    const { useMediaValidation } = require('../client/src/hooks/use-media-validation');
    
    customRender(<MediaValidationPanel />, { 
      authUser: { uid: 'admin-user', email: 'admin@example.com', role: 'admin' }
    });
    
    // Click the fix issues button
    fireEvent.click(screen.getByText(/Fix All Issues/i));
    
    // Check repair was triggered
    await waitFor(() => {
      expect(useMediaValidation().fixInvalidUrls).toHaveBeenCalled();
    });
  });
  
  it('displays validation details when a report is selected', async () => {
    customRender(<MediaValidationPanel />, { 
      authUser: { uid: 'admin-user', email: 'admin@example.com', role: 'admin' }
    });
    
    // Click view details button/link (implementation dependent)
    const detailsButton = screen.getByText(/View Details/i);
    fireEvent.click(detailsButton);
    
    // Check detailed info is displayed
    await waitFor(() => {
      expect(screen.getByText(/Invalid Media URLs/i)).toBeInTheDocument();
    });
  });
});