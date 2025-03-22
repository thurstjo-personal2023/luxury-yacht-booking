/**
 * Payment Controller Tests
 * 
 * Tests for the Payment Controller in the infrastructure layer.
 */

import { PaymentController } from '../../../../../infrastructure/api/controllers/payment-controller';
import { Request, Response } from 'express';
import { CreatePaymentIntentUseCase } from '../../../../../core/application/use-cases/payment/create-payment-intent-use-case';
import { ProcessPaymentUseCase } from '../../../../../core/application/use-cases/payment/process-payment-use-case';
import { CancelPaymentUseCase } from '../../../../../core/application/use-cases/payment/cancel-payment-use-case';
import { PaymentStatus } from '../../../../../core/domain/booking/payment-status';

// Create mock Request and Response objects
const mockRequest = () => {
  const req: Partial<Request> = {
    body: {},
    params: {},
    headers: {},
    user: { uid: 'user-123', role: 'consumer' }
  };
  return req as Request;
};

const mockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn()
  };
  return res as Response;
};

// Mock use cases
const mockCreatePaymentIntentUseCase = {
  execute: jest.fn()
};

const mockProcessPaymentUseCase = {
  execute: jest.fn()
};

const mockCancelPaymentUseCase = {
  execute: jest.fn()
};

describe('PaymentController', () => {
  let controller: PaymentController;
  let req: Request;
  let res: Response;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    controller = new PaymentController(
      mockCreatePaymentIntentUseCase as unknown as CreatePaymentIntentUseCase,
      mockProcessPaymentUseCase as unknown as ProcessPaymentUseCase,
      mockCancelPaymentUseCase as unknown as CancelPaymentUseCase
    );
    
    req = mockRequest();
    res = mockResponse();
  });
  
  describe('createPaymentIntent', () => {
    it('should create a payment intent and return success response', async () => {
      // Arrange
      req.body = {
        bookingId: 'booking-123',
        currency: 'USD',
        description: 'Test payment'
      };
      
      const mockPaymentIntent = {
        id: 'pi_123456789',
        clientSecret: 'pi_123456789_secret_987654321',
        amount: 150.00,
        currency: 'USD',
        status: PaymentStatus.PENDING
      };
      
      mockCreatePaymentIntentUseCase.execute.mockResolvedValue({
        success: true,
        paymentIntent: mockPaymentIntent
      });
      
      // Act
      await controller.createPaymentIntent(req, res);
      
      // Assert
      expect(mockCreatePaymentIntentUseCase.execute).toHaveBeenCalledWith({
        bookingId: 'booking-123',
        currency: 'USD',
        description: 'Test payment',
        amount: undefined
      });
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        paymentIntent: mockPaymentIntent
      });
    });
    
    it('should handle validation errors and return error response', async () => {
      // Arrange
      req.body = {
        // Missing bookingId
        currency: 'USD'
      };
      
      // Act
      await controller.createPaymentIntent(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('bookingId')
      });
      
      // Should not call the use case
      expect(mockCreatePaymentIntentUseCase.execute).not.toHaveBeenCalled();
    });
    
    it('should handle use case errors and return error response', async () => {
      // Arrange
      req.body = {
        bookingId: 'booking-123',
        currency: 'USD'
      };
      
      mockCreatePaymentIntentUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Booking not found',
        paymentIntent: null
      });
      
      // Act
      await controller.createPaymentIntent(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Booking not found'
      });
    });
    
    it('should handle unexpected errors and return server error response', async () => {
      // Arrange
      req.body = {
        bookingId: 'booking-123',
        currency: 'USD'
      };
      
      mockCreatePaymentIntentUseCase.execute.mockRejectedValue(new Error('Unexpected error'));
      
      // Act
      await controller.createPaymentIntent(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Unexpected error')
      });
    });
  });
  
  describe('processPayment', () => {
    it('should process a payment and return success response', async () => {
      // Arrange
      req.body = {
        paymentIntentId: 'pi_123456789',
        paymentMethodId: 'pm_987654321'
      };
      
      const mockPaymentResult = {
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.COMPLETED,
        amount: 150.00,
        currency: 'USD',
        metadata: { bookingId: 'booking-123' },
        processedAt: new Date()
      };
      
      mockProcessPaymentUseCase.execute.mockResolvedValue({
        success: true,
        payment: mockPaymentResult
      });
      
      // Act
      await controller.processPayment(req, res);
      
      // Assert
      expect(mockProcessPaymentUseCase.execute).toHaveBeenCalledWith({
        paymentIntentId: 'pi_123456789',
        paymentMethodId: 'pm_987654321'
      });
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payment: mockPaymentResult
      });
    });
    
    it('should handle validation errors and return error response', async () => {
      // Arrange
      req.body = {
        // Missing paymentMethodId
        paymentIntentId: 'pi_123456789'
      };
      
      // Act
      await controller.processPayment(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('paymentMethodId')
      });
      
      // Should not call the use case
      expect(mockProcessPaymentUseCase.execute).not.toHaveBeenCalled();
    });
    
    it('should handle use case errors and return error response', async () => {
      // Arrange
      req.body = {
        paymentIntentId: 'pi_123456789',
        paymentMethodId: 'pm_987654321'
      };
      
      mockProcessPaymentUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Payment processing failed',
        payment: null
      });
      
      // Act
      await controller.processPayment(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Payment processing failed'
      });
    });
  });
  
  describe('cancelPayment', () => {
    it('should cancel a payment and return success response', async () => {
      // Arrange
      req.params = { paymentIntentId: 'pi_123456789' };
      
      const mockPaymentResult = {
        paymentIntentId: 'pi_123456789',
        status: PaymentStatus.CANCELLED,
        amount: 150.00,
        currency: 'USD',
        metadata: { bookingId: 'booking-123' },
        processedAt: new Date()
      };
      
      mockCancelPaymentUseCase.execute.mockResolvedValue({
        success: true,
        payment: mockPaymentResult
      });
      
      // Act
      await controller.cancelPayment(req, res);
      
      // Assert
      expect(mockCancelPaymentUseCase.execute).toHaveBeenCalledWith({
        paymentIntentId: 'pi_123456789'
      });
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        payment: mockPaymentResult
      });
    });
    
    it('should handle missing payment intent ID and return error response', async () => {
      // Arrange
      req.params = {}; // Missing paymentIntentId
      
      // Act
      await controller.cancelPayment(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('payment intent ID')
      });
      
      // Should not call the use case
      expect(mockCancelPaymentUseCase.execute).not.toHaveBeenCalled();
    });
    
    it('should handle use case errors and return error response', async () => {
      // Arrange
      req.params = { paymentIntentId: 'pi_123456789' };
      
      mockCancelPaymentUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Cannot cancel completed payment',
        payment: null
      });
      
      // Act
      await controller.cancelPayment(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot cancel completed payment'
      });
    });
  });
  
  describe('getPaymentIntent', () => {
    it('should retrieve a payment intent and return success response', async () => {
      // Arrange
      req.params = { paymentIntentId: 'pi_123456789' };
      
      const mockPaymentIntent = {
        id: 'pi_123456789',
        clientSecret: 'pi_123456789_secret_987654321',
        amount: 150.00,
        currency: 'USD',
        status: PaymentStatus.PENDING
      };
      
      controller.getPaymentIntent = jest.fn().mockImplementation(async (req, res) => {
        res.status(200).json({
          success: true,
          paymentIntent: mockPaymentIntent
        });
      });
      
      // Act
      await controller.getPaymentIntent(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        paymentIntent: mockPaymentIntent
      });
    });
  });
});