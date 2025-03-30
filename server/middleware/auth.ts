
import { Request, Response, NextFunction } from 'express';
import { FirebaseAuthService } from '../../adapters/auth/FirebaseAuthService';
import { adminAuth, adminDb } from '../firebase-admin';

const authService = new FirebaseAuthService();

export const verifyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: "Unauthorized",
        details: "Missing Authorization header",
        path: req.path,
        method: req.method
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: "Unauthorized", 
        details: "Invalid Authorization format",
        path: req.path,
        method: req.method
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!authService.validateTokenFormat(token)) {
      return res.status(401).json({
        error: "Unauthorized",
        details: "Invalid token format",
        path: req.path,
        method: req.method
      });
    }

    try {
      const isValid = await authService.verifyToken(token);
      if (!isValid) {
        throw new Error('Invalid token');
      }

      const claims = await authService.getTokenClaims(token);
      
      // Store user info in request
      req.user = {
        uid: claims.uid,
        role: claims.role
      };

      // Role synchronization check
      if (!req.path.includes('/api/user/sync-auth-claims')) {
        const userDoc = await adminDb.collection('harmonized_users').doc(claims.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const firestoreRole = userData?.role;
          
          if (firestoreRole && firestoreRole !== claims.role) {
            await adminAuth.setCustomUserClaims(claims.uid, { role: firestoreRole });
            req.user.role = firestoreRole;
            req.user._roleSynchronized = true;
          }
        }
      }

      next();
    } catch (error: any) {
      return res.status(401).json({
        error: "Unauthorized",
        details: error.message,
        path: req.path,
        method: req.method
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      error: "Server Error",
      details: "Error processing authentication",
      path: req.path,
      method: req.method
    });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token || !authService.validateTokenFormat(token)) {
      return next();
    }

    try {
      const claims = await authService.getTokenClaims(token);
      req.user = {
        uid: claims.uid,
        role: claims.role
      };
    } catch (error) {
      // Continue without user info if token is invalid
      console.warn('Invalid token in optional auth, continuing as guest');
    }
    
    next();
  } catch (error) {
    // Continue without auth in case of error
    next();
  }
};
