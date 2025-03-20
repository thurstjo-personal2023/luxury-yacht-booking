/**
 * Media Validator Component Tests
 * 
 * This file contains tests for the media validation components.
 * It demonstrates how to use our testing utilities with React 18.
 */
import React from 'react';
import { customRender, screen, fireEvent, waitFor } from './react-test-utils';
import { MediaValidationStatus } from '../client/src/types/media-validation';
import { MediaValidationResultItem } from '../client/src/components/admin/MediaValidationResultItem';

// Mock the media validation status data
const mockValidationResult: MediaValidationStatus = {
  id: 'test-validation-1',
  status: 'completed',
  startTime: new Date().toISOString(),
  endTime: new Date().toISOString(),
  totalImagesChecked: 120,
  totalImagesValid: 100,
  totalImagesInvalid: 20,
  executionTimeMs: 15000,
  invalidItems: [
    {
      collectionId: 'unified_yacht_experiences',
      documentId: 'yacht-123',
      fieldPath: 'media.[0].url',
      url: '/yacht-placeholder.jpg',
      reason: 'Request failed',
      error: 'Invalid URL'
    },
    {
      collectionId: 'products_add_ons',
      documentId: 'addon-456',
      fieldPath: 'media.[0].url',
      url: 'https://storage.googleapis.com/missing-image.jpg',
      reason: 'Request failed',
      statusCode: 404,
      error: 'Not Found'
    }
  ]
};

// Mock component properties
const mockProps = {
  item: mockValidationResult.invalidItems[0],
  onResolve: jest.fn(),
  isResolving: false
};

describe('MediaValidationResultItem', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders item information correctly', () => {
    customRender(<MediaValidationResultItem {...mockProps} />);
    
    // Check if component renders the invalid URL information
    expect(screen.getByText(/unified_yacht_experiences/i)).toBeInTheDocument();
    expect(screen.getByText(/yacht-123/i)).toBeInTheDocument();
    expect(screen.getByText(/media.\[0\].url/i)).toBeInTheDocument();
    expect(screen.getByText(/\/yacht-placeholder.jpg/i)).toBeInTheDocument();
    expect(screen.getByText(/Request failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Invalid URL/i)).toBeInTheDocument();
    
    // Check if resolve button is present
    const resolveButton = screen.getByRole('button', { name: /resolve/i });
    expect(resolveButton).toBeInTheDocument();
    expect(resolveButton).not.toBeDisabled();
  });

  it('disables resolve button when resolving', () => {
    customRender(<MediaValidationResultItem {...mockProps} isResolving={true} />);
    
    // Check if resolve button is disabled
    const resolveButton = screen.getByRole('button', { name: /resolve/i });
    expect(resolveButton).toBeDisabled();
  });

  it('calls onResolve when resolve button is clicked', async () => {
    customRender(<MediaValidationResultItem {...mockProps} />);
    
    // Click the resolve button
    const resolveButton = screen.getByRole('button', { name: /resolve/i });
    fireEvent.click(resolveButton);
    
    // Check if onResolve was called with the correct item
    await waitFor(() => {
      expect(mockProps.onResolve).toHaveBeenCalledTimes(1);
      expect(mockProps.onResolve).toHaveBeenCalledWith(mockProps.item);
    });
  });
});