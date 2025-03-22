/**
 * Payment Routes Tests
 * 
 * Tests for the Payment Routes in the infrastructure layer.
 */

import express, { Express } from 'express';
import request from 'supertest';
import { registerPaymentRoutes } from '../../../../../infrastructure/api/routes/payment-routes';
import { PaymentController } from '../../../../../infrastructure/api/controllers/payment-controller';
import { PaymentStatus } from '../../../../../core/domain/booking/payment-status';

// Mock the payment controller
jest.mock('../../../../../infrastructure/api/controllers/payment-controller');

describe('Payment Routes', () => {
  let app: Express;
  let mockedController: jest.Mocked<PaymentController>;
  
  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Create an Express app
    app = express();
    app.use(express.json());
    
    // Cast the mocked controller to the expected type
    mockedController = new PaymentController() as jest.Mocked<PaymentController>;
    
    // Register routes
    registerPaymentRoutes(app, mockedController);
  });
  
  describe('POST /api/payments/intent', () => {
    it('should call controller.createPaymentIntent and return response', async () => {
      // Arrange
      const requestBody = {
        bookingId: 'booking-123',
        currency: 'USD',
        description: 'Test payment'
      };
      
      const responseBody = {
        success: true,
        paymentIntent: {
          id: 'pi_123456789',
          clientSecret: 'pi_123456789_secret_987654321',
          amount: 150.00,
          currency: 'USD',
          status: PaymentStatus.PENDING
        }
      };
      
      // Mock implementation of controller methods
      mockedController.createPaymentIntent.mockImplementation((req, res) => {
        res.status(200).json(responseBody);
        return Promise.resolve();
      });
      
      // Act
      const response = await request(app)
        .post('/api/payments/intent')
        .send(requestBody);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(responseBody);
      expect(mockedController.createPaymentIntent).toHaveBeenCalled();
    });
  });
  
  describe('POST /api/payments/process', () => {
    it('should call controller.processPayment and return response', async () => {
      // Arrange
      const requestBody = {
        paymentIntentId: 'pi_123456789',
        paymentMethodId: 'pm_987654321'
      };
      
      const responseBody = {
        success: true,
        payment: {
          paymentIntentId: 'pi_123456789',
          status: PaymentStatus.COMPLETED,
          amount: 150.00,
          currency: 'USD',
          metadata: { bookingId: 'booking-123' },
          processedAt: new Date().toISOString()
        }
      };
      
      // Mock implementation of controller methods
      mockedController.processPayment.mockImplementation((req, res) => {
        res.status(200).json(responseBody);
        return Promise.resolve();
      });
      
      // Act
      const response = await request(app)
        .post('/api/payments/process')
        .send(requestBody);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(responseBody);
      expect(mockedController.processPayment).toHaveBeenCalled();
    });
  });
  
  describe('GET /api/payments/intent/:paymentIntentId', () => {
    it('should call controller.getPaymentIntent and return response', async () => {
      // Arrange
      const paymentIntentId = 'pi_123456789';
      
      const responseBody = {
        success: true,
        paymentIntent: {
          id: paymentIntentId,
          clientSecret: 'pi_123456789_secret_987654321',
          amount: 150.00,
          currency: 'USD',
          status: PaymentStatus.PENDING
        }
      };
      
      // Mock implementation of controller methods
      mockedController.getPaymentIntent.mockImplementation((req, res) => {
        res.status(200).json(responseBody);
        return Promise.resolve();
      });
      
      // Act
      const response = await request(app)
        .get(`/api/payments/intent/${paymentIntentId}`);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(responseBody);
      expect(mockedController.getPaymentIntent).toHaveBeenCalled();
    });
  });
  
  describe('POST /api/payments/intent/:paymentIntentId/cancel', () => {
    it('should call controller.cancelPayment and return response', async () => {
      // Arrange
      const paymentIntentId = 'pi_123456789';
      
      const responseBody = {
        success: true,
        payment: {
          paymentIntentId,
          status: PaymentStatus.CANCELLED,
          amount: 150.00,
          currency: 'USD',
          metadata: { bookingId: 'booking-123' },
          processedAt: new Date().toISOString()
        }
      };
      
      // Mock implementation of controller methods
      mockedController.cancelPayment.mockImplementation((req, res) => {
        res.status(200).json(responseBody);
        return Promise.resolve();
      });
      
      // Act
      const response = await request(app)
        .post(`/api/payments/intent/${paymentIntentId}/cancel`);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(responseBody);
      expect(mockedController.cancelPayment).toHaveBeenCalled();
    });
  });
  
  describe('POST /api/payments/webhook', () => {
    it('should call controller.processWebhook and return response', async () => {
      // Arrange
      const requestBody = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123456789',
            status: 'succeeded'
          }
        }
      };
      
      const responseBody = {
        success: true,
        received: true
      };
      
      // Mock implementation of controller methods
      mockedController.processWebhook.mockImplementation((req, res) => {
        res.status(200).json(responseBody);
        return Promise.resolve();
      });
      
      // Act
      const response = await request(app)
        .post('/api/payments/webhook')
        .send(requestBody)
        .set('Stripe-Signature', 'test_signature');
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(responseBody);
      expect(mockedController.processWebhook).toHaveBeenCalled();
    });
  });
});