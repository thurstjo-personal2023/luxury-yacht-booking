
import { User } from '../entities/user';
import { TokenClaims } from '../valueObjects/tokenClaims';

export interface IAuthService {
  verifyToken(token: string): Promise<boolean>;
  validateTokenFormat(token: string): boolean;
  getTokenClaims(token: string): Promise<TokenClaims>;
  refreshToken(): Promise<string>;
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
  hasRole(role: string): boolean;
}
