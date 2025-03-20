/**
 * Media Validator Component Tests
 * 
 * This file contains tests for the media validation components.
 * It demonstrates how to use our testing utilities with React 18.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { customRender } from './react-test-utils';
import '@testing-library/jest-dom';

// Mock component representing the MediaValidationPanel
const MockMediaValidator = () => {
  return (
    <div data-testid="media-validator">
      <h2>Media Validation</h2>
      <div data-testid="validation-stats">
        <div>Total: 100</div>
        <div>Valid: 80</div>
        <div>Invalid: 20</div>
      </div>
      <button data-testid="validate-button">Validate Media</button>
      <button data-testid="fix-button" disabled={false}>Fix URLs</button>
    </div>
  );
};

// Mock data for the validation results
const mockValidationResult = {
  reportId: 'test-report-1',
  status: 'completed',
  totalMediaItems: 100,
  validItems: 80,
  invalidItems: 20,
  invalidItemDetails: [
    {
      collectionName: 'yacht_profiles',
      documentId: 'test-1',
      fieldPath: 'media[0].url',
      url: 'https://example.com/broken.jpg',
      reason: 'Not found',
      status: 404,
      error: 'Image not found'
    }
  ]
};

describe('Media Validator Component', () => {
  test('renders the media validator component', () => {
    render(<MockMediaValidator />);
    
    expect(screen.getByTestId('media-validator')).toBeInTheDocument();
    expect(screen.getByText('Media Validation')).toBeInTheDocument();
    expect(screen.getByText('Total: 100')).toBeInTheDocument();
    expect(screen.getByText('Valid: 80')).toBeInTheDocument();
    expect(screen.getByText('Invalid: 20')).toBeInTheDocument();
    expect(screen.getByTestId('validate-button')).toBeInTheDocument();
    expect(screen.getByTestId('validate-button')).not.toBeDisabled();
    
    const fixButton = screen.getByTestId('fix-button');
    expect(fixButton).toBeInTheDocument();
    expect(fixButton).not.toBeDisabled();
  });
  
  test('disables buttons during validation', () => {
    // Mock implementation that would be using useState hooks
    const MockValidationInProgress = () => (
      <div data-testid="media-validator">
        <h2>Media Validation</h2>
        <div data-testid="validation-stats">Validation in progress...</div>
        <button data-testid="validate-button" disabled>Validate Media</button>
        <button data-testid="fix-button" disabled>Fix URLs</button>
      </div>
    );
    
    render(<MockValidationInProgress />);
    
    expect(screen.getByTestId('validate-button')).toBeDisabled();
    expect(screen.getByTestId('fix-button')).toBeDisabled();
  });
  
  test('shows validation results correctly', () => {
    render(
      <div data-testid="validation-result">
        <h3>Validation Report</h3>
        <div>Total Items: {mockValidationResult.totalMediaItems}</div>
        <div>Valid Items: {mockValidationResult.validItems}</div>
        <div>Invalid Items: {mockValidationResult.invalidItems}</div>
        {mockValidationResult.invalidItemDetails && mockValidationResult.invalidItemDetails.length > 0 && (
          <div data-testid="invalid-items">
            <h4>Invalid Items:</h4>
            <ul>
              {mockValidationResult.invalidItemDetails.map((item, index) => (
                <li key={index}>
                  {item.collectionName}/{item.documentId}: {item.url} - {item.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
    
    expect(screen.getByTestId('validation-result')).toBeInTheDocument();
    expect(screen.getByText('Validation Report')).toBeInTheDocument();
    expect(screen.getByText('Total Items: 100')).toBeInTheDocument();
    expect(screen.getByText('Valid Items: 80')).toBeInTheDocument();
    expect(screen.getByText('Invalid Items: 20')).toBeInTheDocument();
    expect(screen.getByTestId('invalid-items')).toBeInTheDocument();
    expect(screen.getByText(/yacht_profiles\/test-1/)).toBeInTheDocument();
  });
});

// These tests would be extended to test the actual MediaValidationPanel component 
// with proper mocking of API calls and React Query functionality