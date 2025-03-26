/**
 * Authentication Middleware
 *
 * This middleware verifies Firebase authentication tokens
 * and attaches the user information to the request.
 */
import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../firebase-admin';

/**
 * Middleware to verify authentication tokens
 * Adds user information to the request if authentication is successful
 */
export const verifyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    // If no auth header is present, return unauthorized
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    
    // Extract the token
    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
    }
    
    try {
      // Verify the token with Firebase Admin
      const decodedToken = await adminAuth.verifyIdToken(token);
      
      // Attach the user info to the request
      (req as any).user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        role: decodedToken.role || 'user'
      };
      
      // Continue to the next middleware/route handler
      next();
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Server error during authentication' });
  }
};

/**
 * Optional auth middleware - attaches user if token is valid but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    // If no auth header is present, continue without user info
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    // Extract the token
    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return next();
    }
    
    try {
      // Verify the token with Firebase Admin
      const decodedToken = await adminAuth.verifyIdToken(token);
      
      // Attach the user info to the request
      (req as any).user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        role: decodedToken.role || 'user'
      };
    } catch (tokenError) {
      // Continue without user info if token is invalid
      console.warn('Invalid token provided, continuing as guest:', tokenError.message);
    }
    
    // Continue to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    // Continue without auth in case of error
    next();
  }
};