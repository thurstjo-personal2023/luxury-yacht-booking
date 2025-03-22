/**
 * Use Payment Hook Tests
 * 
 * This file contains tests for the usePayment custom hook.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { renderHookWithProviders } from '../../../hook-test-utils';
import { usePayment } from '../../../../client/src/hooks/use-payment';
import { PaymentService } from '../../../../client/src/lib/payment-service';

// Mock the payment service
jest.mock('../../../../client/src/lib/payment-service');

describe('usePayment Hook', () => {
  // Mock implementation of the PaymentService
  const mockPaymentService = {
    createPaymentIntent: jest.fn(),
    processPayment: jest.fn(),
    cancelPayment: jest.fn(),
    getPaymentIntent: jest.fn()
  } as jest.Mocked<PaymentService>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reassign the mock implementation to ensure clean state
    (PaymentService as jest.Mock).mockImplementation(() => mockPaymentService);
  });
  
  it('should initialize with default state', () => {
    // Act
    const { result } = renderHookWithProviders(() => usePayment());
    
    // Assert
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.paymentIntent).toBeNull();
    expect(result.current.paymentStatus).toBeNull();
  });
  
  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      // Arrange
      const mockPaymentIntent = {
        id: 'pi_123456789',
        clientSecret: 'pi_123456789_secret_987654321',
        amount: 150.00,
        currency: 'USD'
      };
      
      mockPaymentService.createPaymentIntent.mockResolvedValue({
        success: true,
        paymentIntent: mockPaymentIntent
      });
      
      // Act
      const { result, waitForNextUpdate } = renderHookWithProviders(() => usePayment());
      
      act(() => {
        result.current.createPaymentIntent({
          bookingId: 'booking-123',
          currency: 'USD',
          description: 'Test payment'
        });
      });
      
      // Assert - initial loading state
      expect(result.current.isLoading).toBe(true);
      
      // Wait for the async operation to complete
      await waitForNextUpdate();
      
      // Assert - final state
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.paymentIntent).toEqual(mockPaymentIntent);
      
      // Verify service call
      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith({
        bookingId: 'booking-123',
        currency: 'USD',
        description: 'Test payment'
      });
    });
    
    it('should handle errors when creating a payment intent', async () => {
      // Arrange
      const errorMessage = 'Failed to create payment intent';
      
      mockPaymentService.createPaymentIntent.mockResolvedValue({
        success: false,
        error: errorMessage,
        paymentIntent: null
      });
      
      // Act
      const { result, waitForNextUpdate } = renderHookWithProviders(() => usePayment());
      
      act(() => {
        result.current.createPaymentIntent({
          bookingId: 'booking-123',
          currency: 'USD'
        });
      });
      
      // Wait for the async operation to complete
      await waitForNextUpdate();
      
      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.paymentIntent).toBeNull();
    });
  });
  
  describe('processPayment', () => {
    it('should process a payment successfully', async () => {
      // Arrange
      const mockPaymentResult = {
        paymentIntentId: 'pi_123456789',
        status: 'completed',
        amount: 150.00,
        currency: 'USD'
      };
      
      mockPaymentService.processPayment.mockResolvedValue({
        success: true,
        payment: mockPaymentResult
      });
      
      // Act
      const { result, waitForNextUpdate } = renderHookWithProviders(() => usePayment());
      
      act(() => {
        result.current.processPayment({
          paymentIntentId: 'pi_123456789',
          paymentMethodId: 'pm_987654321'
        });
      });
      
      // Assert - initial loading state
      expect(result.current.isLoading).toBe(true);
      
      // Wait for the async operation to complete
      await waitForNextUpdate();
      
      // Assert - final state
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.paymentStatus).toBe('completed');
      
      // Verify service call
      expect(mockPaymentService.processPayment).toHaveBeenCalledWith({
        paymentIntentId: 'pi_123456789',
        paymentMethodId: 'pm_987654321'
      });
    });
    
    it('should handle errors when processing payment', async () => {
      // Arrange
      const errorMessage = 'Payment processing failed';
      
      mockPaymentService.processPayment.mockResolvedValue({
        success: false,
        error: errorMessage,
        payment: null
      });
      
      // Act
      const { result, waitForNextUpdate } = renderHookWithProviders(() => usePayment());
      
      act(() => {
        result.current.processPayment({
          paymentIntentId: 'pi_123456789',
          paymentMethodId: 'pm_987654321'
        });
      });
      
      // Wait for the async operation to complete
      await waitForNextUpdate();
      
      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.paymentStatus).toBeNull();
    });
  });
  
  describe('cancelPayment', () => {
    it('should cancel a payment successfully', async () => {
      // Arrange
      const mockPaymentResult = {
        paymentIntentId: 'pi_123456789',
        status: 'cancelled',
        amount: 150.00,
        currency: 'USD'
      };
      
      mockPaymentService.cancelPayment.mockResolvedValue({
        success: true,
        payment: mockPaymentResult
      });
      
      // Act
      const { result, waitForNextUpdate } = renderHookWithProviders(() => usePayment());
      
      act(() => {
        result.current.cancelPayment('pi_123456789');
      });
      
      // Assert - initial loading state
      expect(result.current.isLoading).toBe(true);
      
      // Wait for the async operation to complete
      await waitForNextUpdate();
      
      // Assert - final state
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.paymentStatus).toBe('cancelled');
      
      // Verify service call
      expect(mockPaymentService.cancelPayment).toHaveBeenCalledWith('pi_123456789');
    });
    
    it('should handle errors when cancelling payment', async () => {
      // Arrange
      const errorMessage = 'Cannot cancel payment';
      
      mockPaymentService.cancelPayment.mockResolvedValue({
        success: false,
        error: errorMessage,
        payment: null
      });
      
      // Act
      const { result, waitForNextUpdate } = renderHookWithProviders(() => usePayment());
      
      act(() => {
        result.current.cancelPayment('pi_123456789');
      });
      
      // Wait for the async operation to complete
      await waitForNextUpdate();
      
      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.paymentStatus).toBeNull();
    });
  });
  
  describe('getPaymentIntent', () => {
    it('should get a payment intent successfully', async () => {
      // Arrange
      const mockPaymentIntent = {
        id: 'pi_123456789',
        clientSecret: 'pi_123456789_secret_987654321',
        amount: 150.00,
        currency: 'USD'
      };
      
      mockPaymentService.getPaymentIntent.mockResolvedValue({
        success: true,
        paymentIntent: mockPaymentIntent
      });
      
      // Act
      const { result, waitForNextUpdate } = renderHookWithProviders(() => usePayment());
      
      act(() => {
        result.current.getPaymentIntent('pi_123456789');
      });
      
      // Assert - initial loading state
      expect(result.current.isLoading).toBe(true);
      
      // Wait for the async operation to complete
      await waitForNextUpdate();
      
      // Assert - final state
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.paymentIntent).toEqual(mockPaymentIntent);
      
      // Verify service call
      expect(mockPaymentService.getPaymentIntent).toHaveBeenCalledWith('pi_123456789');
    });
    
    it('should handle errors when getting payment intent', async () => {
      // Arrange
      const errorMessage = 'Payment intent not found';
      
      mockPaymentService.getPaymentIntent.mockResolvedValue({
        success: false,
        error: errorMessage,
        paymentIntent: null
      });
      
      // Act
      const { result, waitForNextUpdate } = renderHookWithProviders(() => usePayment());
      
      act(() => {
        result.current.getPaymentIntent('pi_123456789');
      });
      
      // Wait for the async operation to complete
      await waitForNextUpdate();
      
      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.paymentIntent).toBeNull();
    });
  });
  
  it('should reset state when calling clearError', () => {
    // Arrange
    const { result } = renderHookWithProviders(() => usePayment());
    
    // Set some initial error state
    act(() => {
      result.current.setError('Test error');
    });
    
    expect(result.current.error).toBe('Test error');
    
    // Act
    act(() => {
      result.current.clearError();
    });
    
    // Assert
    expect(result.current.error).toBeNull();
  });
});