
import { IAuthService } from '../../core/domain/interfaces/IAuthService';
import { TokenClaims } from '../../core/domain/valueObjects/tokenClaims';
import { User } from '../../core/domain/entities/user';
import { adminAuth } from '../../server/firebase-admin';

export class FirebaseAuthService implements IAuthService {
  private currentUser: User | null = null;

  async verifyToken(token: string): Promise<boolean> {
    try {
      await adminAuth.verifyIdToken(token);
      return true;
    } catch {
      return false;
    }
  }

  validateTokenFormat(token: string): boolean {
    const tokenRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
    return tokenRegex.test(token);
  }

  async getTokenClaims(token: string): Promise<TokenClaims> {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      role: decodedToken.role || 'consumer',
      exp: decodedToken.exp
    };
  }

  async refreshToken(): Promise<string> {
    if (!this.currentUser) {
      throw new Error('No authenticated user');
    }
    const user = await adminAuth.getUser(this.currentUser.uid);
    const token = await adminAuth.createCustomToken(user.uid);
    return token;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }
}
