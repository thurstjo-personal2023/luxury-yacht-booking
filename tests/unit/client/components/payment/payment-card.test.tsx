/**
 * Payment Card Component Tests
 * 
 * Tests for the PaymentCard component.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentCard } from '../../../../../client/src/components/payment/payment-card';
import { customRender } from '../../../../react-test-utils';
import * as stripeJs from '@stripe/stripe-js';
import { CardElement } from '@stripe/react-stripe-js';

// Mock the Stripe libraries
jest.mock('@stripe/react-stripe-js', () => ({
  CardElement: jest.fn(() => <div data-testid="card-element-mock" />),
  useStripe: jest.fn(),
  useElements: jest.fn()
}));

describe('PaymentCard Component', () => {
  const mockProps = {
    amount: 150.00,
    currency: 'USD',
    description: 'Luxury Yacht Booking',
    onPaymentSuccess: jest.fn(),
    onPaymentError: jest.fn(),
    isSubmitting: false,
    clientSecret: 'test_secret_123',
    paymentIntentId: 'pi_123456789'
  };
  
  // Mock Stripe elements and hooks
  const mockStripe = {
    confirmCardPayment: jest.fn(),
    createToken: jest.fn()
  };
  
  const mockElements = {
    getElement: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the useStripe and useElements hooks
    require('@stripe/react-stripe-js').useStripe.mockReturnValue(mockStripe);
    require('@stripe/react-stripe-js').useElements.mockReturnValue(mockElements);
  });
  
  it('should render the payment form correctly', () => {
    // Arrange & Act
    customRender(<PaymentCard {...mockProps} />);
    
    // Assert
    expect(screen.getByText(/Payment Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Luxury Yacht Booking/i)).toBeInTheDocument();
    expect(screen.getByText(/150.00 USD/i)).toBeInTheDocument();
    expect(screen.getByTestId('card-element-mock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pay Now/i })).toBeInTheDocument();
  });
  
  it('should show loading state when isSubmitting is true', () => {
    // Arrange & Act
    customRender(<PaymentCard {...mockProps} isSubmitting={true} />);
    
    // Assert
    const payButton = screen.getByRole('button', { name: /Processing/i });
    expect(payButton).toBeInTheDocument();
    expect(payButton).toBeDisabled();
  });
  
  it('should handle successful payment submission', async () => {
    // Arrange
    mockStripe.confirmCardPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_123', status: 'succeeded' },
      error: undefined
    });
    
    // Set up successful card validation
    mockElements.getElement.mockReturnValue({
      on: (event, callback) => {
        if (event === 'change') {
          callback({ complete: true, error: undefined });
        }
      }
    });
    
    // Act
    customRender(<PaymentCard {...mockProps} />);
    
    // Ensure form is valid first
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pay Now/i })).not.toBeDisabled();
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Pay Now/i }));
    
    // Assert
    await waitFor(() => {
      expect(mockStripe.confirmCardPayment).toHaveBeenCalledWith(
        'test_secret_123',
        { payment_method: { card: expect.anything() } }
      );
      expect(mockProps.onPaymentSuccess).toHaveBeenCalledWith({
        paymentIntentId: 'pi_123',
        status: 'succeeded'
      });
    });
  });
  
  it('should handle payment errors', async () => {
    // Arrange
    const errorMessage = 'Your card was declined';
    mockStripe.confirmCardPayment.mockResolvedValue({
      paymentIntent: undefined,
      error: { message: errorMessage }
    });
    
    // Set up successful card validation
    mockElements.getElement.mockReturnValue({
      on: (event, callback) => {
        if (event === 'change') {
          callback({ complete: true, error: undefined });
        }
      }
    });
    
    // Act
    customRender(<PaymentCard {...mockProps} />);
    
    // Ensure form is valid first
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pay Now/i })).not.toBeDisabled();
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Pay Now/i }));
    
    // Assert
    await waitFor(() => {
      expect(mockStripe.confirmCardPayment).toHaveBeenCalled();
      expect(mockProps.onPaymentError).toHaveBeenCalledWith(errorMessage);
    });
  });
  
  it('should disable the submit button when card info is incomplete', async () => {
    // Arrange
    mockElements.getElement.mockReturnValue({
      on: (event, callback) => {
        if (event === 'change') {
          callback({ complete: false, error: undefined });
        }
      }
    });
    
    // Act
    customRender(<PaymentCard {...mockProps} />);
    
    // Assert
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pay Now/i })).toBeDisabled();
    });
  });
  
  it('should display card error when validation fails', async () => {
    // Arrange
    const validationError = 'Card number is incomplete';
    mockElements.getElement.mockReturnValue({
      on: (event, callback) => {
        if (event === 'change') {
          callback({ complete: false, error: { message: validationError } });
        }
      }
    });
    
    // Act
    customRender(<PaymentCard {...mockProps} />);
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText(validationError)).toBeInTheDocument();
    });
  });
  
  it('should handle error when Stripe is not initialized', async () => {
    // Arrange
    require('@stripe/react-stripe-js').useStripe.mockReturnValue(null);
    
    // Act
    customRender(<PaymentCard {...mockProps} />);
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Pay Now/i }));
    
    // Assert
    await waitFor(() => {
      expect(mockProps.onPaymentError).toHaveBeenCalledWith(
        expect.stringContaining('Stripe has not been properly initialized')
      );
    });
  });
  
  it('should handle error when Elements is not initialized', async () => {
    // Arrange
    require('@stripe/react-stripe-js').useElements.mockReturnValue(null);
    
    // Act
    customRender(<PaymentCard {...mockProps} />);
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Pay Now/i }));
    
    // Assert
    await waitFor(() => {
      expect(mockProps.onPaymentError).toHaveBeenCalledWith(
        expect.stringContaining('Stripe Elements has not been properly initialized')
      );
    });
  });
});