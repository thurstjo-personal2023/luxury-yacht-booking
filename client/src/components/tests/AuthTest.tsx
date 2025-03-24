import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from '../../services/auth/auth-service';
import { useToast } from '@/hooks/use-toast';
import { User as FirebaseUser } from 'firebase/auth';

export function AuthTest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const { toast } = useToast();
  
  // Check current auth state on component mount
  React.useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    // Set up auth state listener
    const unsubscribe = authService.onAuthStateChanged((user: FirebaseUser | null) => {
      console.log('AuthTest: Auth state changed:', user ? `User: ${user.email}` : 'No user');
      setUser(user);
    });
    
    return () => unsubscribe();
  }, []);
  
  const handleLogin = async () => {
    try {
      setLoading(true);
      const result = await authService.signIn(email, password);
      console.log('Login successful:', result.user.email);
      toast({
        title: 'Login successful',
        description: `Logged in as ${result.user.email}`,
      });
      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('Login failed:', error.message);
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      setLoading(true);
      await authService.signOut();
      console.log('Logout successful');
      toast({
        title: 'Logout successful',
        description: 'You have been logged out',
      });
    } catch (error: any) {
      console.error('Logout failed:', error.message);
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Authentication Test</CardTitle>
        <CardDescription>
          Test the centralized authentication service
        </CardDescription>
      </CardHeader>
      <CardContent>
        {user ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="font-medium text-green-800">Signed in as:</p>
              <p className="text-sm mt-1">{user.email}</p>
              <p className="text-xs mt-2">User ID: {user.uid}</p>
              {user.emailVerified && <p className="text-xs mt-1 text-green-600">✓ Email verified</p>}
            </div>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleLogout}
              disabled={loading}
            >
              {loading ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleLogin}
              disabled={loading || !email || !password}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4 text-xs text-gray-500">
        <div>Using centralized auth service</div>
        <div>Auth state: {user ? 'Authenticated' : 'Not authenticated'}</div>
      </CardFooter>
    </Card>
  );
}